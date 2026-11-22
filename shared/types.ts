// ==============================================================================
// SEO OS AI Workbench — Shared Domain Types & AG-UI Event Contract
// ==============================================================================

export type Role = 'OWNER' | 'ADMIN' | 'STRATEGIST' | 'REVIEWER' | 'VIEWER';

export type ThemeId =
  | 'cosmos'
  | 'datacenter'
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'clouds'
  | 'retro';

export type TaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'REVIEW'
  | 'DONE'
  | 'SKIPPED' // Expected soft skip (e.g. non-applicable specialist)
  | 'BLOCKED' // Dependency or phase-gate block
  | 'FAILED' // Real failure requiring retry/intervention
  | 'CANCELLED';

export type ToolRiskLevel = 'read' | 'write' | 'sensitive' | 'destructive';

export type ApprovalPolicy = 'AUTO_READ_ONLY' | 'REQUIRE_APPROVAL_WRITES' | 'REQUIRE_APPROVAL_ALL' | 'BLOCKED';

export type EntitlementStatus = 'INACTIVE' | 'TRIAL_INCLUDED' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

export type DataMode = 'MOCK_DEMO' | 'LIVE_CONNECTED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  retentionDays: number;
  deploymentMode: 'CLOUD' | 'PRIVATE_CLOUD' | 'KUBERNETES' | 'SELF_HOSTED';
  ssoConfig: {
    provider: 'NONE' | 'OKTA' | 'ENTRA_ID' | 'GOOGLE_SAML';
    scimEnabled: boolean;
    status: 'INTERFACE_READY_UNCONFIGURED';
    issuerUrl?: string;
  };
  createdAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: Role;
  createdAt: string;
}

export interface BusinessWorkspace {
  id: string;
  organizationId: string;
  name: string;
  activeTheme: ThemeId;
  onboardingCompleted: boolean;
  safeDefaultsEnabled: boolean;
  createdAt: string;
}

export interface Entitlement {
  id: string;
  organizationId: string;
  planCode: 'BUSINESS_WORKSPACE';
  status: EntitlementStatus;
  setupFeeCents: number;
  monthlyAmountCents: number;
  includedMonths: number;
  setupPaidAt: string | null;
  includedPeriodEndsAt: string | null;
  nextBillingAt: string | null;
  cancelledAt: string | null;
}

export interface InvoiceRecord {
  id: string;
  organizationId: string;
  providerInvoiceId: string;
  description: string;
  amountCents: number;
  status: 'PAID' | 'SCHEDULED' | 'FAILED' | 'VOID';
  issuedAt: string;
  dueAt: string;
}

export interface ClientWorkspace {
  id: string;
  organizationId: string;
  name: string;
  domain: string;
  industry: string;
  goals: string[];
  dataMode: DataMode;
  isDemo: boolean;
  createdAt: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  category: 'seo' | 'browser' | 'files' | 'terminal' | 'comms' | 'mcp' | 'cms';
  description: string;
  risk: ToolRiskLevel;
  defaultApprovalPolicy: ApprovalPolicy;
  requiredPermission: string;
  auditLevel: 'FULL_REDACTED' | 'METADATA_ONLY';
  isMockByDefault: boolean;
}

export interface Coworker {
  id: string;
  organizationId: string;
  clientId: string | null;
  kind: 'SPECIALIST' | 'COWORKER';
  deskKey: string;
  name: string;
  role: string;
  avatarEmoji: string;
  accentColor: string;
  instructions: string;
  allowedTools: string[];
  approvalPolicy: ApprovalPolicy;
  scheduleCron: string | null;
  defaultSpaceId: string | null;
  status: 'IDLE' | 'WORKING' | 'AWAITING_APPROVAL' | 'PAUSED' | 'ERROR';
  isDemo: boolean;
  createdAt: string;
}

export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
  gateType: 'HARD_DEPENDENCY' | 'PHASE_GATE';
}

export interface TaskEvent {
  id: string;
  taskId: string;
  type: AgUiEventType;
  message: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Task {
  id: string;
  organizationId: string;
  clientId: string;
  orchestratorRunId: string | null;
  coworkerId: string;
  deskKey: string;
  title: string;
  description: string;
  phase: 1 | 2 | 3;
  status: TaskStatus;
  statusReason: string;
  progressPct: number;
  isMock: boolean;
  dependsOn: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrainEvidence {
  id: string;
  sourceLabel: string;
  sourceUrl: string;
  capturedAt: string;
  toolName: string;
  snippet: string;
  isMock: boolean;
}

export interface BrainClaim {
  id: string;
  nodeId: string;
  statement: string;
  confidence: number; // 0 to 1
  status: 'VERIFIED' | 'NEEDS_REVIEW' | 'HYPOTHESIS';
  evidence: BrainEvidence[];
  createdAt: string;
}

export interface BrainNode {
  id: string;
  organizationId: string;
  clientId: string;
  label: string;
  category: 'TECHNICAL' | 'KEYWORD' | 'CONTENT' | 'COMPETITOR' | 'SCHEMA' | 'GEO_AI' | 'ANALYTICS';
  summary: string;
  x: number;
  y: number;
  z: number;
  connections: string[];
  claims: BrainClaim[];
  isDemo: boolean;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  organizationId: string;
  clientId: string;
  taskId: string | null;
  title: string;
  kind: 'TECHNICAL_AUDIT' | 'KEYWORD_BRIEF' | 'CONTENT_PLAN' | 'FINAL_RECOMMENDATION' | 'SCHEMA_JSON' | 'EXPORT';
  format: 'markdown' | 'json' | 'csv' | 'html';
  content: string;
  confidence: number;
  provenance: {
    generatedBy: string;
    toolsUsed: string[];
    sourceLinks: string[];
    timestamp: string;
    isMock: boolean;
  };
  approved: boolean;
  createdAt: string;
}

export interface Space {
  id: string;
  organizationId: string;
  clientId: string | null;
  name: string;
  description: string;
  icon: string;
  createdAt: string;
}

export interface PageRevision {
  id: string;
  pageId: string;
  version: number;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface SpacePage {
  id: string;
  organizationId: string;
  spaceId: string;
  parentPageId: string | null;
  title: string;
  content: string;
  version: number;
  updatedBy: string;
  updatedAt: string;
  revisions: PageRevision[];
}

export interface Integration {
  id: string;
  organizationId: string;
  providerKey: string;
  name: string;
  category: 'SEO_DATA' | 'ANALYTICS' | 'MCP_SERVER' | 'CHANNEL' | 'MODEL_PROVIDER';
  status: 'CONNECTED' | 'MOCK_ACTIVE' | 'DISCONNECTED' | 'PLANNED_ROADMAP';
  mode: DataMode;
  credentialConfigured: boolean;
  credentialLabel: string | null; // Never contains raw secret
  allowedScopes: string[];
  enabledCoworkerIds: string[];
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  organizationId: string | null;
  userId: string;
  scope: 'BUSINESS' | 'PERSONAL';
  taskId: string | null;
  coworkerId: string | null;
  coworkerName: string;
  toolName: string;
  riskLevel: ToolRiskLevel;
  summary: string;
  redactedPayload: Record<string, unknown>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy: string | null;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface AuditEvent {
  id: string;
  organizationId: string | null;
  userId: string;
  actorType: 'USER' | 'COWORKER' | 'ORCHESTRATOR' | 'SYSTEM' | 'WEBHOOK';
  actorName: string;
  coworkerId: string | null;
  action: string;
  toolName: string | null;
  redactedInput: Record<string, unknown>;
  redactedOutput: Record<string, unknown>;
  approvalId: string | null;
  outcome: 'SUCCESS' | 'BLOCKED' | 'AWAITING_APPROVAL' | 'FAILED';
  createdAt: string;
}

export interface UsageRecord {
  id: string;
  organizationId: string;
  metric: 'TASKS_RUN' | 'TOKENS_IN_OUT' | 'BROWSER_MINUTES' | 'ARTIFACTS_SAVED';
  quantity: number;
  estimatedCostUsd: number;
  periodLabel: string;
  recordedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  scope: 'PERSONAL' | 'BUSINESS';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// --- Personal Agent Domain (Strictly Isolated from Business Tenants) ---

export interface PersonalPlanStep {
  id: string;
  title: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'PAUSED' | 'BLOCKED' | 'CANCELLED';
  detail: string;
}

export interface PersonalInlineCard {
  id: string;
  kind: 'browser' | 'email' | 'pdf' | 'finance' | 'plan' | 'file';
  title: string;
  summary: string;
  url?: string;
  metadata: Record<string, string>;
  isMock: boolean;
}

export interface PersonalTask {
  id: string;
  userId: string;
  prompt: string;
  status: TaskStatus;
  progressPct: number;
  steps: PersonalPlanStep[];
  cards: PersonalInlineCard[];
  followUpQueue: string[];
  browserTakeoverActive: boolean;
  browserCurrentUrl: string;
  receiptId: string;
  isMock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalGoal {
  id: string;
  userId: string;
  title: string;
  targetDate: string;
  milestones: { id: string; label: string; done: boolean }[];
}

export interface PersonalMonitor {
  id: string;
  userId: string;
  label: string;
  url: string;
  cadence: 'HOURLY' | 'DAILY' | 'WEEKLY';
  enabled: boolean;
  lastCheckedAt: string;
  lastStatus: string;
}

export interface PersonalReceipt {
  id: string;
  userId: string;
  taskId: string;
  title: string;
  toolsUsed: string[];
  approvalDecision: string;
  outcome: string;
  createdAt: string;
}

export type WaitlistStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string;
  roleTitle: string;
  useCase: string;
  preferredTone: 'concise' | 'analytical' | 'friendly' | 'executive';
  wantsBrowser: boolean;
  wantsFiles: boolean;
  wantsTerminal: boolean;
  websiteUrl: string;
  status: WaitlistStatus;
  queuePosition: number;
  approvalToken: string;
  accessToken: string;
  approvalUrl: string;
  accessUrl: string;
  approverEmail: string;
  emailDispatchStatus: 'SENT_LIVE' | 'RELAY_SENT' | 'RELAY_ACTIVATION_PENDING' | 'MOCK_OUTBOX' | 'FAILED';
  emailDispatchDetail: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface WaitlistTrackerSummary {
  approverEmail: string;
  totalJoined: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  recentSignups: {
    id: string;
    initials: string;
    roleTitle: string;
    preferredTone: string;
    status: WaitlistStatus;
    queuePosition: number;
    createdAt: string;
  }[];
}

export interface PersonalWorkspace {
  id: string;
  userId: string;
  tone: 'concise' | 'analytical' | 'friendly' | 'executive';
  avatarLabel: string;
  memories: string[];
  notifications: {
    taskDone: boolean;
    approvalRequired: boolean;
    recurringAlerts: boolean;
  };
  terminalEnabled: boolean;
  filesEnabled: boolean;
  uploadedFiles: { id: string; name: string; sizeLabel: string; preview: string; uploadedAt: string }[];
  tasks: PersonalTask[];
  goals: PersonalGoal[];
  monitors: PersonalMonitor[];
  receipts: PersonalReceipt[];
}

// --- AG-UI Compatible Streaming Event Contract ---
export type AgUiEventType =
  | 'RUN_STARTED'
  | 'STEP_STARTED'
  | 'PLAN_UPDATED'
  | 'TEXT_MESSAGE_CONTENT'
  | 'TOOL_CALL_START'
  | 'APPROVAL_REQUIRED'
  | 'TOOL_CALL_RESULT'
  | 'ARTIFACT_CREATED'
  | 'RUN_PAUSED'
  | 'RUN_FINISHED'
  | 'RUN_ERROR';

export interface AgUiEvent {
  id: string;
  type: AgUiEventType;
  timestamp: string;
  runId: string;
  actor: string;
  data: Record<string, unknown>;
}

// --- OS Window Manager Types ---
export interface OsWindowState {
  id: string;
  title: string;
  kind: 'ARTIFACT' | 'BRAIN_NODE' | 'SPECIALIST' | 'COWORKER_COMPUTER' | 'APPROVAL';
  entityId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

export interface SessionSnapshot {
  authenticated: boolean;
  runtimeMode: 'LIVE_API' | 'STATIC_DEMO_SANDBOX';
  user: User | null;
  organization: Organization | null;
  membership: Membership | null;
  businessWorkspace: BusinessWorkspace | null;
  entitlement: Entitlement | null;
}
