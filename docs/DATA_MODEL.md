# SEO OS AI Workbench — Data Model & Schema Reference

All persistence is managed via SQL migrations (`server/migrations/001_initial_schema.sql`) and accessed exclusively through tenant-aware repository functions in `server/repositories.ts`. Raw SQL queries are never placed in UI components or route handlers.

## Entity Groups (19 Core Domains)

1. **`users`**: Core identity (`id`, `email`, `name`, `password_hash`, `avatar_color`, `created_at`).
2. **`organizations`**: Business tenants (`id`, `name`, `slug`, `retention_days`, `sso_config_json`, `deployment_mode`, `created_at`).
3. **`memberships`**: Org-to-user mapping with RBAC (`id`, `organization_id`, `user_id`, `role` in `OWNER|ADMIN|STRATEGIST|REVIEWER|VIEWER`, `created_at`).
4. **`personal_workspaces`**: Strictly isolated personal tenant (`id`, `user_id`, `tone`, `avatar_label`, `memories_json`, `notifications_json`, `terminal_enabled`, `files_enabled`, `updated_at`), accompanied by `personal_tasks`, `personal_goals`, `personal_monitors`, and `personal_receipts`.
5. **`business_workspaces`**: Main SEO OS workspace per org (`id`, `organization_id`, `name`, `active_theme`, `onboarding_completed`, `safe_defaults_enabled`, `created_at`).
6. **`clients`**: Per-client websites (`id`, `organization_id`, `name`, `domain`, `industry`, `goals_json`, `data_mode`, `created_at`).
7. **`coworkers`**: SEO Specialists & configurable Business AI Coworkers (`id`, `organization_id`, `client_id`, `kind` in `SPECIALIST|COWORKER`, `name`, `role`, `desk_key`, `instructions`, `allowed_tools_json`, `approval_policy`, `schedule_cron`, `default_space_id`, `status`, `created_at`).
8. **`tasks` & `task_events`**: Durable work units (`id`, `organization_id`, `client_id`, `orchestrator_run_id`, `coworker_id`, `title`, `description`, `phase`, `status` in `QUEUED|RUNNING|PAUSED|REVIEW|DONE|SKIPPED|BLOCKED|FAILED|CANCELLED`, `status_reason`, `progress_pct`, `is_mock`, `created_at`, `updated_at`) plus append-only `task_events`.
9. **`task_dependencies` & `phase_gates`**: Explicit DAG edges (`task_id`, `depends_on_task_id`, `gate_type`) enforcing phase-gate progression and distinguishing expected soft skips (`SKIPPED`) from dependency blocks (`BLOCKED`) and real failures (`FAILED`).
10. **`conversations` & `messages`**: Threaded chats for Orchestrator, Coworkers, and Personal Agent (`id`, `organization_id`, `user_id`, `scope`, `target_id`, `title`, `created_at`).
11. **`spaces`, `pages`, & `page_revisions`**: Business Spaces containing nested working documents with autosave and full revision history.
12. **`brain_nodes`, `brain_claims`, & `claim_evidence`**: Per-client second brain storing nodes, structured claims, confidence scores (`0.0–1.0`), source URLs, timestamps, and provenance metadata.
13. **`artifacts`**: Generated reports, technical audits, keyword briefs, content plans, exports, and uploaded files (`id`, `organization_id`, `client_id`, `task_id`, `title`, `kind`, `format`, `content`, `provenance_json`, `is_mock`, `created_at`).
14. **`integrations`**: Connected services & MCP tools (`id`, `organization_id`, `provider_key`, `name`, `category`, `status`, `mode` in `MOCK|LIVE`, `encrypted_credential_ref`, `allowed_scopes_json`, `updated_at`). Raw credentials are encrypted server-side (AES-256-GCM) and never returned to the browser.
15. **`approval_requests` & `approval_decisions`**: Human-in-the-loop gate records (`id`, `organization_id`, `user_id`, `task_id`, `coworker_id`, `tool_name`, `risk_level`, `summary`, `redacted_payload_json`, `status` in `PENDING|APPROVED|REJECTED`, `decided_by`, `decision_note`, `created_at`, `decided_at`).
16. **`audit_events`**: Append-only compliance receipts (`id`, `organization_id`, `user_id`, `actor_type`, `actor_id`, `coworker_id`, `action`, `tool_name`, `redacted_input_json`, `redacted_output_json`, `approval_id`, `outcome`, `created_at`).
17. **`plans` & `entitlements`**: Commercial plans and active tenant access grants (`id`, `organization_id`, `plan_code`, `status` in `INACTIVE|TRIAL_INCLUDED|ACTIVE|PAST_DUE|CANCELLED`, `setup_paid_at`, `included_period_ends_at`, `next_billing_at`, `monthly_amount_cents`).
18. **`payment_customers`, `checkout_sessions`, `subscriptions`, `invoices`, & `webhook_events`**: Full billing ledger with strict `event_id` uniqueness on `webhook_events` for idempotent webhook processing.
19. **`usage_records` & `notifications`**: Token/task/tool usage metering and user notifications.

## Tenant Isolation Guarantees

- Every business table includes `organization_id` and composite indexes starting with `organization_id`.
- Every personal table is keyed by `user_id` / `personal_workspace_id` and has zero foreign keys into `organizations`.
- Repository methods require explicit `orgId` (or `userId` for personal workspace) arguments derived solely from verified server-side sessions.
