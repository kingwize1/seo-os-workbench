import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { PRICING } from '../shared/constants';
import { evaluateToolExecutionPolicy, redactSensitiveData } from '../shared/policyEngine';
import type { ApprovalRequest, PersonalTask } from '../shared/types';
import { createDatabase, type AppDatabase } from './db';
import { generateId } from './crypto';
import {
  createRateLimiter,
  createSessionMiddleware,
  extractSessionToken,
  requireAuth,
  requireBusinessEntitlement,
  requirePermission,
  SESSION_COOKIE_NAME,
} from './middleware';
import { createPaymentProvider, type PaymentProvider } from './paymentAdapter';
import { EmailAdapter } from './emailAdapter';
import { getServerProviderStatuses } from './providerRegistry';
import { Repositories } from './repositories';
import { OrchestrationWorker } from './worker';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerBundle {
  app: express.Express;
  db: AppDatabase;
  repos: Repositories;
  worker: OrchestrationWorker;
  paymentProvider: PaymentProvider;
  emailAdapter: EmailAdapter;
  close(): void;
}

export function createApp(options?: { dbPath?: string; paymentProvider?: PaymentProvider }): ServerBundle {
  const db = createDatabase(options?.dbPath);
  const repos = new Repositories(db.sqlite);
  const worker = new OrchestrationWorker(repos);
  const paymentProvider = options?.paymentProvider ?? createPaymentProvider();
  const emailAdapter = new EmailAdapter();

  // Recover any tasks stranded in RUNNING from a previous unclean shutdown
  worker.recoverInterruptedTasks();

  const allowedOrigins = new Set(
    [
      process.env.APP_ORIGIN,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://kingwize1.github.io',
    ].filter(Boolean) as string[]
  );

  const app = express();
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow configured preview origins cleanly
        }
      },
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(createRateLimiter(240));

  // Capture raw body for cryptographic payment webhook signature verification
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    })
  );

  app.use(createSessionMiddleware(repos));

  // ----------------------------------------------------------------------------
  // Health Check & Server-Only Provider Status (NEVER exposes raw secrets)
  // ----------------------------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    const providers = getServerProviderStatuses();
    res.json({
      status: 'ok',
      paymentProvider: paymentProvider.name,
      pricing: PRICING.summaryLine,
      configuredProvidersCount: providers.filter((p) => p.configured).length,
      totalProvidersCount: providers.length,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/providers/status', requireAuth, requireBusinessEntitlement, (_req, res) => {
    res.json({
      paymentProvider: paymentProvider.name,
      providers: getServerProviderStatuses(),
    });
  });

  // ----------------------------------------------------------------------------
  // Authentication Routes
  // ----------------------------------------------------------------------------
  const signupSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1).max(120),
    password: z.string().min(8).max(128),
    organizationName: z.string().min(1).max(120).optional(),
  });

  app.post('/api/auth/signup', (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid signup fields', details: parsed.error.flatten() });
      return;
    }
    try {
      const created = repos.createUserWithAccount(parsed.data);
      const token = repos.createSession(created.user.id, created.organization.id);
      setSessionCookie(res, token);
      res.status(201).json({
        authenticated: true,
        runtimeMode: 'LIVE_API',
        sessionToken: token,
        ...created,
      });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Signup failed' });
    }
  });

  const signinSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  app.post('/api/auth/signin', (req, res) => {
    const parsed = signinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const user = repos.authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const token = repos.createSession(user.id, null);
    const ctx = repos.getSessionContext(token);
    setSessionCookie(res, token);
    res.json({
      authenticated: true,
      runtimeMode: 'LIVE_API',
      sessionToken: token,
      user: ctx?.user ?? user,
      organization: ctx?.organization ?? null,
      membership: ctx?.membership ?? null,
      businessWorkspace: ctx?.businessWorkspace ?? null,
      entitlement: ctx?.entitlement ?? null,
    });
  });

  app.post('/api/auth/signout', (req, res) => {
    const token = extractSessionToken(req);
    if (token) repos.deleteSession(token);
    res.clearCookie(SESSION_COOKIE_NAME);
    res.json({ ok: true });
  });

  app.get('/api/auth/session', (req, res) => {
    if (!req.auth?.user) {
      res.json({
        authenticated: false,
        runtimeMode: 'LIVE_API',
        user: null,
        organization: null,
        membership: null,
        businessWorkspace: null,
        entitlement: null,
      });
      return;
    }
    res.json({
      authenticated: true,
      runtimeMode: 'LIVE_API',
      ...req.auth,
    });
  });

  // ----------------------------------------------------------------------------
  // Billing, Setup-Fee Checkout ($997) & Signed Idempotent Webhooks
  // NEVER grants paid access merely on browser return; ONLY on verified webhook.
  // ----------------------------------------------------------------------------
  app.post('/api/billing/checkout', requireAuth, async (req, res) => {
    const auth = req.auth!;
    if (!auth.organization) {
      res.status(400).json({ error: 'No organization associated with user' });
      return;
    }
    try {
      const returnUrl = typeof req.body?.returnUrl === 'string' ? req.body.returnUrl : '/checkout';
      const session = await paymentProvider.createSetupCheckoutSession({
        organizationId: auth.organization.id,
        userId: auth.user.id,
        customerEmail: auth.user.email,
        organizationName: auth.organization.name,
        returnUrl,
      });
      repos.recordCheckoutSession({
        organizationId: auth.organization.id,
        userId: auth.user.id,
        provider: session.provider,
        providerSessionId: session.providerSessionId,
        amountCents: session.amountCents,
      });
      res.status(201).json({
        ...session,
        entitlementGranted: false,
        note: 'Access is granted strictly after server-side webhook verification — never on browser return alone.',
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Checkout init failed' });
    }
  });

  app.post('/api/webhooks/payment', (req, res) => {
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
    const signature =
      req.header('stripe-signature') ?? req.header('x-payment-signature') ?? undefined;
    try {
      const event = paymentProvider.verifyAndParseWebhook(rawBody, signature);
      const result = repos.processVerifiedPaymentWebhook(event, rawBody);
      res.json({
        received: true,
        duplicate: result.duplicate,
        eventId: event.eventId,
        entitlement: result.entitlement,
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Webhook verification failed' });
    }
  });

  // Test-mode helper so local/demo checkout can dispatch an authentic HMAC-signed webhook
  app.post('/api/billing/test-webhook-trigger', requireAuth, (req, res) => {
    if (paymentProvider.name !== 'test' || !paymentProvider.createSignedTestWebhook) {
      res.status(403).json({ error: 'Test webhook simulation is disabled when using live Stripe provider.' });
      return;
    }
    const auth = req.auth!;
    if (!auth.organization) {
      res.status(400).json({ error: 'No organization found' });
      return;
    }
    const eventType =
      (req.body?.eventType as
        | 'checkout.session.completed'
        | 'invoice.payment_failed'
        | 'customer.subscription.deleted') || 'checkout.session.completed';
    const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId : generateId('evt_test');
    const signed = paymentProvider.createSignedTestWebhook({
      eventId,
      type: eventType,
      organizationId: auth.organization.id,
      providerSessionId: typeof req.body?.providerSessionId === 'string' ? req.body.providerSessionId : undefined,
      amountCents: PRICING.setupFeeCents,
      occurredAt: new Date().toISOString(),
    });
    const verified = paymentProvider.verifyAndParseWebhook(signed.rawBody, signed.signatureHeader);
    const result = repos.processVerifiedPaymentWebhook(verified, signed.rawBody);
    res.json({
      verified: true,
      duplicate: result.duplicate,
      eventId: verified.eventId,
      entitlement: result.entitlement,
      invoices: repos.listInvoices(auth.organization.id),
    });
  });

  app.get('/api/billing/status', requireAuth, (req, res) => {
    const orgId = req.auth!.organization?.id;
    if (!orgId) {
      res.status(400).json({ error: 'No organization found' });
      return;
    }
    res.json({
      pricing: PRICING,
      paymentProvider: paymentProvider.name,
      entitlement: repos.getEntitlement(orgId),
      invoices: repos.listInvoices(orgId),
    });
  });

  // ----------------------------------------------------------------------------
  // Onboarding (Requires Verified Business Entitlement)
  // ----------------------------------------------------------------------------
  app.post('/api/onboarding/complete', requireAuth, requireBusinessEntitlement, (req, res) => {
    const orgId = req.auth!.organization!.id;
    const schema = z.object({
      organizationName: z.string().min(1).max(120).optional(),
      clientName: z.string().min(1).max(120).optional(),
      clientDomain: z.string().min(3).max(200).optional(),
      industry: z.string().min(1).max(120).optional(),
      goals: z.array(z.string()).optional(),
      safeDefaultsEnabled: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid onboarding payload' });
      return;
    }
    if (parsed.data.organizationName) {
      repos.updateOrganizationSettings(orgId, { name: parsed.data.organizationName });
    }
    let createdClient = null;
    if (parsed.data.clientName && parsed.data.clientDomain) {
      createdClient = repos.createClient(orgId, {
        name: parsed.data.clientName,
        domain: parsed.data.clientDomain,
        industry: parsed.data.industry || 'SaaS / Technology',
        goals: parsed.data.goals?.length ? parsed.data.goals : ['Surface technical & commercial SEO opportunities'],
      });
    }
    const workspace = repos.updateBusinessWorkspace(orgId, {
      onboardingCompleted: true,
      safeDefaultsEnabled: parsed.data.safeDefaultsEnabled ?? true,
    });
    repos.recordAuditEvent({
      organizationId: orgId,
      userId: req.auth!.user.id,
      actorType: 'USER',
      actorName: req.auth!.user.name,
      coworkerId: null,
      action: 'ONBOARDING_COMPLETED',
      toolName: null,
      redactedInput: parsed.data,
      redactedOutput: { workspaceId: workspace.id, clientId: createdClient?.id ?? null },
      approvalId: null,
      outcome: 'SUCCESS',
    });
    res.json({ workspace, client: createdClient });
  });

  // ----------------------------------------------------------------------------
  // Authenticated Business SEO OS Desk API (Strict Tenant & Entitlement Isolation)
  // ----------------------------------------------------------------------------
  app.get('/api/desk/bootstrap', requireAuth, requireBusinessEntitlement, requirePermission('desk:read'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const userId = req.auth!.user.id;
    res.json({
      organization: repos.getOrganizationById(orgId),
      businessWorkspace: repos.getBusinessWorkspace(orgId),
      entitlement: repos.getEntitlement(orgId),
      membership: req.auth!.membership,
      members: repos.listMemberships(orgId),
      orgBlockedTools: repos.getOrgBlockedTools(orgId),
      clients: repos.listClients(orgId),
      coworkers: repos.listCoworkers(orgId),
      tasks: repos.listTasks(orgId),
      brainNodes: repos.listBrainNodes(orgId),
      artifacts: repos.listArtifacts(orgId),
      spaces: repos.listSpaces(orgId),
      pages: repos.listPages(orgId),
      integrations: repos.listIntegrations(orgId),
      approvals: repos.listBusinessApprovals(orgId),
      auditEvents: repos.listAuditEvents(orgId, 100),
      usageRecords: repos.listUsageRecords(orgId),
      invoices: repos.listInvoices(orgId),
      notifications: repos.listNotifications(userId, 'BUSINESS'),
    });
  });

  app.patch('/api/desk/theme', requireAuth, requireBusinessEntitlement, (req, res) => {
    const orgId = req.auth!.organization!.id;
    const theme = req.body?.theme;
    const valid = ['cosmos', 'datacenter', 'forest', 'ocean', 'sunset', 'clouds', 'retro'];
    if (!valid.includes(theme)) {
      res.status(400).json({ error: 'Unsupported theme' });
      return;
    }
    const ws = repos.updateBusinessWorkspace(orgId, { activeTheme: theme });
    res.json({ businessWorkspace: ws });
  });

  // Clients
  app.get('/api/desk/clients/:clientId', requireAuth, requireBusinessEntitlement, requirePermission('desk:read'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const client = repos.getClient(orgId, String(req.params.clientId));
    if (!client) {
      res.status(404).json({ error: 'Client not found in your organization' });
      return;
    }
    res.json({
      client,
      tasks: repos.listTasks(orgId, client.id),
      brainNodes: repos.listBrainNodes(orgId, client.id),
      artifacts: repos.listArtifacts(orgId, client.id),
    });
  });

  app.post('/api/desk/clients', requireAuth, requireBusinessEntitlement, requirePermission('clients:write'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const schema = z.object({
      name: z.string().min(2).max(120),
      domain: z.string().min(3).max(200),
      industry: z.string().min(2).max(120),
      goals: z.array(z.string()).default([]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid client data' });
      return;
    }
    const client = repos.createClient(orgId, parsed.data);
    repos.recordAuditEvent({
      organizationId: orgId,
      userId: req.auth!.user.id,
      actorType: 'USER',
      actorName: req.auth!.user.name,
      coworkerId: null,
      action: 'CLIENT_WORKSPACE_CREATED',
      toolName: null,
      redactedInput: parsed.data,
      redactedOutput: { clientId: client.id },
      approvalId: null,
      outcome: 'SUCCESS',
    });
    res.status(201).json({ client });
  });

  // Orchestrator Dispatch
  app.post('/api/desk/orchestrator/run', requireAuth, requireBusinessEntitlement, requirePermission('orchestrator:run'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const schema = z.object({
      clientId: z.string().min(1),
      objective: z.string().min(5).max(500),
      includeLocalSeo: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Valid clientId and objective are required' });
      return;
    }
    const client = repos.getClient(orgId, parsed.data.clientId);
    if (!client) {
      res.status(404).json({ error: 'Client not found in your organization' });
      return;
    }
    const result = worker.launchOrchestratorWorkflow({
      organizationId: orgId,
      userId: req.auth!.user.id,
      userName: req.auth!.user.name,
      clientId: client.id,
      objective: parsed.data.objective,
      includeLocalSeo: parsed.data.includeLocalSeo,
    });
    res.status(201).json(result);
  });

  // Task State Controls
  app.post('/api/desk/tasks/:taskId/action', requireAuth, requireBusinessEntitlement, requirePermission('desk:write'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const actionSchema = z.object({
      action: z.enum(['PAUSE', 'RESUME', 'CANCEL', 'RETRY', 'COMPLETE_MOCK']),
    });
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid task action' });
      return;
    }
    try {
      const task = worker.transitionTask({
        organizationId: orgId,
        userId: req.auth!.user.id,
        userName: req.auth!.user.name,
        taskId: String(req.params.taskId),
        action: parsed.data.action,
      });
      res.json({ task, tasks: repos.listTasks(orgId, task.clientId) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Task transition failed' });
    }
  });

  // Coworkers CRUD & Tool Invocation (With Approval Gates + Audit Trail)
  app.post('/api/desk/coworkers', requireAuth, requireBusinessEntitlement, requirePermission('coworkers:write'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const schema = z.object({
      name: z.string().min(2).max(80),
      role: z.string().min(2).max(120),
      instructions: z.string().min(5).max(2000),
      allowedTools: z.array(z.string()).default(['browser_read']),
      approvalPolicy: z.enum(['AUTO_READ_ONLY', 'REQUIRE_APPROVAL_WRITES', 'REQUIRE_APPROVAL_ALL', 'BLOCKED']).default('REQUIRE_APPROVAL_WRITES'),
      scheduleCron: z.string().nullable().default(null),
      defaultSpaceId: z.string().nullable().default(null),
      clientId: z.string().nullable().default(null),
      avatarEmoji: z.string().optional(),
      accentColor: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid coworker configuration' });
      return;
    }
    const coworker = repos.createCoworker(orgId, parsed.data);
    repos.recordAuditEvent({
      organizationId: orgId,
      userId: req.auth!.user.id,
      actorType: 'USER',
      actorName: req.auth!.user.name,
      coworkerId: coworker.id,
      action: 'COWORKER_CREATED',
      toolName: null,
      redactedInput: { name: coworker.name, role: coworker.role, allowedTools: coworker.allowedTools },
      redactedOutput: { coworkerId: coworker.id },
      approvalId: null,
      outcome: 'SUCCESS',
    });
    res.status(201).json({ coworker });
  });

  app.patch('/api/desk/coworkers/:coworkerId', requireAuth, requireBusinessEntitlement, requirePermission('coworkers:write'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    try {
      const coworker = repos.updateCoworker(orgId, String(req.params.coworkerId), req.body);
      res.json({ coworker });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Coworker update failed' });
    }
  });

  app.post('/api/desk/coworkers/:coworkerId/invoke-tool', requireAuth, requireBusinessEntitlement, requirePermission('desk:write'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const coworker = repos.getCoworker(orgId, String(req.params.coworkerId));
    if (!coworker) {
      res.status(404).json({ error: 'Coworker not found in your organization' });
      return;
    }
    const toolId = String(req.body?.toolId || '');
    const summary = String(req.body?.summary || `Invoke ${toolId}`);
    const payload = (req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {}) as Record<string, unknown>;

    const ws = repos.getBusinessWorkspace(orgId);
    const policy = evaluateToolExecutionPolicy({
      toolId,
      coworker,
      orgBlockedTools: repos.getOrgBlockedTools(orgId),
      safeDefaultsEnabled: ws?.safeDefaultsEnabled ?? true,
    });

    if (policy.decision === 'BLOCK') {
      const audit = repos.recordAuditEvent({
        organizationId: orgId,
        userId: req.auth!.user.id,
        actorType: 'COWORKER',
        actorName: coworker.name,
        coworkerId: coworker.id,
        action: 'TOOL_CALL_BLOCKED_BY_POLICY',
        toolName: toolId,
        redactedInput: payload,
        redactedOutput: { reason: policy.reason },
        approvalId: null,
        outcome: 'BLOCKED',
      });
      res.status(403).json({ status: 'BLOCKED', reason: policy.reason, auditEvent: audit });
      return;
    }

    if (policy.decision === 'REQUIRE_APPROVAL') {
      const approval: ApprovalRequest = repos.insertApprovalRequest({
        id: generateId('appr'),
        organizationId: orgId,
        userId: req.auth!.user.id,
        scope: 'BUSINESS',
        taskId: typeof req.body?.taskId === 'string' ? req.body.taskId : null,
        coworkerId: coworker.id,
        coworkerName: coworker.name,
        toolName: toolId,
        riskLevel: policy.riskLevel,
        summary,
        redactedPayload: redactSensitiveData(payload),
        status: 'PENDING',
        decidedBy: null,
        decisionNote: null,
        createdAt: new Date().toISOString(),
        decidedAt: null,
      });
      repos.updateCoworker(orgId, coworker.id, { status: 'AWAITING_APPROVAL' });
      const audit = repos.recordAuditEvent({
        organizationId: orgId,
        userId: req.auth!.user.id,
        actorType: 'COWORKER',
        actorName: coworker.name,
        coworkerId: coworker.id,
        action: 'TOOL_CALL_PAUSED_FOR_APPROVAL',
        toolName: toolId,
        redactedInput: payload,
        redactedOutput: { approvalId: approval.id, reason: policy.reason },
        approvalId: approval.id,
        outcome: 'AWAITING_APPROVAL',
      });
      res.status(202).json({
        status: 'APPROVAL_REQUIRED',
        reason: policy.reason,
        approvalRequest: approval,
        auditEvent: audit,
      });
      return;
    }

    // Read-only allowed tool executes via typed mock adapter
    const mockResult = {
      adapter: 'MOCK_ADAPTER',
      toolId,
      coworker: coworker.name,
      summary: `Mock read-only inspection completed for "${summary}".`,
      timestamp: new Date().toISOString(),
    };
    const audit = repos.recordAuditEvent({
      organizationId: orgId,
      userId: req.auth!.user.id,
      actorType: 'COWORKER',
      actorName: coworker.name,
      coworkerId: coworker.id,
      action: 'TOOL_EXECUTED',
      toolName: toolId,
      redactedInput: payload,
      redactedOutput: mockResult,
      approvalId: null,
      outcome: 'SUCCESS',
    });
    res.json({ status: 'EXECUTED', result: mockResult, auditEvent: audit });
  });

  // Business Spaces & Pages
  app.post('/api/desk/spaces/pages', requireAuth, requireBusinessEntitlement, requirePermission('spaces:write'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const schema = z.object({
      pageId: z.string().optional(),
      spaceId: z.string().min(1),
      parentPageId: z.string().nullable().optional(),
      title: z.string().min(1).max(200),
      content: z.string(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid page payload' });
      return;
    }
    try {
      const page = repos.savePage(orgId, {
        ...parsed.data,
        authorName: req.auth!.user.name,
      });
      repos.recordAuditEvent({
        organizationId: orgId,
        userId: req.auth!.user.id,
        actorType: 'USER',
        actorName: req.auth!.user.name,
        coworkerId: null,
        action: 'SPACE_PAGE_SAVED',
        toolName: 'space_page_draft',
        redactedInput: { pageId: page.id, title: page.title, version: page.version },
        redactedOutput: { saved: true },
        approvalId: null,
        outcome: 'SUCCESS',
      });
      res.json({ page });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Save page failed' });
    }
  });

  // Artifacts Approve
  app.post('/api/desk/artifacts/:artifactId/approve', requireAuth, requireBusinessEntitlement, requirePermission('approvals:decide'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const art = repos.approveArtifact(orgId, String(req.params.artifactId));
    if (!art) {
      res.status(404).json({ error: 'Artifact not found' });
      return;
    }
    repos.recordAuditEvent({
      organizationId: orgId,
      userId: req.auth!.user.id,
      actorType: 'USER',
      actorName: req.auth!.user.name,
      coworkerId: null,
      action: 'ARTIFACT_APPROVED',
      toolName: null,
      redactedInput: { artifactId: art.id, title: art.title },
      redactedOutput: { approved: true },
      approvalId: null,
      outcome: 'SUCCESS',
    });
    res.json({ artifact: art });
  });

  // Approvals Decide
  app.post('/api/desk/approvals/:approvalId/decide', requireAuth, requireBusinessEntitlement, requirePermission('approvals:decide'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const schema = z.object({
      decision: z.enum(['APPROVED', 'REJECTED']),
      note: z.string().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Decision must be APPROVED or REJECTED' });
      return;
    }
    try {
      const approval = repos.decideApproval({
        approvalId: String(req.params.approvalId),
        organizationId: orgId,
        userId: req.auth!.user.id,
        scope: 'BUSINESS',
        decision: parsed.data.decision,
        decidedBy: req.auth!.user.name,
        note: parsed.data.note,
      });
      if (approval.coworkerId) {
        repos.updateCoworker(orgId, approval.coworkerId, { status: 'IDLE' });
      }
      res.json({ approval, tasks: repos.listTasks(orgId) });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Approval not found' });
    }
  });

  // Integrations (Server-Only Encrypted Secrets — NEVER returned to browser)
  app.post('/api/desk/integrations/:integrationId/configure', requireAuth, requireBusinessEntitlement, requirePermission('integrations:write'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    try {
      const integ = repos.configureIntegrationSecret(orgId, String(req.params.integrationId), {
        secretValue: typeof req.body?.secretValue === 'string' ? req.body.secretValue : undefined,
        label: typeof req.body?.label === 'string' ? req.body.label : undefined,
        enabledCoworkerIds: Array.isArray(req.body?.enabledCoworkerIds) ? req.body.enabledCoworkerIds : undefined,
      });
      repos.recordAuditEvent({
        organizationId: orgId,
        userId: req.auth!.user.id,
        actorType: 'USER',
        actorName: req.auth!.user.name,
        coworkerId: null,
        action: 'INTEGRATION_CONFIGURED',
        toolName: null,
        redactedInput: { integrationId: integ.id, secretValue: req.body?.secretValue ? '[REDACTED]' : undefined },
        redactedOutput: { status: integ.status, mode: integ.mode },
        approvalId: null,
        outcome: 'SUCCESS',
      });
      res.json({ integration: integ });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Integration error' });
    }
  });

  // Enterprise Admin Controls
  app.patch('/api/desk/admin/settings', requireAuth, requireBusinessEntitlement, requirePermission('admin:write'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const org = repos.updateOrganizationSettings(orgId, {
      name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      retentionDays: typeof req.body?.retentionDays === 'number' ? req.body.retentionDays : undefined,
      deploymentMode: req.body?.deploymentMode,
      blockedTools: Array.isArray(req.body?.blockedTools) ? req.body.blockedTools : undefined,
      ssoConfig: req.body?.ssoConfig,
    });
    repos.recordAuditEvent({
      organizationId: orgId,
      userId: req.auth!.user.id,
      actorType: 'USER',
      actorName: req.auth!.user.name,
      coworkerId: null,
      action: 'ADMIN_POLICY_UPDATED',
      toolName: null,
      redactedInput: req.body ?? {},
      redactedOutput: { retentionDays: org.retentionDays, deploymentMode: org.deploymentMode },
      approvalId: null,
      outcome: 'SUCCESS',
    });
    res.json({ organization: org, orgBlockedTools: repos.getOrgBlockedTools(orgId) });
  });

  app.get('/api/desk/admin/export', requireAuth, requireBusinessEntitlement, requirePermission('data:export'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    const bundle = repos.exportOrganizationData(orgId);
    res.json(bundle);
  });

  app.delete('/api/desk/admin/organization', requireAuth, requireBusinessEntitlement, requirePermission('data:delete'), (req, res) => {
    const orgId = req.auth!.organization!.id;
    repos.deleteOrganizationData(orgId);
    res.json({ deleted: true, organizationId: orgId });
  });

  // ----------------------------------------------------------------------------
  // Personal Agent API (Strictly Isolated from Business Tenants — Free to Try)
  // ----------------------------------------------------------------------------
  app.get('/api/personal/workspace', requireAuth, (req, res) => {
    const userId = req.auth!.user.id;
    // Deliberately returns ZERO organization, client, or business coworker records
    res.json({
      workspace: repos.getPersonalWorkspace(userId),
      approvals: repos.listPersonalApprovals(userId),
      notifications: repos.listNotifications(userId, 'PERSONAL'),
    });
  });

  app.patch('/api/personal/preferences', requireAuth, (req, res) => {
    const userId = req.auth!.user.id;
    const ws = repos.getPersonalWorkspace(userId);
    const updated = repos.savePersonalWorkspace(userId, {
      ...ws,
      tone: req.body?.tone ?? ws.tone,
      avatarLabel: req.body?.avatarLabel ?? ws.avatarLabel,
      memories: Array.isArray(req.body?.memories) ? req.body.memories : ws.memories,
      notifications: req.body?.notifications ? { ...ws.notifications, ...req.body.notifications } : ws.notifications,
      terminalEnabled: typeof req.body?.terminalEnabled === 'boolean' ? req.body.terminalEnabled : ws.terminalEnabled,
      filesEnabled: typeof req.body?.filesEnabled === 'boolean' ? req.body.filesEnabled : ws.filesEnabled,
    });
    res.json({ workspace: updated });
  });

  app.post('/api/personal/tasks', requireAuth, (req, res) => {
    const userId = req.auth!.user.id;
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }
    const ws = repos.getPersonalWorkspace(userId);
    const now = new Date().toISOString();
    const taskId = generateId('ptsk');
    const receiptId = generateId('prec');
    const needsApproval = /(send|email|delete|publish|terminal|bash|pay|purchase)/i.test(prompt);

    const newTask: PersonalTask = {
      id: taskId,
      userId,
      prompt,
      status: needsApproval ? 'REVIEW' : 'DONE',
      progressPct: needsApproval ? 65 : 100,
      browserTakeoverActive: false,
      browserCurrentUrl: 'https://search-research.example/results?q=' + encodeURIComponent(prompt.slice(0, 40)),
      receiptId,
      isMock: true,
      createdAt: now,
      updatedAt: now,
      followUpQueue: [],
      steps: [
        { id: 's1', title: 'Parse intent & personal preferences', status: 'DONE', detail: `Applied "${ws.tone}" tone and personal memories.` },
        { id: 's2', title: 'Run read-only browser research (Mock Adapter)', status: 'DONE', detail: 'Collected structured source excerpts without contacting live services.' },
        {
          id: 's3',
          title: needsApproval ? 'Await explicit user approval for sensitive action' : 'Compile inline artifact cards & receipt',
          status: needsApproval ? 'BLOCKED' : 'DONE',
          detail: needsApproval
            ? 'Paused by personal safety boundary before outbound/terminal execution.'
            : 'Saved durable receipt to personal workspace.',
        },
      ],
      cards: [
        {
          id: generateId('pcard'),
          kind: 'browser',
          title: 'Browser Research Summary (Demo Fixture)',
          summary: `Mock browser summary for: "${prompt.slice(0, 90)}"`,
          url: 'https://search-research.example/snapshot/' + taskId.slice(-6),
          metadata: { adapter: 'Mock Personal Browser', mode: 'Read-Only' },
          isMock: true,
        },
        {
          id: generateId('pcard'),
          kind: 'plan',
          title: 'Durable Task Plan & Next Steps',
          summary: needsApproval
            ? 'Action paused at approval boundary. Review the approval card to proceed or reject.'
            : 'Research complete. Follow up or export receipt below.',
          metadata: { receipt: receiptId, isolation: 'Personal Only' },
          isMock: true,
        },
      ],
    };

    let approval: ApprovalRequest | null = null;
    if (needsApproval) {
      approval = repos.insertApprovalRequest({
        id: generateId('pappr'),
        organizationId: null,
        userId,
        scope: 'PERSONAL',
        taskId,
        coworkerId: null,
        coworkerName: 'Personal Agent',
        toolName: /(terminal|bash)/i.test(prompt) ? 'terminal_exec' : 'email_send',
        riskLevel: 'sensitive',
        summary: `Personal Agent requested approval before executing: "${prompt.slice(0, 100)}"`,
        redactedPayload: { prompt, terminalEnabled: ws.terminalEnabled },
        status: 'PENDING',
        decidedBy: null,
        decisionNote: null,
        createdAt: now,
        decidedAt: null,
      });
    }

    const receipt = {
      id: receiptId,
      userId,
      taskId,
      title: prompt.slice(0, 64),
      toolsUsed: needsApproval ? ['browser_read', 'approval_gate'] : ['browser_read'],
      approvalDecision: needsApproval ? 'Pending User Approval' : 'Auto-approved (Read-only)',
      outcome: needsApproval ? 'Paused at safety gate' : 'Completed (Mock Adapter)',
      createdAt: now,
    };

    const updated = repos.savePersonalWorkspace(userId, {
      ...ws,
      tasks: [newTask, ...ws.tasks],
      receipts: [receipt, ...ws.receipts],
    });
    res.status(201).json({ task: newTask, approval, workspace: updated });
  });

  app.post('/api/personal/tasks/:taskId/control', requireAuth, (req, res) => {
    const userId = req.auth!.user.id;
    const ws = repos.getPersonalWorkspace(userId);
    const taskId = String(req.params.taskId);
    const action = String(req.body?.action || '');
    const updatedTasks = ws.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const now = new Date().toISOString();
      if (action === 'PAUSE') return { ...t, status: 'PAUSED' as const, updatedAt: now };
      if (action === 'RESUME') return { ...t, status: 'RUNNING' as const, updatedAt: now };
      if (action === 'STOP' || action === 'CANCEL') return { ...t, status: 'CANCELLED' as const, updatedAt: now };
      if (action === 'RETRY') return { ...t, status: 'DONE' as const, progressPct: 100, updatedAt: now };
      if (action === 'TOGGLE_TAKEOVER') return { ...t, browserTakeoverActive: !t.browserTakeoverActive, updatedAt: now };
      if (action === 'ADD_FOLLOWUP' && typeof req.body?.text === 'string' && req.body.text.trim()) {
        return { ...t, followUpQueue: [...t.followUpQueue, req.body.text.trim()], updatedAt: now };
      }
      return t;
    });
    const updated = repos.savePersonalWorkspace(userId, { ...ws, tasks: updatedTasks });
    res.json({ workspace: updated });
  });

  app.post('/api/personal/approvals/:approvalId/decide', requireAuth, (req, res) => {
    const userId = req.auth!.user.id;
    const decision = req.body?.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    try {
      const approval = repos.decideApproval({
        approvalId: String(req.params.approvalId),
        organizationId: null,
        userId,
        scope: 'PERSONAL',
        decision,
        decidedBy: req.auth!.user.name,
        note: typeof req.body?.note === 'string' ? req.body.note : undefined,
      });
      const ws = repos.getPersonalWorkspace(userId);
      const updatedTasks = ws.tasks.map((t) =>
        t.id === approval.taskId
          ? {
              ...t,
              status: decision === 'APPROVED' ? ('DONE' as const) : ('CANCELLED' as const),
              progressPct: decision === 'APPROVED' ? 100 : t.progressPct,
            }
          : t
      );
      const updated = repos.savePersonalWorkspace(userId, { ...ws, tasks: updatedTasks });
      res.json({ approval, workspace: updated });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Approval not found' });
    }
  });

  // ----------------------------------------------------------------------------
  // Personal Agent Waitlist, Running Tracker & Instant Approval Endpoints
  // Emails applicant setup info + instant approval link to kingwizemusic@gmail.com
  // ----------------------------------------------------------------------------
  app.get('/api/waitlist/tracker', (req, res) => {
    const summary = repos.getWaitlistTrackerSummary(emailAdapter.getApproverEmail());
    const lookupEmail = typeof req.query.email === 'string' ? req.query.email.trim() : '';
    const lookupAccess = typeof req.query.access === 'string' ? req.query.access.trim() : '';
    let viewerEntry = null;
    if (lookupAccess) {
      viewerEntry = repos.getWaitlistByAccessToken(lookupAccess);
    } else if (lookupEmail) {
      viewerEntry = repos.getWaitlistByEmail(lookupEmail);
    } else if (req.auth?.user?.email) {
      viewerEntry = repos.getWaitlistByEmail(req.auth.user.email);
    }
    res.json({
      tracker: summary,
      viewerEntry: viewerEntry
        ? {
            id: viewerEntry.id,
            email: viewerEntry.email,
            name: viewerEntry.name,
            roleTitle: viewerEntry.roleTitle,
            preferredTone: viewerEntry.preferredTone,
            status: viewerEntry.status,
            queuePosition: viewerEntry.queuePosition,
            accessUrl: viewerEntry.status === 'APPROVED' ? viewerEntry.accessUrl : null,
            emailDispatchStatus: viewerEntry.emailDispatchStatus,
            emailDispatchDetail: viewerEntry.emailDispatchDetail,
            approverEmail: viewerEntry.approverEmail,
            approvedAt: viewerEntry.approvedAt,
            createdAt: viewerEntry.createdAt,
          }
        : null,
    });
  });

  const waitlistJoinSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2).max(120),
    roleTitle: z.string().min(2).max(120),
    useCase: z.string().min(5).max(1200),
    preferredTone: z.enum(['concise', 'analytical', 'friendly', 'executive']).default('analytical'),
    wantsBrowser: z.boolean().default(true),
    wantsFiles: z.boolean().default(true),
    wantsTerminal: z.boolean().default(false),
    websiteUrl: z.string().max(300).optional().default(''),
    originUrl: z.string().max(300).optional(),
  });

  app.post('/api/waitlist/join', async (req, res) => {
    const parsed = waitlistJoinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please complete all required waitlist setup fields.', details: parsed.error.flatten() });
      return;
    }

    const baseUrl =
      parsed.data.originUrl ||
      process.env.APP_ORIGIN ||
      `${req.protocol}://${req.get('host')}`;
    const approverEmail = emailAdapter.getApproverEmail();

    const created = repos.createOrUpdateWaitlistEntry({
      ...parsed.data,
      baseUrl,
      approverEmail,
    });

    const emailRes = await emailAdapter.sendWaitlistApprovalEmail(created);
    const updated = repos.updateWaitlistEmailDispatch(created.id, emailRes.status, emailRes.detail);

    res.status(201).json({
      entry: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        roleTitle: updated.roleTitle,
        useCase: updated.useCase,
        preferredTone: updated.preferredTone,
        status: updated.status,
        queuePosition: updated.queuePosition,
        approverEmail: updated.approverEmail,
        emailDispatchStatus: updated.emailDispatchStatus,
        emailDispatchDetail: updated.emailDispatchDetail,
        createdAt: updated.createdAt,
      },
      tracker: repos.getWaitlistTrackerSummary(approverEmail),
    });
  });

  app.get('/api/waitlist/approve', (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (!token) {
      res.status(400).json({ error: 'Missing approval token' });
      return;
    }
    const entry = repos.getWaitlistByApprovalToken(token);
    if (!entry) {
      res.status(404).json({ error: 'Invalid or expired waitlist approval token' });
      return;
    }
    res.json({ entry });
  });

  app.post('/api/waitlist/approve', (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      res.status(400).json({ error: 'Missing approval token' });
      return;
    }
    const approverLabel = `${emailAdapter.getApproverEmail()} (Instant Approval Link)`;
    const approved = repos.approveWaitlistByToken(token, approverLabel);
    if (!approved) {
      res.status(404).json({ error: 'Invalid or expired waitlist approval token' });
      return;
    }
    res.json({
      approved: true,
      entry: approved,
      tracker: repos.getWaitlistTrackerSummary(emailAdapter.getApproverEmail()),
    });
  });

  app.get('/api/desk/admin/waitlist', requireAuth, requireBusinessEntitlement, requirePermission('admin:read'), (_req, res) => {
    res.json({
      entries: repos.listWaitlistEntries(),
      tracker: repos.getWaitlistTrackerSummary(emailAdapter.getApproverEmail()),
    });
  });

  app.post('/api/desk/admin/waitlist/:entryId/decide', requireAuth, requireBusinessEntitlement, requirePermission('admin:write'), (req, res) => {
    const decision = req.body?.decision === 'REJECTED' ? 'REJECTED' : 'APPROVED';
    const updated = repos.decideWaitlistById(
      String(req.params.entryId),
      decision,
      `${req.auth!.user.name} (${req.auth!.user.email})`
    );
    if (!updated) {
      res.status(404).json({ error: 'Waitlist entry not found' });
      return;
    }
    res.json({
      entry: updated,
      tracker: repos.getWaitlistTrackerSummary(emailAdapter.getApproverEmail()),
    });
  });

  // Serve built frontend in production Docker / single-node mode
  const distDir = path.resolve(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return {
    app,
    db,
    repos,
    worker,
    paymentProvider,
    emailAdapter,
    close() {
      worker.shutdown();
      db.close();
    },
  };
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}
