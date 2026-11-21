import { PRICING, SPECIALIST_DESK_BLUEPRINTS } from '@shared/constants';
import { evaluateToolExecutionPolicy, redactSensitiveData } from '@shared/policyEngine';
import {
  buildActiveTrialEntitlement,
  buildSeededDemoBundle,
  buildSeededPersonalWorkspace,
} from '@shared/seedData';
import { assertValidTaskTransition, evaluatePhaseGate } from '@shared/stateMachine';
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
  PersonalTask,
  PersonalWorkspace,
  SessionSnapshot,
  Space,
  SpacePage,
  Task,
  TaskStatus,
  ThemeId,
  UsageRecord,
  User,
} from '@shared/types';

// ==============================================================================
// Client-Side Deterministic Sandbox Engine (For Static GitHub Pages Previews)
// Implements the exact same API contract, webhook verification semantics,
// approval gates, redaction, and tenant isolation — clearly badged as SANDBOX.
// ==============================================================================

const STORAGE_KEY = 'seo_os_workbench_sandbox_v1';

export interface DeskBootstrapData {
  organization: Organization;
  businessWorkspace: BusinessWorkspace;
  entitlement: Entitlement;
  membership: Membership;
  members: Membership[];
  orgBlockedTools: string[];
  clients: ClientWorkspace[];
  coworkers: Coworker[];
  tasks: Task[];
  brainNodes: BrainNode[];
  artifacts: Artifact[];
  spaces: Space[];
  pages: SpacePage[];
  integrations: Integration[];
  approvals: ApprovalRequest[];
  auditEvents: AuditEvent[];
  usageRecords: UsageRecord[];
  invoices: InvoiceRecord[];
  notifications: NotificationItem[];
}

interface SandboxState {
  user: User | null;
  organization: Organization | null;
  membership: Membership | null;
  members: Membership[];
  businessWorkspace: BusinessWorkspace | null;
  entitlement: Entitlement | null;
  orgBlockedTools: string[];
  processedWebhookIds: string[];
  clients: ClientWorkspace[];
  coworkers: Coworker[];
  tasks: Task[];
  brainNodes: BrainNode[];
  artifacts: Artifact[];
  spaces: Space[];
  pages: SpacePage[];
  integrations: Integration[];
  businessApprovals: ApprovalRequest[];
  personalApprovals: ApprovalRequest[];
  auditEvents: AuditEvent[];
  usageRecords: UsageRecord[];
  invoices: InvoiceRecord[];
  notifications: NotificationItem[];
  personalWorkspace: PersonalWorkspace | null;
}

function rid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyState(): SandboxState {
  return {
    user: null,
    organization: null,
    membership: null,
    members: [],
    businessWorkspace: null,
    entitlement: null,
    orgBlockedTools: ['data_delete'],
    processedWebhookIds: [],
    clients: [],
    coworkers: [],
    tasks: [],
    brainNodes: [],
    artifacts: [],
    spaces: [],
    pages: [],
    integrations: [],
    businessApprovals: [],
    personalApprovals: [],
    auditEvents: [],
    usageRecords: [],
    invoices: [],
    notifications: [],
    personalWorkspace: null,
  };
}

function loadState(): SandboxState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return { ...emptyState(), ...(JSON.parse(raw) as Partial<SandboxState>) };
  } catch {
    return emptyState();
  }
}

function saveState(state: SandboxState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors in restricted browsers
  }
}

export const sandboxEngine = {
  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  getSession(): SessionSnapshot {
    const st = loadState();
    return {
      authenticated: Boolean(st.user),
      runtimeMode: 'STATIC_DEMO_SANDBOX',
      user: st.user,
      organization: st.organization,
      membership: st.membership,
      businessWorkspace: st.businessWorkspace,
      entitlement: st.entitlement,
    };
  },

  signup(input: { email: string; name: string; password: string; organizationName?: string; autoActivateDemoEntitlement?: boolean }): SessionSnapshot {
    const now = new Date().toISOString();
    const userId = rid('usr');
    const orgId = rid('org');
    const name = input.name.trim() || 'Alex Morgan';
    const orgName = input.organizationName?.trim() || `${name}'s Agency`;

    const user: User = {
      id: userId,
      email: input.email.trim().toLowerCase(),
      name,
      avatarColor: '#38bdf8',
      createdAt: now,
    };

    const organization: Organization = {
      id: orgId,
      name: orgName,
      slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      retentionDays: 90,
      deploymentMode: 'CLOUD',
      ssoConfig: {
        provider: 'NONE',
        scimEnabled: false,
        status: 'INTERFACE_READY_UNCONFIGURED',
      },
      createdAt: now,
    };

    const membership: Membership = {
      id: rid('mem'),
      organizationId: orgId,
      userId,
      userName: name,
      userEmail: user.email,
      role: 'OWNER',
      createdAt: now,
    };

    const businessWorkspace: BusinessWorkspace = {
      id: rid('bws'),
      organizationId: orgId,
      name: `${orgName} — SEO OS Desk`,
      activeTheme: 'cosmos',
      onboardingCompleted: Boolean(input.autoActivateDemoEntitlement),
      safeDefaultsEnabled: true,
      createdAt: now,
    };

    let entitlement: Entitlement = {
      id: rid('ent'),
      organizationId: orgId,
      planCode: 'BUSINESS_WORKSPACE',
      status: 'INACTIVE',
      setupFeeCents: PRICING.setupFeeCents,
      monthlyAmountCents: PRICING.monthlySubscriptionCents,
      includedMonths: PRICING.includedTrialMonths,
      setupPaidAt: null,
      includedPeriodEndsAt: null,
      nextBillingAt: null,
      cancelledAt: null,
    };

    let invoices: InvoiceRecord[] = [];
    if (input.autoActivateDemoEntitlement) {
      const provisioned = buildActiveTrialEntitlement(orgId, now);
      entitlement = provisioned.entitlement;
      invoices = provisioned.invoices;
    }

    const demo = buildSeededDemoBundle(orgId, userId, name);
    const personalWorkspace = buildSeededPersonalWorkspace(userId);

    const state: SandboxState = {
      user,
      organization,
      membership,
      members: [
        membership,
        {
          id: rid('mem'),
          organizationId: orgId,
          userId: 'usr_reviewer_demo',
          userName: 'Jordan Lee (Demo Reviewer)',
          userEmail: 'jordan@' + (organization.slug || 'agency') + '.example',
          role: 'REVIEWER',
          createdAt: now,
        },
      ],
      businessWorkspace,
      entitlement,
      orgBlockedTools: ['data_delete'],
      processedWebhookIds: [],
      clients: [demo.client],
      coworkers: demo.coworkers,
      tasks: demo.tasks,
      brainNodes: demo.brainNodes,
      artifacts: demo.artifacts,
      spaces: demo.spaces,
      pages: demo.pages,
      integrations: demo.integrations,
      businessApprovals: demo.approvals,
      personalApprovals: [],
      auditEvents: demo.auditEvents,
      usageRecords: demo.usageRecords,
      invoices,
      notifications: demo.notifications,
      personalWorkspace,
    };

    saveState(state);
    return this.getSession();
  },

  signin(input: { email: string; password: string }): SessionSnapshot {
    const st = loadState();
    if (st.user && st.user.email === input.email.trim().toLowerCase()) {
      return this.getSession();
    }
    return this.signup({
      email: input.email,
      name: input.email.split('@')[0] || 'Workspace Operator',
      password: input.password,
      organizationName: 'Growth Ops Studio',
    });
  },

  signout(): void {
    const st = loadState();
    st.user = null;
    saveState(st);
  },

  createCheckoutSession(): {
    provider: 'test';
    providerSessionId: string;
    checkoutUrl: string;
    amountCents: number;
    summary: string;
    entitlementGranted: false;
  } {
    const providerSessionId = rid('cs_test');
    return {
      provider: 'test',
      providerSessionId,
      checkoutUrl: `#/checkout?checkout=return&session_id=${providerSessionId}`,
      amountCents: PRICING.setupFeeCents,
      summary: PRICING.summaryLine,
      entitlementGranted: false,
    };
  },

  triggerTestWebhook(params: {
    eventType: 'checkout.session.completed' | 'invoice.payment_failed' | 'customer.subscription.deleted';
    eventId?: string;
  }) {
    const st = loadState();
    if (!st.organization || !st.entitlement) {
      throw new Error('Create or sign into an account before verifying payment webhook.');
    }
    const eventId = params.eventId || rid('evt_test');
    if (st.processedWebhookIds.includes(eventId)) {
      return {
        verified: true,
        duplicate: true,
        eventId,
        entitlement: st.entitlement,
        invoices: st.invoices,
      };
    }

    st.processedWebhookIds.push(eventId);
    const now = new Date().toISOString();

    if (params.eventType === 'checkout.session.completed') {
      const provisioned = buildActiveTrialEntitlement(st.organization.id, now);
      st.entitlement = provisioned.entitlement;
      st.invoices = [...provisioned.invoices, ...st.invoices];
      st.auditEvents.unshift({
        id: rid('aud'),
        organizationId: st.organization.id,
        userId: 'system_webhook',
        actorType: 'WEBHOOK',
        actorName: 'Payment Webhook (Test Sandbox)',
        coworkerId: null,
        action: 'BUSINESS_ENTITLEMENT_PROVISIONED',
        toolName: null,
        redactedInput: { eventId, eventType: params.eventType, setupFeeCents: PRICING.setupFeeCents },
        redactedOutput: {
          status: 'TRIAL_INCLUDED',
          includedPeriodEndsAt: st.entitlement.includedPeriodEndsAt,
          monthlyAmountCents: PRICING.monthlySubscriptionCents,
        },
        approvalId: null,
        outcome: 'SUCCESS',
        createdAt: now,
      });
    } else if (params.eventType === 'invoice.payment_failed') {
      st.entitlement = { ...st.entitlement, status: 'PAST_DUE' };
      st.invoices.unshift({
        id: rid('inv'),
        organizationId: st.organization.id,
        providerInvoiceId: rid('in_failed'),
        description: 'Payment Attempt Failed — Business Workspace Locked',
        amountCents: PRICING.setupFeeCents,
        status: 'FAILED',
        issuedAt: now,
        dueAt: now,
      });
      st.auditEvents.unshift({
        id: rid('aud'),
        organizationId: st.organization.id,
        userId: 'system_webhook',
        actorType: 'WEBHOOK',
        actorName: 'Payment Webhook (Test Sandbox)',
        coworkerId: null,
        action: 'PAYMENT_FAILED_ENTITLEMENT_LOCKED',
        toolName: null,
        redactedInput: { eventId },
        redactedOutput: { status: 'PAST_DUE' },
        approvalId: null,
        outcome: 'FAILED',
        createdAt: now,
      });
    } else if (params.eventType === 'customer.subscription.deleted') {
      st.entitlement = { ...st.entitlement, status: 'CANCELLED', cancelledAt: now };
      st.auditEvents.unshift({
        id: rid('aud'),
        organizationId: st.organization.id,
        userId: 'system_webhook',
        actorType: 'WEBHOOK',
        actorName: 'Payment Webhook (Test Sandbox)',
        coworkerId: null,
        action: 'SUBSCRIPTION_CANCELLED',
        toolName: null,
        redactedInput: { eventId },
        redactedOutput: { status: 'CANCELLED' },
        approvalId: null,
        outcome: 'SUCCESS',
        createdAt: now,
      });
    }

    saveState(st);
    return {
      verified: true,
      duplicate: false,
      eventId,
      entitlement: st.entitlement,
      invoices: st.invoices,
    };
  },

  completeOnboarding(input: {
    organizationName?: string;
    clientName?: string;
    clientDomain?: string;
    industry?: string;
    goals?: string[];
    safeDefaultsEnabled?: boolean;
  }) {
    const st = loadState();
    if (!st.organization || !st.businessWorkspace || !st.user) throw new Error('Not signed in');
    if (st.entitlement?.status !== 'TRIAL_INCLUDED' && st.entitlement?.status !== 'ACTIVE') {
      throw new Error('Verified Business Workspace entitlement required');
    }
    if (input.organizationName) st.organization.name = input.organizationName;
    st.businessWorkspace.onboardingCompleted = true;
    st.businessWorkspace.safeDefaultsEnabled = input.safeDefaultsEnabled ?? true;

    let client: ClientWorkspace | null = null;
    if (input.clientName && input.clientDomain) {
      client = {
        id: rid('cli'),
        organizationId: st.organization.id,
        name: input.clientName,
        domain: input.clientDomain,
        industry: input.industry || 'B2B SaaS',
        goals: input.goals?.length ? input.goals : ['Surface technical & commercial SEO opportunities'],
        dataMode: 'MOCK_DEMO',
        isDemo: false,
        createdAt: new Date().toISOString(),
      };
      st.clients.unshift(client);
    }
    saveState(st);
    return { workspace: st.businessWorkspace, client };
  },

  getDeskBootstrap(): DeskBootstrapData {
    const st = loadState();
    if (!st.user || !st.organization || !st.businessWorkspace || !st.entitlement || !st.membership) {
      throw new Error('Authentication required');
    }
    if (st.entitlement.status !== 'TRIAL_INCLUDED' && st.entitlement.status !== 'ACTIVE') {
      throw new Error('Active Business Workspace entitlement required ($997 setup + verified webhook)');
    }
    return {
      organization: st.organization,
      businessWorkspace: st.businessWorkspace,
      entitlement: st.entitlement,
      membership: st.membership,
      members: st.members,
      orgBlockedTools: st.orgBlockedTools,
      clients: st.clients,
      coworkers: st.coworkers,
      tasks: st.tasks,
      brainNodes: st.brainNodes,
      artifacts: st.artifacts,
      spaces: st.spaces,
      pages: st.pages,
      integrations: st.integrations,
      approvals: st.businessApprovals,
      auditEvents: st.auditEvents,
      usageRecords: st.usageRecords,
      invoices: st.invoices,
      notifications: st.notifications.filter((n) => n.scope === 'BUSINESS'),
    };
  },

  setTheme(theme: ThemeId) {
    const st = loadState();
    if (st.businessWorkspace) {
      st.businessWorkspace.activeTheme = theme;
      saveState(st);
    }
    return { businessWorkspace: st.businessWorkspace };
  },

  createClient(input: { name: string; domain: string; industry: string; goals: string[] }) {
    const st = loadState();
    if (!st.organization || !st.user) throw new Error('Not authenticated');
    const client: ClientWorkspace = {
      id: rid('cli'),
      organizationId: st.organization.id,
      name: input.name,
      domain: input.domain,
      industry: input.industry,
      goals: input.goals,
      dataMode: 'MOCK_DEMO',
      isDemo: false,
      createdAt: new Date().toISOString(),
    };
    st.clients.unshift(client);
    st.auditEvents.unshift({
      id: rid('aud'),
      organizationId: st.organization.id,
      userId: st.user.id,
      actorType: 'USER',
      actorName: st.user.name,
      coworkerId: null,
      action: 'CLIENT_WORKSPACE_CREATED',
      toolName: null,
      redactedInput: input,
      redactedOutput: { clientId: client.id },
      approvalId: null,
      outcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    });
    saveState(st);
    return { client };
  },

  runOrchestrator(input: { clientId: string; objective: string; includeLocalSeo?: boolean }) {
    const st = loadState();
    if (!st.organization || !st.user) throw new Error('Not authenticated');
    const runId = rid('run');
    const now = new Date().toISOString();
    const byDesk = new Map(st.coworkers.map((c) => [c.deskKey, c]));
    const phase1Ids: string[] = [];
    const phase2Ids: string[] = [];
    const created: Task[] = [];

    for (const bp of SPECIALIST_DESK_BLUEPRINTS) {
      const id = rid('tsk');
      const isSoftSkip = bp.deskKey === 'local-seo' && !input.includeLocalSeo;
      const dependsOn = bp.phase === 1 ? [] : bp.phase === 2 ? [...phase1Ids] : [...phase1Ids, ...phase2Ids];
      const status: TaskStatus = isSoftSkip
        ? 'SKIPPED'
        : bp.phase === 1
          ? 'DONE'
          : bp.phase === 2
            ? bp.deskKey === 'schema-architect'
              ? 'REVIEW'
              : 'RUNNING'
            : 'BLOCKED';
      const task: Task = {
        id,
        organizationId: st.organization.id,
        clientId: input.clientId,
        orchestratorRunId: runId,
        coworkerId: byDesk.get(bp.deskKey)?.id ?? `spec_${bp.deskKey}`,
        deskKey: bp.deskKey,
        title: `${bp.shortLabel}: ${input.objective.slice(0, 56)}`,
        description: `${bp.role} Objective: ${input.objective}`,
        phase: bp.phase,
        status,
        statusReason: isSoftSkip
          ? 'Expected soft skip: Local SEO disabled for this run.'
          : status === 'DONE'
            ? 'Phase 1 completed via deterministic Mock Specialist Adapter.'
            : status === 'REVIEW'
              ? 'Draft awaiting human approval before saving.'
              : status === 'RUNNING'
                ? 'Active in Phase 2 specialist desk (Mock Adapter).'
                : 'Waiting on Phase 2 completion & approval gate.',
        progressPct: status === 'DONE' || status === 'SKIPPED' ? 100 : status === 'REVIEW' ? 90 : status === 'RUNNING' ? 60 : 10,
        isMock: true,
        dependsOn,
        createdAt: now,
        updatedAt: now,
      };
      created.push(task);
      if (bp.phase === 1) phase1Ids.push(id);
      if (bp.phase === 2) phase2Ids.push(id);
    }

    st.tasks = [...created, ...st.tasks];
    const client = st.clients.find((c) => c.id === input.clientId);
    st.artifacts.unshift({
      id: rid('art'),
      organizationId: st.organization.id,
      clientId: input.clientId,
      taskId: created[0]?.id ?? null,
      title: `Orchestrator Evidence Brief — ${client?.domain ?? 'Client'} [MOCK]`,
      kind: 'FINAL_RECOMMENDATION',
      format: 'markdown',
      confidence: 0.89,
      approved: false,
      createdAt: now,
      provenance: {
        generatedBy: 'Central SEO OS Orchestrator (Mock Adapter)',
        toolsUsed: ['seo_crawl_inspector', 'serp_analyzer', 'schema_validator'],
        sourceLinks: [`https://${client?.domain ?? 'client.example'}/`],
        timestamp: now,
        isMock: true,
      },
      content: `# Orchestrator Outcome Brief\n\n**Objective**: ${input.objective}\n\n> **Provider Notice**: Generated using deterministic Mock Specialist Adapters. No external services were contacted.\n\n## Dispatched Phases\n- **Phase 1 (Complete)**: Technical Audit, Keyword Research, GSC/Analytics, Competitor Teardown\n- **Phase 2 (Active / Review)**: Schema Draft awaiting review, Content Strategy & GEO running${!input.includeLocalSeo ? ', Local SEO soft-skipped' : ''}\n- **Phase 3 (Gate Blocked)**: Final 90-day plan queued behind Phase 2 approvals.`,
    });

    st.auditEvents.unshift({
      id: rid('aud'),
      organizationId: st.organization.id,
      userId: st.user.id,
      actorType: 'ORCHESTRATOR',
      actorName: 'Central SEO OS Orchestrator',
      coworkerId: null,
      action: 'ORCHESTRATOR_WORKFLOW_DISPATCHED',
      toolName: null,
      redactedInput: input,
      redactedOutput: { runId, tasksCreated: created.length },
      approvalId: null,
      outcome: 'SUCCESS',
      createdAt: now,
    });

    saveState(st);
    return { runId, tasks: created };
  },

  taskAction(taskId: string, action: 'PAUSE' | 'RESUME' | 'CANCEL' | 'RETRY' | 'COMPLETE_MOCK') {
    const st = loadState();
    if (!st.organization || !st.user) throw new Error('Not authenticated');
    const idx = st.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error('Task not found');
    const task = st.tasks[idx];
    let nextStatus: TaskStatus = task.status;
    let reason = task.statusReason;
    let pct = task.progressPct;

    if (action === 'PAUSE') {
      assertValidTaskTransition(task.status, 'PAUSED');
      nextStatus = 'PAUSED';
      reason = `Paused by ${st.user.name}.`;
    } else if (action === 'RESUME') {
      assertValidTaskTransition(task.status, 'RUNNING');
      nextStatus = 'RUNNING';
      reason = `Resumed by ${st.user.name}.`;
    } else if (action === 'CANCEL') {
      assertValidTaskTransition(task.status, 'CANCELLED');
      nextStatus = 'CANCELLED';
      reason = `Cancelled by ${st.user.name}.`;
    } else if (action === 'RETRY' || action === 'COMPLETE_MOCK') {
      assertValidTaskTransition(task.status, action === 'RETRY' ? 'RUNNING' : 'DONE');
      nextStatus = 'DONE';
      pct = 100;
      reason =
        action === 'RETRY'
          ? `Retried by ${st.user.name} using deterministic fallback fixture — succeeded.`
          : 'Completed by Mock Specialist Adapter.';
    }

    st.tasks[idx] = { ...task, status: nextStatus, statusReason: reason, progressPct: pct, updatedAt: new Date().toISOString() };

    // Unlock downstream phase gates
    for (let i = 0; i < st.tasks.length; i++) {
      if (st.tasks[i].status !== 'BLOCKED') continue;
      const gate = evaluatePhaseGate(st.tasks[i], st.tasks);
      if (gate.satisfied) {
        st.tasks[i] = {
          ...st.tasks[i],
          status: 'RUNNING',
          statusReason: `${gate.reason} Phase gate unblocked.`,
          progressPct: Math.max(st.tasks[i].progressPct, 40),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    st.auditEvents.unshift({
      id: rid('aud'),
      organizationId: st.organization.id,
      userId: st.user.id,
      actorType: 'USER',
      actorName: st.user.name,
      coworkerId: task.coworkerId,
      action: `TASK_${action}`,
      toolName: null,
      redactedInput: { taskId, from: task.status },
      redactedOutput: { to: nextStatus },
      approvalId: null,
      outcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    });
    saveState(st);
    return { task: st.tasks[idx], tasks: st.tasks };
  },

  createCoworker(input: {
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
  }) {
    const st = loadState();
    if (!st.organization || !st.user) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const cw: Coworker = {
      id: rid('cw'),
      organizationId: st.organization.id,
      clientId: input.clientId,
      kind: 'COWORKER',
      deskKey: `coworker-${rid('dk').slice(-5)}`,
      name: input.name,
      role: input.role,
      avatarEmoji: input.avatarEmoji || '🤖',
      accentColor: input.accentColor || '#38bdf8',
      instructions: input.instructions,
      allowedTools: input.allowedTools,
      approvalPolicy: input.approvalPolicy,
      scheduleCron: input.scheduleCron,
      defaultSpaceId: input.defaultSpaceId,
      status: 'IDLE',
      isDemo: false,
      createdAt: now,
    };
    st.coworkers.push(cw);
    st.auditEvents.unshift({
      id: rid('aud'),
      organizationId: st.organization.id,
      userId: st.user.id,
      actorType: 'USER',
      actorName: st.user.name,
      coworkerId: cw.id,
      action: 'COWORKER_CREATED',
      toolName: null,
      redactedInput: { name: cw.name, role: cw.role, allowedTools: cw.allowedTools },
      redactedOutput: { coworkerId: cw.id },
      approvalId: null,
      outcome: 'SUCCESS',
      createdAt: now,
    });
    saveState(st);
    return { coworker: cw };
  },

  invokeCoworkerTool(coworkerId: string, toolId: string, summary: string, payload: Record<string, unknown>) {
    const st = loadState();
    if (!st.organization || !st.user) throw new Error('Not authenticated');
    const cw = st.coworkers.find((c) => c.id === coworkerId);
    if (!cw) throw new Error('Coworker not found');
    const policy = evaluateToolExecutionPolicy({
      toolId,
      coworker: cw,
      orgBlockedTools: st.orgBlockedTools,
      safeDefaultsEnabled: st.businessWorkspace?.safeDefaultsEnabled ?? true,
    });
    const now = new Date().toISOString();

    if (policy.decision === 'BLOCK') {
      const audit: AuditEvent = {
        id: rid('aud'),
        organizationId: st.organization.id,
        userId: st.user.id,
        actorType: 'COWORKER',
        actorName: cw.name,
        coworkerId: cw.id,
        action: 'TOOL_CALL_BLOCKED_BY_POLICY',
        toolName: toolId,
        redactedInput: redactSensitiveData(payload),
        redactedOutput: { reason: policy.reason },
        approvalId: null,
        outcome: 'BLOCKED',
        createdAt: now,
      };
      st.auditEvents.unshift(audit);
      saveState(st);
      return { status: 'BLOCKED' as const, reason: policy.reason, auditEvent: audit };
    }

    if (policy.decision === 'REQUIRE_APPROVAL') {
      const approval: ApprovalRequest = {
        id: rid('appr'),
        organizationId: st.organization.id,
        userId: st.user.id,
        scope: 'BUSINESS',
        taskId: null,
        coworkerId: cw.id,
        coworkerName: cw.name,
        toolName: toolId,
        riskLevel: policy.riskLevel,
        summary,
        redactedPayload: redactSensitiveData(payload),
        status: 'PENDING',
        decidedBy: null,
        decisionNote: null,
        createdAt: now,
        decidedAt: null,
      };
      st.businessApprovals.unshift(approval);
      cw.status = 'AWAITING_APPROVAL';
      const audit: AuditEvent = {
        id: rid('aud'),
        organizationId: st.organization.id,
        userId: st.user.id,
        actorType: 'COWORKER',
        actorName: cw.name,
        coworkerId: cw.id,
        action: 'TOOL_CALL_PAUSED_FOR_APPROVAL',
        toolName: toolId,
        redactedInput: redactSensitiveData(payload),
        redactedOutput: { approvalId: approval.id, reason: policy.reason },
        approvalId: approval.id,
        outcome: 'AWAITING_APPROVAL',
        createdAt: now,
      };
      st.auditEvents.unshift(audit);
      saveState(st);
      return { status: 'APPROVAL_REQUIRED' as const, reason: policy.reason, approvalRequest: approval, auditEvent: audit };
    }

    const result = {
      adapter: 'MOCK_ADAPTER',
      toolId,
      summary: `Mock read-only tool "${toolId}" executed cleanly for "${summary}".`,
      timestamp: now,
    };
    const audit: AuditEvent = {
      id: rid('aud'),
      organizationId: st.organization.id,
      userId: st.user.id,
      actorType: 'COWORKER',
      actorName: cw.name,
      coworkerId: cw.id,
      action: 'TOOL_EXECUTED',
      toolName: toolId,
      redactedInput: redactSensitiveData(payload),
      redactedOutput: result,
      approvalId: null,
      outcome: 'SUCCESS',
      createdAt: now,
    };
    st.auditEvents.unshift(audit);
    saveState(st);
    return { status: 'EXECUTED' as const, result, auditEvent: audit };
  },

  decideBusinessApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
    const st = loadState();
    if (!st.organization || !st.user) throw new Error('Not authenticated');
    const appr = st.businessApprovals.find((a) => a.id === approvalId);
    if (!appr) throw new Error('Approval request not found');
    const now = new Date().toISOString();
    appr.status = decision;
    appr.decidedBy = st.user.name;
    appr.decisionNote = note ?? null;
    appr.decidedAt = now;

    if (appr.taskId) {
      const task = st.tasks.find((t) => t.id === appr.taskId);
      if (task && task.status === 'REVIEW') {
        task.status = decision === 'APPROVED' ? 'DONE' : 'CANCELLED';
        task.progressPct = decision === 'APPROVED' ? 100 : task.progressPct;
        task.statusReason =
          decision === 'APPROVED'
            ? `Approved by ${st.user.name}.`
            : `Rejected by ${st.user.name}.`;
        task.updatedAt = now;
      }
      // Re-evaluate blocked phase gates
      for (const t of st.tasks) {
        if (t.status === 'BLOCKED') {
          const gate = evaluatePhaseGate(t, st.tasks);
          if (gate.satisfied) {
            t.status = 'RUNNING';
            t.statusReason = gate.reason;
          }
        }
      }
    }

    if (appr.coworkerId) {
      const cw = st.coworkers.find((c) => c.id === appr.coworkerId);
      if (cw) cw.status = 'IDLE';
    }

    st.auditEvents.unshift({
      id: rid('aud'),
      organizationId: st.organization.id,
      userId: st.user.id,
      actorType: 'USER',
      actorName: st.user.name,
      coworkerId: appr.coworkerId,
      action: decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      toolName: appr.toolName,
      redactedInput: appr.redactedPayload,
      redactedOutput: { decision, note: note ?? '' },
      approvalId: appr.id,
      outcome: decision === 'APPROVED' ? 'SUCCESS' : 'BLOCKED',
      createdAt: now,
    });
    saveState(st);
    return { approval: appr, tasks: st.tasks };
  },

  savePage(input: { pageId?: string; spaceId: string; parentPageId?: string | null; title: string; content: string }) {
    const st = loadState();
    if (!st.organization || !st.user) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    if (input.pageId) {
      const pg = st.pages.find((p) => p.id === input.pageId);
      if (!pg) throw new Error('Page not found');
      pg.title = input.title;
      pg.content = input.content;
      pg.version += 1;
      pg.updatedBy = st.user.name;
      pg.updatedAt = now;
      pg.revisions.push({
        id: rid('rev'),
        pageId: pg.id,
        version: pg.version,
        content: input.content,
        authorName: st.user.name,
        createdAt: now,
      });
      saveState(st);
      return { page: pg };
    }
    const id = rid('pg');
    const pg: SpacePage = {
      id,
      organizationId: st.organization.id,
      spaceId: input.spaceId,
      parentPageId: input.parentPageId ?? null,
      title: input.title,
      content: input.content,
      version: 1,
      updatedBy: st.user.name,
      updatedAt: now,
      revisions: [{ id: rid('rev'), pageId: id, version: 1, content: input.content, authorName: st.user.name, createdAt: now }],
    };
    st.pages.unshift(pg);
    saveState(st);
    return { page: pg };
  },

  approveArtifact(artifactId: string) {
    const st = loadState();
    const art = st.artifacts.find((a) => a.id === artifactId);
    if (!art) throw new Error('Artifact not found');
    art.approved = true;
    saveState(st);
    return { artifact: art };
  },

  configureIntegration(integrationId: string, params: { secretValue?: string; label?: string; enabledCoworkerIds?: string[] }) {
    const st = loadState();
    if (!st.organization || !st.user) throw new Error('Not authenticated');
    const integ = st.integrations.find((i) => i.id === integrationId);
    if (!integ) throw new Error('Integration not found');
    if (params.secretValue) {
      integ.credentialConfigured = true;
      integ.credentialLabel = params.label || 'Sandbox Simulated Encrypted Ref (Not Sent to External API)';
      integ.status = 'MOCK_ACTIVE';
    }
    if (params.enabledCoworkerIds) {
      integ.enabledCoworkerIds = params.enabledCoworkerIds;
    }
    integ.updatedAt = new Date().toISOString();
    st.auditEvents.unshift({
      id: rid('aud'),
      organizationId: st.organization.id,
      userId: st.user.id,
      actorType: 'USER',
      actorName: st.user.name,
      coworkerId: null,
      action: 'INTEGRATION_CONFIGURED',
      toolName: null,
      redactedInput: { integrationId, secretValue: params.secretValue ? '[REDACTED]' : undefined },
      redactedOutput: { status: integ.status },
      approvalId: null,
      outcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    });
    saveState(st);
    return { integration: integ };
  },

  updateAdminSettings(patch: {
    name?: string;
    retentionDays?: number;
    deploymentMode?: Organization['deploymentMode'];
    blockedTools?: string[];
    ssoConfig?: Organization['ssoConfig'];
  }) {
    const st = loadState();
    if (!st.organization || !st.user) throw new Error('Not authenticated');
    if (patch.name) st.organization.name = patch.name;
    if (patch.retentionDays) st.organization.retentionDays = patch.retentionDays;
    if (patch.deploymentMode) st.organization.deploymentMode = patch.deploymentMode;
    if (patch.ssoConfig) st.organization.ssoConfig = patch.ssoConfig;
    if (patch.blockedTools) st.orgBlockedTools = patch.blockedTools;
    st.auditEvents.unshift({
      id: rid('aud'),
      organizationId: st.organization.id,
      userId: st.user.id,
      actorType: 'USER',
      actorName: st.user.name,
      coworkerId: null,
      action: 'ADMIN_POLICY_UPDATED',
      toolName: null,
      redactedInput: redactSensitiveData(patch),
      redactedOutput: { retentionDays: st.organization.retentionDays, deploymentMode: st.organization.deploymentMode },
      approvalId: null,
      outcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    });
    saveState(st);
    return { organization: st.organization, orgBlockedTools: st.orgBlockedTools };
  },

  exportOrganizationData() {
    const st = loadState();
    return {
      exportedAt: new Date().toISOString(),
      mode: 'STATIC_DEMO_SANDBOX',
      organization: st.organization,
      entitlement: st.entitlement,
      clients: st.clients,
      coworkers: st.coworkers,
      tasks: st.tasks,
      brainNodes: st.brainNodes,
      artifacts: st.artifacts,
      spaces: st.spaces,
      pages: st.pages,
      auditEvents: st.auditEvents,
    };
  },

  // --- Isolated Personal Agent Operations (Zero Business Data Exposure) ---
  getPersonalWorkspace() {
    const st = loadState();
    if (!st.personalWorkspace) {
      const guestUserId = st.user?.id ?? 'usr_personal_guest';
      st.personalWorkspace = buildSeededPersonalWorkspace(guestUserId);
      saveState(st);
    }
    return {
      workspace: st.personalWorkspace,
      approvals: st.personalApprovals,
      notifications: st.notifications.filter((n) => n.scope === 'PERSONAL'),
    };
  },

  updatePersonalPreferences(patch: Partial<PersonalWorkspace>) {
    const st = loadState();
    const { workspace } = this.getPersonalWorkspace();
    st.personalWorkspace = { ...workspace, ...patch };
    saveState(st);
    return { workspace: st.personalWorkspace };
  },

  createPersonalTask(prompt: string) {
    const st = loadState();
    const { workspace } = this.getPersonalWorkspace();
    const now = new Date().toISOString();
    const taskId = rid('ptsk');
    const receiptId = rid('prec');
    const needsApproval = /(send|email|delete|publish|terminal|bash|pay|purchase)/i.test(prompt);

    const task: PersonalTask = {
      id: taskId,
      userId: workspace.userId,
      prompt,
      status: needsApproval ? 'REVIEW' : 'DONE',
      progressPct: needsApproval ? 65 : 100,
      browserTakeoverActive: false,
      browserCurrentUrl: 'https://research-fixture.example/query?q=' + encodeURIComponent(prompt.slice(0, 32)),
      receiptId,
      isMock: true,
      createdAt: now,
      updatedAt: now,
      followUpQueue: [],
      steps: [
        { id: 's1', title: 'Apply personal preferences & memories', status: 'DONE', detail: `Tone: ${workspace.tone}` },
        { id: 's2', title: 'Run read-only browser research (Mock Adapter)', status: 'DONE', detail: 'Captured structured excerpts with sources.' },
        {
          id: 's3',
          title: needsApproval ? 'Paused at personal approval boundary' : 'Saved inline cards & receipt',
          status: needsApproval ? 'BLOCKED' : 'DONE',
          detail: needsApproval ? 'Awaiting explicit approval before sensitive action.' : 'Receipt recorded cleanly.',
        },
      ],
      cards: [
        {
          id: rid('pc'),
          kind: 'browser',
          title: 'Browser Research Card (Mock Fixture)',
          summary: `Collected source summary for: "${prompt.slice(0, 90)}"`,
          url: 'https://research-fixture.example/snapshot/' + taskId.slice(-5),
          metadata: { adapter: 'Mock Personal Browser', mode: 'Read-Only' },
          isMock: true,
        },
        {
          id: rid('pc'),
          kind: 'plan',
          title: 'Durable Execution Plan',
          summary: needsApproval
            ? 'Paused before external/terminal execution — approve or reject below.'
            : 'Completed cleanly. Receipt stored in your isolated personal workspace.',
          metadata: { receiptId, isolation: 'Personal Only' },
          isMock: true,
        },
      ],
    };

    let approval: ApprovalRequest | null = null;
    if (needsApproval) {
      approval = {
        id: rid('pappr'),
        organizationId: null,
        userId: workspace.userId,
        scope: 'PERSONAL',
        taskId,
        coworkerId: null,
        coworkerName: 'Personal Agent',
        toolName: /(terminal|bash)/i.test(prompt) ? 'terminal_exec' : 'email_send',
        riskLevel: 'sensitive',
        summary: `Personal Agent paused before executing sensitive request: "${prompt.slice(0, 90)}"`,
        redactedPayload: { prompt, terminalPermissionEnabled: workspace.terminalEnabled },
        status: 'PENDING',
        decidedBy: null,
        decisionNote: null,
        createdAt: now,
        decidedAt: null,
      };
      st.personalApprovals.unshift(approval);
    }

    workspace.tasks.unshift(task);
    workspace.receipts.unshift({
      id: receiptId,
      userId: workspace.userId,
      taskId,
      title: prompt.slice(0, 64),
      toolsUsed: needsApproval ? ['browser_read', 'approval_gate'] : ['browser_read'],
      approvalDecision: needsApproval ? 'Pending Approval' : 'Auto-approved (Read-Only)',
      outcome: needsApproval ? 'Paused at safety gate' : 'Completed (Mock Adapter)',
      createdAt: now,
    });
    st.personalWorkspace = workspace;
    saveState(st);
    return { task, approval, workspace };
  },

  controlPersonalTask(taskId: string, action: string, text?: string) {
    const st = loadState();
    const { workspace } = this.getPersonalWorkspace();
    const now = new Date().toISOString();
    workspace.tasks = workspace.tasks.map((t) => {
      if (t.id !== taskId) return t;
      if (action === 'PAUSE') return { ...t, status: 'PAUSED' as const, updatedAt: now };
      if (action === 'RESUME') return { ...t, status: 'RUNNING' as const, updatedAt: now };
      if (action === 'STOP' || action === 'CANCEL') return { ...t, status: 'CANCELLED' as const, updatedAt: now };
      if (action === 'RETRY') return { ...t, status: 'DONE' as const, progressPct: 100, updatedAt: now };
      if (action === 'TOGGLE_TAKEOVER') return { ...t, browserTakeoverActive: !t.browserTakeoverActive, updatedAt: now };
      if (action === 'ADD_FOLLOWUP' && text?.trim()) {
        return { ...t, followUpQueue: [...t.followUpQueue, text.trim()], updatedAt: now };
      }
      return t;
    });
    st.personalWorkspace = workspace;
    saveState(st);
    return { workspace };
  },

  decidePersonalApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED') {
    const st = loadState();
    const { workspace } = this.getPersonalWorkspace();
    const appr = st.personalApprovals.find((a) => a.id === approvalId);
    if (!appr) throw new Error('Approval not found');
    appr.status = decision;
    appr.decidedBy = st.user?.name || 'Personal User';
    appr.decidedAt = new Date().toISOString();
    workspace.tasks = workspace.tasks.map((t) =>
      t.id === appr.taskId
        ? { ...t, status: decision === 'APPROVED' ? ('DONE' as const) : ('CANCELLED' as const), progressPct: decision === 'APPROVED' ? 100 : t.progressPct }
        : t
    );
    st.personalWorkspace = workspace;
    saveState(st);
    return { approval: appr, workspace };
  },
};
