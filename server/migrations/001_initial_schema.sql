-- ==============================================================================
-- SEO OS AI Workbench — Migration 001: Complete Multi-Tenant Schema (19 Domains)
-- Every business table carries an explicit organization_id for tenant isolation.
-- Personal workspace tables are strictly keyed by user_id with zero org links.
-- ==============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- 1. Users & Sessions
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#38bdf8',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active_organization_id TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 2. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL DEFAULT 90,
  deployment_mode TEXT NOT NULL DEFAULT 'CLOUD',
  sso_config_json TEXT NOT NULL DEFAULT '{}',
  blocked_tools_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

-- 3. Memberships & Roles
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('OWNER', 'ADMIN', 'STRATEGIST', 'REVIEWER', 'VIEWER')),
  created_at TEXT NOT NULL,
  UNIQUE(organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);

-- 4. Personal Workspaces (Strictly Isolated from Business Tenants)
CREATE TABLE IF NOT EXISTS personal_workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Business Workspaces
CREATE TABLE IF NOT EXISTS business_workspaces (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active_theme TEXT NOT NULL DEFAULT 'cosmos',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  safe_defaults_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- 6. Clients / Sites
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  industry TEXT NOT NULL,
  goals_json TEXT NOT NULL DEFAULT '[]',
  data_mode TEXT NOT NULL DEFAULT 'MOCK_DEMO',
  is_demo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);

-- 7. Coworkers & SEO Specialists
CREATE TABLE IF NOT EXISTS coworkers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK(kind IN ('SPECIALIST', 'COWORKER')),
  desk_key TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '🤖',
  accent_color TEXT NOT NULL DEFAULT '#38bdf8',
  instructions TEXT NOT NULL,
  allowed_tools_json TEXT NOT NULL DEFAULT '[]',
  approval_policy TEXT NOT NULL DEFAULT 'REQUIRE_APPROVAL_WRITES',
  schedule_cron TEXT,
  default_space_id TEXT,
  status TEXT NOT NULL DEFAULT 'IDLE',
  is_demo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coworkers_org ON coworkers(organization_id);

-- 8 & 9. Durable Tasks, Dependencies, Phase Gates & Task Events
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  orchestrator_run_id TEXT,
  coworker_id TEXT NOT NULL,
  desk_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  status_reason TEXT NOT NULL DEFAULT '',
  progress_pct INTEGER NOT NULL DEFAULT 0,
  is_mock INTEGER NOT NULL DEFAULT 1,
  depends_on_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_org_client ON tasks(organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(organization_id, status);

CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  gate_type TEXT NOT NULL DEFAULT 'PHASE_GATE',
  PRIMARY KEY (task_id, depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_events_org_task ON task_events(organization_id, task_id);

-- 10. Conversations / Threads
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK(scope IN ('ORCHESTRATOR', 'COWORKER', 'PERSONAL')),
  target_id TEXT NOT NULL,
  messages_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id, target_id);

-- 11. Spaces, Pages & Revisions
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '📁',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_spaces_org ON spaces(organization_id);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  parent_page_id TEXT REFERENCES pages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL,
  revisions_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pages_org_space ON pages(organization_id, space_id);

-- 12. Brain Nodes, Claims, Evidence & Provenance
CREATE TABLE IF NOT EXISTS brain_nodes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 3.5,
  z REAL NOT NULL DEFAULT 0,
  connections_json TEXT NOT NULL DEFAULT '[]',
  claims_json TEXT NOT NULL DEFAULT '[]',
  is_demo INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_brain_org_client ON brain_nodes(organization_id, client_id);

-- 13. Artifacts / Reports / Files
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  task_id TEXT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'markdown',
  content TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.85,
  provenance_json TEXT NOT NULL DEFAULT '{}',
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_artifacts_org_client ON artifacts(organization_id, client_id);

-- 14. Integrations & Encrypted Credential References (Never Sent to Browser)
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'MOCK_DEMO',
  encrypted_credential TEXT,
  credential_label TEXT,
  allowed_scopes_json TEXT NOT NULL DEFAULT '[]',
  enabled_coworker_ids_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(organization_id);

-- 15. Approval Requests & Decisions
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK(scope IN ('BUSINESS', 'PERSONAL')),
  task_id TEXT,
  coworker_id TEXT,
  coworker_name TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  summary TEXT NOT NULL,
  redacted_payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  decided_by TEXT,
  decision_note TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_approvals_org ON approval_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_user ON approval_requests(user_id, scope);

-- 16. Audit Events (Redacted Receipts)
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  coworker_id TEXT,
  action TEXT NOT NULL,
  tool_name TEXT,
  redacted_input_json TEXT NOT NULL DEFAULT '{}',
  redacted_output_json TEXT NOT NULL DEFAULT '{}',
  approval_id TEXT,
  outcome TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_events(organization_id, created_at);

-- 17. Plans & Entitlements
CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL DEFAULT 'BUSINESS_WORKSPACE',
  status TEXT NOT NULL CHECK(status IN ('INACTIVE', 'TRIAL_INCLUDED', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
  setup_fee_cents INTEGER NOT NULL DEFAULT 99700,
  monthly_amount_cents INTEGER NOT NULL DEFAULT 240000,
  included_months INTEGER NOT NULL DEFAULT 2,
  setup_paid_at TEXT,
  included_period_ends_at TEXT,
  next_billing_at TEXT,
  cancelled_at TEXT
);

-- 18. Payment Customers, Checkout Sessions, Subscriptions, Invoices & Idempotent Webhooks
CREATE TABLE IF NOT EXISTS payment_customers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_customer_id TEXT NOT NULL,
  billing_email TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_session_id TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('OPEN', 'COMPLETED', 'FAILED', 'EXPIRED')),
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_checkout_org ON checkout_sessions(organization_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL,
  trial_end_at TEXT,
  current_period_end_at TEXT,
  monthly_amount_cents INTEGER NOT NULL DEFAULT 240000,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_invoice_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PAID', 'SCHEDULED', 'FAILED', 'VOID')),
  issued_at TEXT NOT NULL,
  due_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

-- 19. Usage Records & Notifications
CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  quantity REAL NOT NULL,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  period_label TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_org ON usage_records(organization_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK(scope IN ('PERSONAL', 'BUSINESS')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
