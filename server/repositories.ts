import type { DatabaseSync } from 'node:sqlite';
import { PRICING, WAITLIST_CONFIG } from '../shared/constants';
import { redactSensitiveData } from '../shared/policyEngine';
import {
  buildActiveTrialEntitlement,
  buildSeededDemoBundle,
  buildSeededPersonalWorkspace,
} from '../shared/seedData';
import type {
  ApprovalRequest,
  Artifact,
  AuditEvent,
  BrainNode,
  BusinessWorkspace,
  ClientWorkspace,
  Coworker,
  Entitlement,
  Integration,
  InvoiceRecord,
  Membership,
  NotificationItem,
  Organization,
  PersonalWorkspace,
  Role,
  Space,
  SpacePage,
  Task,
  TaskEvent,
  TaskStatus,
  ThemeId,
  UsageRecord,
  User,
  WaitlistEntry,
  WaitlistStatus,
  WaitlistTrackerSummary,
} from '../shared/types';
import {
  createSessionToken,
  encryptSecret,
  generateId,
  hashPassword,
  hashToken,
  sha256Hex,
  verifyPassword,
} from './crypto';
import type { NormalizedWebhookEvent } from './paymentAdapter';

// ==============================================================================
// Tenant-Isolated Repository Layer
// Every business query explicitly scopes by organization_id.
// Every personal query explicitly scopes by user_id with zero business crossover.
// ==============================================================================

type Row = Record<string, unknown>;

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class Repositories {
  constructor(private readonly db: DatabaseSync) {}

  // ----------------------------------------------------------------------------
  // 1. Users, Auth & Sessions
  // ----------------------------------------------------------------------------
  createUserWithAccount(params: {
    email: string;
    name: string;
    password: string;
    organizationName?: string;
    seedDemo?: boolean;
  }): { user: User; organization: Organization; membership: Membership; businessWorkspace: BusinessWorkspace; entitlement: Entitlement } {
    const email = params.email.trim().toLowerCase();
    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const now = new Date().toISOString();
    const userId = generateId('usr');
    const orgId = generateId('org');
    const wsId = generateId('bws');
    const memId = generateId('mem');
    const entId = generateId('ent');
    const orgName = params.organizationName?.trim() || `${params.name.trim()}'s Workspace`;
    const slug = `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}-${orgId.slice(-5)}`;

    this.db
      .prepare('INSERT INTO users (id, email, name, password_hash, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, email, params.name.trim(), hashPassword(params.password), '#38bdf8', now);

    const defaultSso = {
      provider: 'NONE',
      scimEnabled: false,
      status: 'INTERFACE_READY_UNCONFIGURED',
    };

    this.db
      .prepare(
        'INSERT INTO organizations (id, name, slug, retention_days, deployment_mode, sso_config_json, blocked_tools_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(orgId, orgName, slug, 90, 'CLOUD', JSON.stringify(defaultSso), JSON.stringify(['data_delete']), now);

    this.db
      .prepare('INSERT INTO memberships (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(memId, orgId, userId, 'OWNER', now);

    this.db
      .prepare(
        'INSERT INTO business_workspaces (id, organization_id, name, active_theme, onboarding_completed, safe_defaults_enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(wsId, orgId, `${orgName} — SEO OS Desk`, 'cosmos', 0, 1, now);

    // IMPORTANT: Business entitlement starts INACTIVE until a verified server-side payment webhook arrives!
    this.db
      .prepare(
        `INSERT INTO entitlements
          (id, organization_id, plan_code, status, setup_fee_cents, monthly_amount_cents, included_months, setup_paid_at, included_period_ends_at, next_billing_at, cancelled_at)
         VALUES (?, ?, 'BUSINESS_WORKSPACE', 'INACTIVE', ?, ?, ?, NULL, NULL, NULL, NULL)`
      )
      .run(entId, orgId, PRICING.setupFeeCents, PRICING.monthlySubscriptionCents, PRICING.includedTrialMonths);

    // Create strictly isolated Personal Workspace (always free to try!)
    const personal = buildSeededPersonalWorkspace(userId);
    this.db
      .prepare('INSERT INTO personal_workspaces (id, user_id, data_json, updated_at) VALUES (?, ?, ?, ?)')
      .run(personal.id, userId, JSON.stringify(personal), now);

    if (params.seedDemo !== false) {
      this.seedDemoDataForOrg(orgId, userId, params.name.trim());
    }

    return {
      user: { id: userId, email, name: params.name.trim(), avatarColor: '#38bdf8', createdAt: now },
      organization: this.getOrganizationById(orgId)!,
      membership: this.getMembership(orgId, userId)!,
      businessWorkspace: this.getBusinessWorkspace(orgId)!,
      entitlement: this.getEntitlement(orgId)!,
    };
  }

  authenticateUser(email: string, password: string): User | null {
    const row = this.db
      .prepare('SELECT id, email, name, password_hash, avatar_color, created_at FROM users WHERE email = ?')
      .get(email.trim().toLowerCase()) as Row | undefined;
    if (!row) return null;
    if (!verifyPassword(password, String(row.password_hash))) return null;
    return {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      avatarColor: String(row.avatar_color),
      createdAt: String(row.created_at),
    };
  }

  createSession(userId: string, activeOrganizationId: string | null): string {
    const { rawToken, tokenHash } = createSessionToken();
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.db
      .prepare(
        'INSERT INTO sessions (token_hash, user_id, active_organization_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(tokenHash, userId, activeOrganizationId, expires.toISOString(), now.toISOString());
    return rawToken;
  }

  getSessionContext(rawToken: string): {
    user: User;
    organization: Organization | null;
    membership: Membership | null;
    businessWorkspace: BusinessWorkspace | null;
    entitlement: Entitlement | null;
  } | null {
    const tokenHash = hashToken(rawToken);
    const sRow = this.db
      .prepare('SELECT user_id, active_organization_id, expires_at FROM sessions WHERE token_hash = ?')
      .get(tokenHash) as Row | undefined;
    if (!sRow) return null;
    if (new Date(String(sRow.expires_at)).getTime() < Date.now()) {
      this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      return null;
    }

    const userId = String(sRow.user_id);
    const user = this.getUserById(userId);
    if (!user) return null;

    let orgId = sRow.active_organization_id ? String(sRow.active_organization_id) : null;
    if (!orgId) {
      const mRow = this.db
        .prepare('SELECT organization_id FROM memberships WHERE user_id = ? LIMIT 1')
        .get(userId) as Row | undefined;
      orgId = mRow ? String(mRow.organization_id) : null;
    }

    const organization = orgId ? this.getOrganizationById(orgId) : null;
    const membership = orgId ? this.getMembership(orgId, userId) : null;
    const businessWorkspace = orgId ? this.getBusinessWorkspace(orgId) : null;
    const entitlement = orgId ? this.getEntitlement(orgId) : null;

    return { user, organization, membership, businessWorkspace, entitlement };
  }

  deleteSession(rawToken: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(rawToken));
  }

  getUserById(userId: string): User | null {
    const row = this.db
      .prepare('SELECT id, email, name, avatar_color, created_at FROM users WHERE id = ?')
      .get(userId) as Row | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      avatarColor: String(row.avatar_color),
      createdAt: String(row.created_at),
    };
  }

  // ----------------------------------------------------------------------------
  // 2. Organizations, Memberships, Business Workspace & Entitlements
  // ----------------------------------------------------------------------------
  getOrganizationById(orgId: string): Organization | null {
    const row = this.db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId) as Row | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      retentionDays: Number(row.retention_days),
      deploymentMode: String(row.deployment_mode) as Organization['deploymentMode'],
      ssoConfig: safeJsonParse(row.sso_config_json, {
        provider: 'NONE',
        scimEnabled: false,
        status: 'INTERFACE_READY_UNCONFIGURED',
      }),
      createdAt: String(row.created_at),
    };
  }

  getOrgBlockedTools(orgId: string): string[] {
    const row = this.db.prepare('SELECT blocked_tools_json FROM organizations WHERE id = ?').get(orgId) as Row | undefined;
    return safeJsonParse<string[]>(row?.blocked_tools_json, []);
  }

  updateOrganizationSettings(
    orgId: string,
    patch: {
      name?: string;
      retentionDays?: number;
      deploymentMode?: Organization['deploymentMode'];
      blockedTools?: string[];
      ssoConfig?: Organization['ssoConfig'];
    }
  ): Organization {
    const current = this.getOrganizationById(orgId);
    if (!current) throw new Error('Organization not found');
    const blockedTools = patch.blockedTools ?? this.getOrgBlockedTools(orgId);
    this.db
      .prepare(
        `UPDATE organizations
         SET name = ?, retention_days = ?, deployment_mode = ?, sso_config_json = ?, blocked_tools_json = ?
         WHERE id = ?`
      )
      .run(
        patch.name ?? current.name,
        patch.retentionDays ?? current.retentionDays,
        patch.deploymentMode ?? current.deploymentMode,
        JSON.stringify(patch.ssoConfig ?? current.ssoConfig),
        JSON.stringify(blockedTools),
        orgId
      );
    return this.getOrganizationById(orgId)!;
  }

  getMembership(orgId: string, userId: string): Membership | null {
    const row = this.db
      .prepare(
        `SELECT m.*, u.name as user_name, u.email as user_email
         FROM memberships m JOIN users u ON u.id = m.user_id
         WHERE m.organization_id = ? AND m.user_id = ?`
      )
      .get(orgId, userId) as Row | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      organizationId: String(row.organization_id),
      userId: String(row.user_id),
      userName: String(row.user_name),
      userEmail: String(row.user_email),
      role: String(row.role) as Role,
      createdAt: String(row.created_at),
    };
  }

  listMemberships(orgId: string): Membership[] {
    const rows = this.db
      .prepare(
        `SELECT m.*, u.name as user_name, u.email as user_email
         FROM memberships m JOIN users u ON u.id = m.user_id
         WHERE m.organization_id = ? ORDER BY m.created_at ASC`
      )
      .all(orgId) as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      organizationId: String(row.organization_id),
      userId: String(row.user_id),
      userName: String(row.user_name),
      userEmail: String(row.user_email),
      role: String(row.role) as Role,
      createdAt: String(row.created_at),
    }));
  }

  addMemberToOrg(orgId: string, userId: string, role: Role): Membership {
    const id = generateId('mem');
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO memberships (id, organization_id, user_id, role, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(organization_id, user_id) DO UPDATE SET role = excluded.role`
      )
      .run(id, orgId, userId, role, now);
    return this.getMembership(orgId, userId)!;
  }

  getBusinessWorkspace(orgId: string): BusinessWorkspace | null {
    const row = this.db
      .prepare('SELECT * FROM business_workspaces WHERE organization_id = ?')
      .get(orgId) as Row | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      organizationId: String(row.organization_id),
      name: String(row.name),
      activeTheme: String(row.active_theme) as ThemeId,
      onboardingCompleted: Boolean(row.onboarding_completed),
      safeDefaultsEnabled: Boolean(row.safe_defaults_enabled),
      createdAt: String(row.created_at),
    };
  }

  updateBusinessWorkspace(
    orgId: string,
    patch: { name?: string; activeTheme?: ThemeId; onboardingCompleted?: boolean; safeDefaultsEnabled?: boolean }
  ): BusinessWorkspace {
    const cur = this.getBusinessWorkspace(orgId);
    if (!cur) throw new Error('Business workspace not found');
    this.db
      .prepare(
        `UPDATE business_workspaces
         SET name = ?, active_theme = ?, onboarding_completed = ?, safe_defaults_enabled = ?
         WHERE organization_id = ?`
      )
      .run(
        patch.name ?? cur.name,
        patch.activeTheme ?? cur.activeTheme,
        patch.onboardingCompleted !== undefined ? (patch.onboardingCompleted ? 1 : 0) : cur.onboardingCompleted ? 1 : 0,
        patch.safeDefaultsEnabled !== undefined ? (patch.safeDefaultsEnabled ? 1 : 0) : cur.safeDefaultsEnabled ? 1 : 0,
        orgId
      );
    return this.getBusinessWorkspace(orgId)!;
  }

  getEntitlement(orgId: string): Entitlement | null {
    const row = this.db.prepare('SELECT * FROM entitlements WHERE organization_id = ?').get(orgId) as Row | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      organizationId: String(row.organization_id),
      planCode: 'BUSINESS_WORKSPACE',
      status: String(row.status) as Entitlement['status'],
      setupFeeCents: Number(row.setup_fee_cents),
      monthlyAmountCents: Number(row.monthly_amount_cents),
      includedMonths: Number(row.included_months),
      setupPaidAt: row.setup_paid_at ? String(row.setup_paid_at) : null,
      includedPeriodEndsAt: row.included_period_ends_at ? String(row.included_period_ends_at) : null,
      nextBillingAt: row.next_billing_at ? String(row.next_billing_at) : null,
      cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    };
  }

  // ----------------------------------------------------------------------------
  // 3. Checkout Sessions, Signed Idempotent Webhooks & Invoices
  // ----------------------------------------------------------------------------
  recordCheckoutSession(params: {
    organizationId: string;
    userId: string;
    provider: string;
    providerSessionId: string;
    amountCents: number;
  }): { id: string; providerSessionId: string } {
    const id = generateId('chk');
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO checkout_sessions (id, organization_id, user_id, provider, provider_session_id, amount_cents, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)`
      )
      .run(id, params.organizationId, params.userId, params.provider, params.providerSessionId, params.amountCents, now);
    return { id, providerSessionId: params.providerSessionId };
  }

  /**
   * Idempotent server-side webhook processor.
   * Deduplicates by event_id so duplicate deliveries never double-bill or mutate state twice.
   */
  processVerifiedPaymentWebhook(event: NormalizedWebhookEvent, rawPayload: string): {
    duplicate: boolean;
    entitlement: Entitlement | null;
  } {
    const existing = this.db
      .prepare('SELECT event_id FROM webhook_events WHERE event_id = ?')
      .get(event.eventId);
    if (existing) {
      return { duplicate: true, entitlement: this.getEntitlement(event.organizationId) };
    }

    const now = event.occurredAt || new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO webhook_events (event_id, provider, event_type, payload_hash, processed_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(event.eventId, event.provider, event.type, sha256Hex(rawPayload), now);

    if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
      const { entitlement, invoices } = buildActiveTrialEntitlement(event.organizationId, now);

      this.db
        .prepare(
          `UPDATE entitlements
           SET status = ?, setup_paid_at = ?, included_period_ends_at = ?, next_billing_at = ?, cancelled_at = NULL
           WHERE organization_id = ?`
        )
        .run(
          entitlement.status,
          entitlement.setupPaidAt,
          entitlement.includedPeriodEndsAt,
          entitlement.nextBillingAt,
          event.organizationId
        );

      if (event.providerSessionId) {
        this.db
          .prepare(`UPDATE checkout_sessions SET status = 'COMPLETED', completed_at = ? WHERE provider_session_id = ?`)
          .run(now, event.providerSessionId);
      }

      this.db
        .prepare(
          `INSERT INTO subscriptions (id, organization_id, provider, provider_subscription_id, status, trial_end_at, current_period_end_at, monthly_amount_cents, created_at)
           VALUES (?, ?, ?, ?, 'trialing', ?, ?, ?, ?)
           ON CONFLICT(organization_id) DO UPDATE SET status = 'trialing', trial_end_at = excluded.trial_end_at`
        )
        .run(
          generateId('sub'),
          event.organizationId,
          event.provider,
          event.providerSubscriptionId || generateId('sub_test'),
          entitlement.includedPeriodEndsAt,
          entitlement.nextBillingAt,
          PRICING.monthlySubscriptionCents,
          now
        );

      for (const inv of invoices) {
        this.db
          .prepare(
            `INSERT INTO invoices (id, organization_id, provider_invoice_id, description, amount_cents, status, issued_at, due_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            generateId('inv'),
            event.organizationId,
            inv.providerInvoiceId,
            inv.description,
            inv.amountCents,
            inv.status,
            inv.issuedAt,
            inv.dueAt
          );
      }

      this.recordAuditEvent({
        organizationId: event.organizationId,
        userId: 'system_webhook',
        actorType: 'WEBHOOK',
        actorName: `Payment Webhook (${event.provider})`,
        coworkerId: null,
        action: 'BUSINESS_ENTITLEMENT_PROVISIONED',
        toolName: null,
        redactedInput: { eventId: event.eventId, eventType: event.type, amountCents: event.amountCents },
        redactedOutput: {
          status: 'TRIAL_INCLUDED',
          includedPeriodEndsAt: entitlement.includedPeriodEndsAt,
          ongoingMonthlyCents: PRICING.monthlySubscriptionCents,
        },
        approvalId: null,
        outcome: 'SUCCESS',
      });
    } else if (event.type === 'invoice.payment_failed') {
      this.db
        .prepare(`UPDATE entitlements SET status = 'PAST_DUE' WHERE organization_id = ?`)
        .run(event.organizationId);
      if (event.providerSessionId) {
        this.db
          .prepare(`UPDATE checkout_sessions SET status = 'FAILED' WHERE provider_session_id = ?`)
          .run(event.providerSessionId);
      }
      this.db
        .prepare(
          `INSERT INTO invoices (id, organization_id, provider_invoice_id, description, amount_cents, status, issued_at, due_at)
           VALUES (?, ?, ?, ?, ?, 'FAILED', ?, ?)`
        )
        .run(
          generateId('inv'),
          event.organizationId,
          generateId('in_failed'),
          'Payment Attempt Failed — Action Required',
          event.amountCents,
          now,
          now
        );

      this.recordAuditEvent({
        organizationId: event.organizationId,
        userId: 'system_webhook',
        actorType: 'WEBHOOK',
        actorName: `Payment Webhook (${event.provider})`,
        coworkerId: null,
        action: 'PAYMENT_FAILED_ENTITLEMENT_LOCKED',
        toolName: null,
        redactedInput: { eventId: event.eventId },
        redactedOutput: { status: 'PAST_DUE' },
        approvalId: null,
        outcome: 'FAILED',
      });
    } else if (event.type === 'customer.subscription.deleted') {
      this.db
        .prepare(`UPDATE entitlements SET status = 'CANCELLED', cancelled_at = ? WHERE organization_id = ?`)
        .run(now, event.organizationId);
      this.recordAuditEvent({
        organizationId: event.organizationId,
        userId: 'system_webhook',
        actorType: 'WEBHOOK',
        actorName: `Payment Webhook (${event.provider})`,
        coworkerId: null,
        action: 'SUBSCRIPTION_CANCELLED',
        toolName: null,
        redactedInput: { eventId: event.eventId },
        redactedOutput: { status: 'CANCELLED' },
        approvalId: null,
        outcome: 'SUCCESS',
      });
    }

    return { duplicate: false, entitlement: this.getEntitlement(event.organizationId) };
  }

  listInvoices(orgId: string): InvoiceRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM invoices WHERE organization_id = ? ORDER BY issued_at DESC')
      .all(orgId) as Row[];
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      providerInvoiceId: String(r.provider_invoice_id),
      description: String(r.description),
      amountCents: Number(r.amount_cents),
      status: String(r.status) as InvoiceRecord['status'],
      issuedAt: String(r.issued_at),
      dueAt: String(r.due_at),
    }));
  }

  // ----------------------------------------------------------------------------
  // 4. Seed Demo Data (Clearly Labeled)
  // ----------------------------------------------------------------------------
  seedDemoDataForOrg(orgId: string, userId: string, userName: string): void {
    const bundle = buildSeededDemoBundle(orgId, userId, userName);

    this.db
      .prepare(
        'INSERT OR IGNORE INTO clients (id, organization_id, name, domain, industry, goals_json, data_mode, is_demo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        bundle.client.id,
        orgId,
        bundle.client.name,
        bundle.client.domain,
        bundle.client.industry,
        JSON.stringify(bundle.client.goals),
        bundle.client.dataMode,
        1,
        bundle.client.createdAt
      );

    for (const cw of bundle.coworkers) {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO coworkers
            (id, organization_id, client_id, kind, desk_key, name, role, avatar_emoji, accent_color, instructions, allowed_tools_json, approval_policy, schedule_cron, default_space_id, status, is_demo, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          cw.id,
          orgId,
          cw.clientId,
          cw.kind,
          cw.deskKey,
          cw.name,
          cw.role,
          cw.avatarEmoji,
          cw.accentColor,
          cw.instructions,
          JSON.stringify(cw.allowedTools),
          cw.approvalPolicy,
          cw.scheduleCron,
          cw.defaultSpaceId,
          cw.status,
          1,
          cw.createdAt
        );
    }

    for (const task of bundle.tasks) {
      this.insertTask(task);
    }

    for (const node of bundle.brainNodes) {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO brain_nodes
            (id, organization_id, client_id, label, category, summary, x, y, z, connections_json, claims_json, is_demo, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          node.id,
          orgId,
          node.clientId,
          node.label,
          node.category,
          node.summary,
          node.x,
          node.y,
          node.z,
          JSON.stringify(node.connections),
          JSON.stringify(node.claims),
          1,
          node.updatedAt
        );
    }

    for (const art of bundle.artifacts) {
      this.insertArtifact(art);
    }

    for (const sp of bundle.spaces) {
      this.db
        .prepare(
          'INSERT OR IGNORE INTO spaces (id, organization_id, client_id, name, description, icon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(sp.id, orgId, sp.clientId, sp.name, sp.description, sp.icon, sp.createdAt);
    }

    for (const pg of bundle.pages) {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO pages
            (id, organization_id, space_id, parent_page_id, title, content, version, updated_by, revisions_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          pg.id,
          orgId,
          pg.spaceId,
          pg.parentPageId,
          pg.title,
          pg.content,
          pg.version,
          pg.updatedBy,
          JSON.stringify(pg.revisions),
          pg.updatedAt
        );
    }

    for (const integ of bundle.integrations) {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO integrations
            (id, organization_id, provider_key, name, category, status, mode, encrypted_credential, credential_label, allowed_scopes_json, enabled_coworker_ids_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`
        )
        .run(
          integ.id,
          orgId,
          integ.providerKey,
          integ.name,
          integ.category,
          integ.status,
          integ.mode,
          integ.credentialLabel,
          JSON.stringify(integ.allowedScopes),
          JSON.stringify(integ.enabledCoworkerIds),
          integ.updatedAt
        );
    }

    for (const appr of bundle.approvals) {
      this.insertApprovalRequest(appr);
    }

    for (const ev of bundle.auditEvents) {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO audit_events
            (id, organization_id, user_id, actor_type, actor_name, coworker_id, action, tool_name, redacted_input_json, redacted_output_json, approval_id, outcome, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          ev.id,
          orgId,
          ev.userId,
          ev.actorType,
          ev.actorName,
          ev.coworkerId,
          ev.action,
          ev.toolName,
          JSON.stringify(ev.redactedInput),
          JSON.stringify(ev.redactedOutput),
          ev.approvalId,
          ev.outcome,
          ev.createdAt
        );
    }

    for (const u of bundle.usageRecords) {
      this.db
        .prepare(
          'INSERT OR IGNORE INTO usage_records (id, organization_id, metric, quantity, estimated_cost_usd, period_label, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(u.id, orgId, u.metric, u.quantity, u.estimatedCostUsd, u.periodLabel, u.recordedAt);
    }

    for (const n of bundle.notifications) {
      this.db
        .prepare(
          'INSERT OR IGNORE INTO notifications (id, user_id, scope, title, body, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(n.id, userId, n.scope, n.title, n.body, n.read ? 1 : 0, n.createdAt);
    }
  }

  // ----------------------------------------------------------------------------
  // 5. Clients, Coworkers, Tasks, Brain, Artifacts, Spaces, Integrations
  // ----------------------------------------------------------------------------
  listClients(orgId: string): ClientWorkspace[] {
    const rows = this.db
      .prepare('SELECT * FROM clients WHERE organization_id = ? ORDER BY created_at DESC')
      .all(orgId) as Row[];
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      name: String(r.name),
      domain: String(r.domain),
      industry: String(r.industry),
      goals: safeJsonParse<string[]>(r.goals_json, []),
      dataMode: String(r.data_mode) as ClientWorkspace['dataMode'],
      isDemo: Boolean(r.is_demo),
      createdAt: String(r.created_at),
    }));
  }

  getClient(orgId: string, clientId: string): ClientWorkspace | null {
    const r = this.db
      .prepare('SELECT * FROM clients WHERE organization_id = ? AND id = ?')
      .get(orgId, clientId) as Row | undefined;
    if (!r) return null;
    return {
      id: String(r.id),
      organizationId: String(r.organization_id),
      name: String(r.name),
      domain: String(r.domain),
      industry: String(r.industry),
      goals: safeJsonParse<string[]>(r.goals_json, []),
      dataMode: String(r.data_mode) as ClientWorkspace['dataMode'],
      isDemo: Boolean(r.is_demo),
      createdAt: String(r.created_at),
    };
  }

  createClient(
    orgId: string,
    input: { name: string; domain: string; industry: string; goals: string[] }
  ): ClientWorkspace {
    const id = generateId('cli');
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO clients (id, organization_id, name, domain, industry, goals_json, data_mode, is_demo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(id, orgId, input.name, input.domain, input.industry, JSON.stringify(input.goals), 'MOCK_DEMO', 0, now);
    return this.getClient(orgId, id)!;
  }

  listCoworkers(orgId: string): Coworker[] {
    const rows = this.db
      .prepare('SELECT * FROM coworkers WHERE organization_id = ? ORDER BY kind DESC, created_at ASC')
      .all(orgId) as Row[];
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      clientId: r.client_id ? String(r.client_id) : null,
      kind: String(r.kind) as Coworker['kind'],
      deskKey: String(r.desk_key),
      name: String(r.name),
      role: String(r.role),
      avatarEmoji: String(r.avatar_emoji),
      accentColor: String(r.accent_color),
      instructions: String(r.instructions),
      allowedTools: safeJsonParse<string[]>(r.allowed_tools_json, []),
      approvalPolicy: String(r.approval_policy) as Coworker['approvalPolicy'],
      scheduleCron: r.schedule_cron ? String(r.schedule_cron) : null,
      defaultSpaceId: r.default_space_id ? String(r.default_space_id) : null,
      status: String(r.status) as Coworker['status'],
      isDemo: Boolean(r.is_demo),
      createdAt: String(r.created_at),
    }));
  }

  getCoworker(orgId: string, coworkerId: string): Coworker | null {
    return this.listCoworkers(orgId).find((c) => c.id === coworkerId) ?? null;
  }

  createCoworker(
    orgId: string,
    input: {
      name: string;
      role: string;
      instructions: string;
      allowedTools: string[];
      approvalPolicy: Coworker['approvalPolicy'];
      scheduleCron: string | null;
      defaultSpaceId: string | null;
      clientId: string | null;
      avatarEmoji?: string;
      accentColor?: string;
    }
  ): Coworker {
    const id = generateId('cw');
    const now = new Date().toISOString();
    const deskKey = `coworker-${id.slice(-6)}`;
    this.db
      .prepare(
        `INSERT INTO coworkers
          (id, organization_id, client_id, kind, desk_key, name, role, avatar_emoji, accent_color, instructions, allowed_tools_json, approval_policy, schedule_cron, default_space_id, status, is_demo, created_at)
         VALUES (?, ?, ?, 'COWORKER', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IDLE', 0, ?)`
      )
      .run(
        id,
        orgId,
        input.clientId,
        deskKey,
        input.name,
        input.role,
        input.avatarEmoji || '🤖',
        input.accentColor || '#38bdf8',
        input.instructions,
        JSON.stringify(input.allowedTools),
        input.approvalPolicy,
        input.scheduleCron,
        input.defaultSpaceId,
        now
      );
    return this.getCoworker(orgId, id)!;
  }

  updateCoworker(
    orgId: string,
    coworkerId: string,
    patch: Partial<Pick<Coworker, 'name' | 'role' | 'instructions' | 'allowedTools' | 'approvalPolicy' | 'scheduleCron' | 'defaultSpaceId' | 'status'>>
  ): Coworker {
    const cur = this.getCoworker(orgId, coworkerId);
    if (!cur) throw new Error('Coworker not found in organization');
    this.db
      .prepare(
        `UPDATE coworkers
         SET name = ?, role = ?, instructions = ?, allowed_tools_json = ?, approval_policy = ?, schedule_cron = ?, default_space_id = ?, status = ?
         WHERE organization_id = ? AND id = ?`
      )
      .run(
        patch.name ?? cur.name,
        patch.role ?? cur.role,
        patch.instructions ?? cur.instructions,
        JSON.stringify(patch.allowedTools ?? cur.allowedTools),
        patch.approvalPolicy ?? cur.approvalPolicy,
        patch.scheduleCron !== undefined ? patch.scheduleCron : cur.scheduleCron,
        patch.defaultSpaceId !== undefined ? patch.defaultSpaceId : cur.defaultSpaceId,
        patch.status ?? cur.status,
        orgId,
        coworkerId
      );
    return this.getCoworker(orgId, coworkerId)!;
  }

  insertTask(task: Task): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO tasks
          (id, organization_id, client_id, orchestrator_run_id, coworker_id, desk_key, title, description, phase, status, status_reason, progress_pct, is_mock, depends_on_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        task.id,
        task.organizationId,
        task.clientId,
        task.orchestratorRunId,
        task.coworkerId,
        task.deskKey,
        task.title,
        task.description,
        task.phase,
        task.status,
        task.statusReason,
        task.progressPct,
        task.isMock ? 1 : 0,
        JSON.stringify(task.dependsOn),
        task.createdAt,
        task.updatedAt
      );
  }

  listTasks(orgId: string, clientId?: string): Task[] {
    const rows = clientId
      ? (this.db
          .prepare('SELECT * FROM tasks WHERE organization_id = ? AND client_id = ? ORDER BY phase ASC, created_at ASC')
          .all(orgId, clientId) as Row[])
      : (this.db
          .prepare('SELECT * FROM tasks WHERE organization_id = ? ORDER BY phase ASC, created_at ASC')
          .all(orgId) as Row[]);
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      clientId: String(r.client_id),
      orchestratorRunId: r.orchestrator_run_id ? String(r.orchestrator_run_id) : null,
      coworkerId: String(r.coworker_id),
      deskKey: String(r.desk_key),
      title: String(r.title),
      description: String(r.description),
      phase: Number(r.phase) as 1 | 2 | 3,
      status: String(r.status) as TaskStatus,
      statusReason: String(r.status_reason),
      progressPct: Number(r.progress_pct),
      isMock: Boolean(r.is_mock),
      dependsOn: safeJsonParse<string[]>(r.depends_on_json, []),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }

  getTask(orgId: string, taskId: string): Task | null {
    return this.listTasks(orgId).find((t) => t.id === taskId) ?? null;
  }

  updateTaskStatus(
    orgId: string,
    taskId: string,
    patch: { status: TaskStatus; statusReason?: string; progressPct?: number }
  ): Task {
    const cur = this.getTask(orgId, taskId);
    if (!cur) throw new Error('Task not found in organization');
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE tasks SET status = ?, status_reason = ?, progress_pct = ?, updated_at = ?
         WHERE organization_id = ? AND id = ?`
      )
      .run(
        patch.status,
        patch.statusReason ?? cur.statusReason,
        patch.progressPct ?? cur.progressPct,
        now,
        orgId,
        taskId
      );
    return this.getTask(orgId, taskId)!;
  }

  appendTaskEvent(orgId: string, taskId: string, eventType: TaskEvent['type'], message: string, payload: Record<string, unknown> = {}): void {
    this.db
      .prepare(
        'INSERT INTO task_events (id, organization_id, task_id, event_type, message, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(generateId('tev'), orgId, taskId, eventType, message, JSON.stringify(redactSensitiveData(payload)), new Date().toISOString());
  }

  listAllRunningTasksForRecovery(): Task[] {
    const rows = this.db.prepare(`SELECT * FROM tasks WHERE status = 'RUNNING'`).all() as Row[];
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      clientId: String(r.client_id),
      orchestratorRunId: r.orchestrator_run_id ? String(r.orchestrator_run_id) : null,
      coworkerId: String(r.coworker_id),
      deskKey: String(r.desk_key),
      title: String(r.title),
      description: String(r.description),
      phase: Number(r.phase) as 1 | 2 | 3,
      status: String(r.status) as TaskStatus,
      statusReason: String(r.status_reason),
      progressPct: Number(r.progress_pct),
      isMock: Boolean(r.is_mock),
      dependsOn: safeJsonParse<string[]>(r.depends_on_json, []),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }

  listBrainNodes(orgId: string, clientId?: string): BrainNode[] {
    const rows = clientId
      ? (this.db
          .prepare('SELECT * FROM brain_nodes WHERE organization_id = ? AND client_id = ? ORDER BY updated_at DESC')
          .all(orgId, clientId) as Row[])
      : (this.db
          .prepare('SELECT * FROM brain_nodes WHERE organization_id = ? ORDER BY updated_at DESC')
          .all(orgId) as Row[]);
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      clientId: String(r.client_id),
      label: String(r.label),
      category: String(r.category) as BrainNode['category'],
      summary: String(r.summary),
      x: Number(r.x),
      y: Number(r.y),
      z: Number(r.z),
      connections: safeJsonParse<string[]>(r.connections_json, []),
      claims: safeJsonParse(r.claims_json, []),
      isDemo: Boolean(r.is_demo),
      updatedAt: String(r.updated_at),
    }));
  }

  insertArtifact(art: Artifact): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO artifacts
          (id, organization_id, client_id, task_id, title, kind, format, content, confidence, provenance_json, approved, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        art.id,
        art.organizationId,
        art.clientId,
        art.taskId,
        art.title,
        art.kind,
        art.format,
        art.content,
        art.confidence,
        JSON.stringify(art.provenance),
        art.approved ? 1 : 0,
        art.createdAt
      );
  }

  listArtifacts(orgId: string, clientId?: string): Artifact[] {
    const rows = clientId
      ? (this.db
          .prepare('SELECT * FROM artifacts WHERE organization_id = ? AND client_id = ? ORDER BY created_at DESC')
          .all(orgId, clientId) as Row[])
      : (this.db
          .prepare('SELECT * FROM artifacts WHERE organization_id = ? ORDER BY created_at DESC')
          .all(orgId) as Row[]);
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      clientId: String(r.client_id),
      taskId: r.task_id ? String(r.task_id) : null,
      title: String(r.title),
      kind: String(r.kind) as Artifact['kind'],
      format: String(r.format) as Artifact['format'],
      content: String(r.content),
      confidence: Number(r.confidence),
      provenance: safeJsonParse(r.provenance_json, {
        generatedBy: 'Unknown',
        toolsUsed: [],
        sourceLinks: [],
        timestamp: String(r.created_at),
        isMock: true,
      }),
      approved: Boolean(r.approved),
      createdAt: String(r.created_at),
    }));
  }

  approveArtifact(orgId: string, artifactId: string): Artifact | null {
    this.db
      .prepare('UPDATE artifacts SET approved = 1 WHERE organization_id = ? AND id = ?')
      .run(orgId, artifactId);
    return this.listArtifacts(orgId).find((a) => a.id === artifactId) ?? null;
  }

  listSpaces(orgId: string): Space[] {
    const rows = this.db
      .prepare('SELECT * FROM spaces WHERE organization_id = ? ORDER BY created_at ASC')
      .all(orgId) as Row[];
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      clientId: r.client_id ? String(r.client_id) : null,
      name: String(r.name),
      description: String(r.description),
      icon: String(r.icon),
      createdAt: String(r.created_at),
    }));
  }

  listPages(orgId: string, spaceId?: string): SpacePage[] {
    const rows = spaceId
      ? (this.db
          .prepare('SELECT * FROM pages WHERE organization_id = ? AND space_id = ? ORDER BY updated_at DESC')
          .all(orgId, spaceId) as Row[])
      : (this.db
          .prepare('SELECT * FROM pages WHERE organization_id = ? ORDER BY updated_at DESC')
          .all(orgId) as Row[]);
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      spaceId: String(r.space_id),
      parentPageId: r.parent_page_id ? String(r.parent_page_id) : null,
      title: String(r.title),
      content: String(r.content),
      version: Number(r.version),
      updatedBy: String(r.updated_by),
      revisions: safeJsonParse(r.revisions_json, []),
      updatedAt: String(r.updated_at),
    }));
  }

  savePage(
    orgId: string,
    input: {
      pageId?: string;
      spaceId: string;
      parentPageId?: string | null;
      title: string;
      content: string;
      authorName: string;
    }
  ): SpacePage {
    const now = new Date().toISOString();
    if (input.pageId) {
      const existing = this.listPages(orgId).find((p) => p.id === input.pageId);
      if (!existing) throw new Error('Page not found in organization');
      const nextVersion = existing.version + 1;
      const nextRevisions = [
        ...existing.revisions,
        {
          id: generateId('rev'),
          pageId: existing.id,
          version: nextVersion,
          content: input.content,
          authorName: input.authorName,
          createdAt: now,
        },
      ];
      this.db
        .prepare(
          'UPDATE pages SET title = ?, content = ?, version = ?, updated_by = ?, revisions_json = ?, updated_at = ? WHERE organization_id = ? AND id = ?'
        )
        .run(input.title, input.content, nextVersion, input.authorName, JSON.stringify(nextRevisions), now, orgId, existing.id);
      return this.listPages(orgId).find((p) => p.id === existing.id)!;
    }

    const id = generateId('pg');
    const revisions = [
      {
        id: generateId('rev'),
        pageId: id,
        version: 1,
        content: input.content,
        authorName: input.authorName,
        createdAt: now,
      },
    ];
    this.db
      .prepare(
        `INSERT INTO pages (id, organization_id, space_id, parent_page_id, title, content, version, updated_by, revisions_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .run(id, orgId, input.spaceId, input.parentPageId ?? null, input.title, input.content, input.authorName, JSON.stringify(revisions), now);
    return this.listPages(orgId).find((p) => p.id === id)!;
  }

  listIntegrations(orgId: string): Integration[] {
    const rows = this.db
      .prepare('SELECT * FROM integrations WHERE organization_id = ? ORDER BY name ASC')
      .all(orgId) as Row[];
    // NEVER return encrypted_credential or raw secret to the browser
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      providerKey: String(r.provider_key),
      name: String(r.name),
      category: String(r.category) as Integration['category'],
      status: String(r.status) as Integration['status'],
      mode: String(r.mode) as Integration['mode'],
      credentialConfigured: Boolean(r.encrypted_credential),
      credentialLabel: r.credential_label ? String(r.credential_label) : null,
      allowedScopes: safeJsonParse<string[]>(r.allowed_scopes_json, []),
      enabledCoworkerIds: safeJsonParse<string[]>(r.enabled_coworker_ids_json, []),
      updatedAt: String(r.updated_at),
    }));
  }

  configureIntegrationSecret(
    orgId: string,
    integrationId: string,
    params: { secretValue?: string; label?: string; enabledCoworkerIds?: string[] }
  ): Integration {
    const cur = this.listIntegrations(orgId).find((i) => i.id === integrationId);
    if (!cur) throw new Error('Integration not found in organization');
    const now = new Date().toISOString();
    const encrypted = params.secretValue ? encryptSecret(params.secretValue) : null;
    if (encrypted) {
      this.db
        .prepare(
          `UPDATE integrations
           SET encrypted_credential = ?, credential_label = ?, status = 'CONNECTED', mode = 'LIVE_CONNECTED', enabled_coworker_ids_json = ?, updated_at = ?
           WHERE organization_id = ? AND id = ?`
        )
        .run(
          encrypted,
          params.label || 'Encrypted Server-Only Credential (AES-256-GCM)',
          JSON.stringify(params.enabledCoworkerIds ?? cur.enabledCoworkerIds),
          now,
          orgId,
          integrationId
        );
    } else if (params.enabledCoworkerIds) {
      this.db
        .prepare('UPDATE integrations SET enabled_coworker_ids_json = ?, updated_at = ? WHERE organization_id = ? AND id = ?')
        .run(JSON.stringify(params.enabledCoworkerIds), now, orgId, integrationId);
    }
    return this.listIntegrations(orgId).find((i) => i.id === integrationId)!;
  }

  // ----------------------------------------------------------------------------
  // 6. Approvals, Audit Events, Usage & Notifications
  // ----------------------------------------------------------------------------
  insertApprovalRequest(req: ApprovalRequest): ApprovalRequest {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO approval_requests
          (id, organization_id, user_id, scope, task_id, coworker_id, coworker_name, tool_name, risk_level, summary, redacted_payload_json, status, decided_by, decision_note, created_at, decided_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.id,
        req.organizationId,
        req.userId,
        req.scope,
        req.taskId,
        req.coworkerId,
        req.coworkerName,
        req.toolName,
        req.riskLevel,
        req.summary,
        JSON.stringify(redactSensitiveData(req.redactedPayload)),
        req.status,
        req.decidedBy,
        req.decisionNote,
        req.createdAt,
        req.decidedAt
      );
    return req;
  }

  listBusinessApprovals(orgId: string): ApprovalRequest[] {
    const rows = this.db
      .prepare(`SELECT * FROM approval_requests WHERE organization_id = ? AND scope = 'BUSINESS' ORDER BY created_at DESC`)
      .all(orgId) as Row[];
    return rows.map((r) => this.mapApprovalRow(r));
  }

  listPersonalApprovals(userId: string): ApprovalRequest[] {
    const rows = this.db
      .prepare(`SELECT * FROM approval_requests WHERE user_id = ? AND scope = 'PERSONAL' ORDER BY created_at DESC`)
      .all(userId) as Row[];
    return rows.map((r) => this.mapApprovalRow(r));
  }

  decideApproval(params: {
    approvalId: string;
    organizationId: string | null;
    userId: string;
    scope: 'BUSINESS' | 'PERSONAL';
    decision: 'APPROVED' | 'REJECTED';
    decidedBy: string;
    note?: string;
  }): ApprovalRequest {
    const row =
      params.scope === 'BUSINESS'
        ? (this.db
            .prepare(`SELECT * FROM approval_requests WHERE id = ? AND organization_id = ? AND scope = 'BUSINESS'`)
            .get(params.approvalId, params.organizationId) as Row | undefined)
        : (this.db
            .prepare(`SELECT * FROM approval_requests WHERE id = ? AND user_id = ? AND scope = 'PERSONAL'`)
            .get(params.approvalId, params.userId) as Row | undefined);

    if (!row) throw new Error('Approval request not found');
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE approval_requests SET status = ?, decided_by = ?, decision_note = ?, decided_at = ? WHERE id = ?')
      .run(params.decision, params.decidedBy, params.note ?? null, now, params.approvalId);

    const updated = this.mapApprovalRow(
      this.db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(params.approvalId) as Row
    );

    // If tied to a business task in REVIEW, transition appropriately
    if (params.scope === 'BUSINESS' && params.organizationId && updated.taskId) {
      const task = this.getTask(params.organizationId, updated.taskId);
      if (task && task.status === 'REVIEW') {
        this.updateTaskStatus(params.organizationId, task.id, {
          status: params.decision === 'APPROVED' ? 'DONE' : 'CANCELLED',
          statusReason:
            params.decision === 'APPROVED'
              ? `Approved by ${params.decidedBy}. Draft saved with audit receipt.`
              : `Rejected by ${params.decidedBy}: ${params.note || 'No reason provided'}`,
          progressPct: params.decision === 'APPROVED' ? 100 : task.progressPct,
        });
      }
    }

    this.recordAuditEvent({
      organizationId: params.organizationId,
      userId: params.userId,
      actorType: 'USER',
      actorName: params.decidedBy,
      coworkerId: updated.coworkerId,
      action: params.decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      toolName: updated.toolName,
      redactedInput: updated.redactedPayload,
      redactedOutput: { decision: params.decision, note: params.note ?? '' },
      approvalId: updated.id,
      outcome: params.decision === 'APPROVED' ? 'SUCCESS' : 'BLOCKED',
    });

    return updated;
  }

  private mapApprovalRow(r: Row): ApprovalRequest {
    return {
      id: String(r.id),
      organizationId: r.organization_id ? String(r.organization_id) : null,
      userId: String(r.user_id),
      scope: String(r.scope) as ApprovalRequest['scope'],
      taskId: r.task_id ? String(r.task_id) : null,
      coworkerId: r.coworker_id ? String(r.coworker_id) : null,
      coworkerName: String(r.coworker_name),
      toolName: String(r.tool_name),
      riskLevel: String(r.risk_level) as ApprovalRequest['riskLevel'],
      summary: String(r.summary),
      redactedPayload: safeJsonParse(r.redacted_payload_json, {}),
      status: String(r.status) as ApprovalRequest['status'],
      decidedBy: r.decided_by ? String(r.decided_by) : null,
      decisionNote: r.decision_note ? String(r.decision_note) : null,
      createdAt: String(r.created_at),
      decidedAt: r.decided_at ? String(r.decided_at) : null,
    };
  }

  recordAuditEvent(input: Omit<AuditEvent, 'id' | 'createdAt'>): AuditEvent {
    const ev: AuditEvent = {
      ...input,
      id: generateId('aud'),
      redactedInput: redactSensitiveData(input.redactedInput),
      redactedOutput: redactSensitiveData(input.redactedOutput),
      createdAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        `INSERT INTO audit_events
          (id, organization_id, user_id, actor_type, actor_name, coworker_id, action, tool_name, redacted_input_json, redacted_output_json, approval_id, outcome, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        ev.id,
        ev.organizationId,
        ev.userId,
        ev.actorType,
        ev.actorName,
        ev.coworkerId,
        ev.action,
        ev.toolName,
        JSON.stringify(ev.redactedInput),
        JSON.stringify(ev.redactedOutput),
        ev.approvalId,
        ev.outcome,
        ev.createdAt
      );
    return ev;
  }

  listAuditEvents(orgId: string, limit = 100): AuditEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM audit_events WHERE organization_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(orgId, limit) as Row[];
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: r.organization_id ? String(r.organization_id) : null,
      userId: String(r.user_id),
      actorType: String(r.actor_type) as AuditEvent['actorType'],
      actorName: String(r.actor_name),
      coworkerId: r.coworker_id ? String(r.coworker_id) : null,
      action: String(r.action),
      toolName: r.tool_name ? String(r.tool_name) : null,
      redactedInput: safeJsonParse(r.redacted_input_json, {}),
      redactedOutput: safeJsonParse(r.redacted_output_json, {}),
      approvalId: r.approval_id ? String(r.approval_id) : null,
      outcome: String(r.outcome) as AuditEvent['outcome'],
      createdAt: String(r.created_at),
    }));
  }

  listUsageRecords(orgId: string): UsageRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM usage_records WHERE organization_id = ? ORDER BY recorded_at DESC')
      .all(orgId) as Row[];
    return rows.map((r) => ({
      id: String(r.id),
      organizationId: String(r.organization_id),
      metric: String(r.metric) as UsageRecord['metric'],
      quantity: Number(r.quantity),
      estimatedCostUsd: Number(r.estimated_cost_usd),
      periodLabel: String(r.period_label),
      recordedAt: String(r.recorded_at),
    }));
  }

  listNotifications(userId: string, scope: 'PERSONAL' | 'BUSINESS'): NotificationItem[] {
    const rows = this.db
      .prepare('SELECT * FROM notifications WHERE user_id = ? AND scope = ? ORDER BY created_at DESC')
      .all(userId, scope) as Row[];
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      scope: String(r.scope) as NotificationItem['scope'],
      title: String(r.title),
      body: String(r.body),
      read: Boolean(r.read),
      createdAt: String(r.created_at),
    }));
  }

  // ----------------------------------------------------------------------------
  // 7. Personal Workspace (Strictly Isolated by userId — Zero Org Exposure)
  // ----------------------------------------------------------------------------
  getPersonalWorkspace(userId: string): PersonalWorkspace {
    const row = this.db
      .prepare('SELECT data_json FROM personal_workspaces WHERE user_id = ?')
      .get(userId) as Row | undefined;
    if (row) {
      return safeJsonParse<PersonalWorkspace>(row.data_json, buildSeededPersonalWorkspace(userId));
    }
    const fresh = buildSeededPersonalWorkspace(userId);
    this.savePersonalWorkspace(userId, fresh);
    return fresh;
  }

  savePersonalWorkspace(userId: string, ws: PersonalWorkspace): PersonalWorkspace {
    const safeWs: PersonalWorkspace = { ...ws, userId };
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO personal_workspaces (id, user_id, data_json, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`
      )
      .run(safeWs.id, userId, JSON.stringify(safeWs), now);
    return safeWs;
  }

  // ----------------------------------------------------------------------------
  // 8. Data Export & Tenant Deletion (Enterprise Trust Requirement)
  // ----------------------------------------------------------------------------
  exportOrganizationData(orgId: string) {
    return {
      exportedAt: new Date().toISOString(),
      organization: this.getOrganizationById(orgId),
      businessWorkspace: this.getBusinessWorkspace(orgId),
      entitlement: this.getEntitlement(orgId),
      clients: this.listClients(orgId),
      coworkers: this.listCoworkers(orgId),
      tasks: this.listTasks(orgId),
      brainNodes: this.listBrainNodes(orgId),
      artifacts: this.listArtifacts(orgId),
      spaces: this.listSpaces(orgId),
      pages: this.listPages(orgId),
      integrations: this.listIntegrations(orgId), // credentials never exported
      approvals: this.listBusinessApprovals(orgId),
      auditEvents: this.listAuditEvents(orgId, 500),
      invoices: this.listInvoices(orgId),
    };
  }

  deleteOrganizationData(orgId: string): void {
    this.db.prepare('DELETE FROM organizations WHERE id = ?').run(orgId);
  }

  // ----------------------------------------------------------------------------
  // 9. Personal Agent Waitlist, Running Tracker & Instant Approval Links
  // ----------------------------------------------------------------------------
  private mapWaitlistRow(r: Row): WaitlistEntry {
    return {
      id: String(r.id),
      email: String(r.email),
      name: String(r.name),
      roleTitle: String(r.role_title),
      useCase: String(r.use_case),
      preferredTone: String(r.preferred_tone) as WaitlistEntry['preferredTone'],
      wantsBrowser: Boolean(r.wants_browser),
      wantsFiles: Boolean(r.wants_files),
      wantsTerminal: Boolean(r.wants_terminal),
      websiteUrl: String(r.website_url || ''),
      status: String(r.status) as WaitlistStatus,
      queuePosition: Number(r.queue_position),
      approvalToken: String(r.approval_token),
      accessToken: String(r.access_token),
      approvalUrl: String(r.approval_url),
      accessUrl: String(r.access_url),
      approverEmail: String(r.approver_email),
      emailDispatchStatus: String(r.email_dispatch_status) as WaitlistEntry['emailDispatchStatus'],
      emailDispatchDetail: String(r.email_dispatch_detail || ''),
      approvedBy: r.approved_by ? String(r.approved_by) : null,
      approvedAt: r.approved_at ? String(r.approved_at) : null,
      createdAt: String(r.created_at),
    };
  }

  createOrUpdateWaitlistEntry(input: {
    email: string;
    name: string;
    roleTitle: string;
    useCase: string;
    preferredTone: WaitlistEntry['preferredTone'];
    wantsBrowser: boolean;
    wantsFiles: boolean;
    wantsTerminal: boolean;
    websiteUrl: string;
    baseUrl: string;
    approverEmail: string;
  }): WaitlistEntry {
    const email = input.email.trim().toLowerCase();
    const existing = this.db.prepare('SELECT * FROM waitlist_entries WHERE email = ?').get(email) as Row | undefined;
    if (existing) {
      this.db
        .prepare(
          `UPDATE waitlist_entries
           SET name = ?, role_title = ?, use_case = ?, preferred_tone = ?, wants_browser = ?, wants_files = ?, wants_terminal = ?, website_url = ?
           WHERE email = ?`
        )
        .run(
          input.name.trim(),
          input.roleTitle.trim(),
          input.useCase.trim(),
          input.preferredTone,
          input.wantsBrowser ? 1 : 0,
          input.wantsFiles ? 1 : 0,
          input.wantsTerminal ? 1 : 0,
          input.websiteUrl.trim(),
          email
        );
      return this.mapWaitlistRow(this.db.prepare('SELECT * FROM waitlist_entries WHERE email = ?').get(email) as Row);
    }

    const countRow = this.db.prepare('SELECT COUNT(*) as cnt FROM waitlist_entries').get() as Row;
    const queuePosition = WAITLIST_CONFIG.seededBaseCount + Number(countRow.cnt || 0) + 1;
    const id = generateId('wl');
    const approvalToken = generateId('wlappr') + generateId('sig').slice(3);
    const accessToken = generateId('wlacc') + generateId('tok').slice(3);
    const cleanBase = input.baseUrl.replace(/\/+$/, '');
    const approvalUrl = `${cleanBase}/personal/approve?token=${encodeURIComponent(approvalToken)}`;
    const accessUrl = `${cleanBase}/personal/agent?access=${encodeURIComponent(accessToken)}&email=${encodeURIComponent(email)}`;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO waitlist_entries
          (id, email, name, role_title, use_case, preferred_tone, wants_browser, wants_files, wants_terminal, website_url, status, queue_position, approval_token, access_token, approval_url, access_url, approver_email, email_dispatch_status, email_dispatch_detail, approved_by, approved_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, 'MOCK_OUTBOX', '', NULL, NULL, ?)`
      )
      .run(
        id,
        email,
        input.name.trim(),
        input.roleTitle.trim(),
        input.useCase.trim(),
        input.preferredTone,
        input.wantsBrowser ? 1 : 0,
        input.wantsFiles ? 1 : 0,
        input.wantsTerminal ? 1 : 0,
        input.websiteUrl.trim(),
        queuePosition,
        approvalToken,
        accessToken,
        approvalUrl,
        accessUrl,
        input.approverEmail,
        now
      );

    return this.mapWaitlistRow(this.db.prepare('SELECT * FROM waitlist_entries WHERE id = ?').get(id) as Row);
  }

  updateWaitlistEmailDispatch(
    entryId: string,
    status: WaitlistEntry['emailDispatchStatus'],
    detail: string
  ): WaitlistEntry {
    this.db
      .prepare('UPDATE waitlist_entries SET email_dispatch_status = ?, email_dispatch_detail = ? WHERE id = ?')
      .run(status, detail, entryId);
    return this.mapWaitlistRow(this.db.prepare('SELECT * FROM waitlist_entries WHERE id = ?').get(entryId) as Row);
  }

  getWaitlistByEmail(email: string): WaitlistEntry | null {
    const r = this.db
      .prepare('SELECT * FROM waitlist_entries WHERE email = ?')
      .get(email.trim().toLowerCase()) as Row | undefined;
    return r ? this.mapWaitlistRow(r) : null;
  }

  getWaitlistByApprovalToken(token: string): WaitlistEntry | null {
    const r = this.db.prepare('SELECT * FROM waitlist_entries WHERE approval_token = ?').get(token) as Row | undefined;
    return r ? this.mapWaitlistRow(r) : null;
  }

  getWaitlistByAccessToken(token: string): WaitlistEntry | null {
    const r = this.db.prepare('SELECT * FROM waitlist_entries WHERE access_token = ?').get(token) as Row | undefined;
    return r ? this.mapWaitlistRow(r) : null;
  }

  approveWaitlistByToken(token: string, approverLabel: string): WaitlistEntry | null {
    const entry = this.getWaitlistByApprovalToken(token);
    if (!entry) return null;
    const now = new Date().toISOString();
    this.db
      .prepare(`UPDATE waitlist_entries SET status = 'APPROVED', approved_by = ?, approved_at = ? WHERE id = ?`)
      .run(approverLabel, now, entry.id);
    return this.mapWaitlistRow(this.db.prepare('SELECT * FROM waitlist_entries WHERE id = ?').get(entry.id) as Row);
  }

  decideWaitlistById(entryId: string, status: WaitlistStatus, approverLabel: string): WaitlistEntry | null {
    const existing = this.db.prepare('SELECT * FROM waitlist_entries WHERE id = ?').get(entryId) as Row | undefined;
    if (!existing) return null;
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE waitlist_entries SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?')
      .run(status, approverLabel, now, entryId);
    return this.mapWaitlistRow(this.db.prepare('SELECT * FROM waitlist_entries WHERE id = ?').get(entryId) as Row);
  }

  listWaitlistEntries(): WaitlistEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM waitlist_entries ORDER BY queue_position DESC')
      .all() as Row[];
    return rows.map((r) => this.mapWaitlistRow(r));
  }

  getWaitlistTrackerSummary(approverEmail: string): WaitlistTrackerSummary {
    const entries = this.listWaitlistEntries();
    const pendingLive = entries.filter((e) => e.status === 'PENDING').length;
    const approvedLive = entries.filter((e) => e.status === 'APPROVED').length;
    const rejectedLive = entries.filter((e) => e.status === 'REJECTED').length;

    return {
      approverEmail,
      totalJoined: WAITLIST_CONFIG.seededBaseCount + entries.length,
      pendingCount: (WAITLIST_CONFIG.seededBaseCount - WAITLIST_CONFIG.seededApprovedCount) + pendingLive,
      approvedCount: WAITLIST_CONFIG.seededApprovedCount + approvedLive,
      rejectedCount: rejectedLive,
      recentSignups: entries.slice(0, 12).map((e) => {
        const parts = e.name.split(/\s+/).filter(Boolean);
        const initials = parts.map((p) => p[0]?.toUpperCase() || '').join('').slice(0, 2) || 'PA';
        return {
          id: e.id,
          initials,
          roleTitle: e.roleTitle,
          preferredTone: e.preferredTone,
          status: e.status,
          queuePosition: e.queuePosition,
          createdAt: e.createdAt,
        };
      }),
    };
  }
}
