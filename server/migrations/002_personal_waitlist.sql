-- ==============================================================================
-- SEO OS AI Workbench — Migration 002: Personal Agent Waitlist & Instant Approval
-- Stores Personal Agent waitlist applications, running queue positions,
-- single-click approval tokens, and approval email delivery receipts.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  use_case TEXT NOT NULL,
  preferred_tone TEXT NOT NULL DEFAULT 'analytical',
  wants_browser INTEGER NOT NULL DEFAULT 1,
  wants_files INTEGER NOT NULL DEFAULT 1,
  wants_terminal INTEGER NOT NULL DEFAULT 0,
  website_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  queue_position INTEGER NOT NULL,
  approval_token TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL UNIQUE,
  approval_url TEXT NOT NULL,
  access_url TEXT NOT NULL,
  approver_email TEXT NOT NULL,
  email_dispatch_status TEXT NOT NULL DEFAULT 'MOCK_OUTBOX',
  email_dispatch_detail TEXT NOT NULL DEFAULT '',
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(status, queue_position);
CREATE INDEX IF NOT EXISTS idx_waitlist_approval_token ON waitlist_entries(approval_token);
CREATE INDEX IF NOT EXISTS idx_waitlist_access_token ON waitlist_entries(access_token);
