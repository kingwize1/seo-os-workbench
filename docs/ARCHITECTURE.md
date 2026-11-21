# SEO OS AI Workbench — Architecture Proposal & Reference Assessment

## 1. Short Architecture Proposal

**SEO OS AI Workbench** is a unified, multi-tenant SaaS operating system whose primary desk, shell, and visual language are built around the SEO OS 3D spatial office metaphor. Rather than presenting four separate dashboards, the Personal Agent path, SEO Specialist Desks, Business AI Coworkers, and Enterprise Governance plane operate as cohesive modules inside one modular 7-layer architecture:

1. **Presentation Layer (`src/`)**: Responsive React 19 + TypeScript application featuring the Three.js WebGL spatial SEO OS desk (Orchestrator Dais, 9 Specialist Desks, AI Coworker pods, overhead Knowledge Brain Chandelier, and 7 switchable office themes), an OS-style draggable/resizable window manager, collapsible Task Feed, Personal Agent workspace, Business Spaces editor, and an accessible non-3D 2D fallback / reduced-motion mode.
2. **Identity & Tenancy Layer (`server/middleware.ts`, `server/crypto.ts`, `server/repositories.ts`)**: Server-side session cookies, scrypt password hashing, explicit `organizationId` / `userId` tenant scoping on every repository query and background job, RBAC (`OWNER`, `ADMIN`, `STRATEGIST`, `REVIEWER`, `VIEWER`), strict isolation between Personal Workspaces and Business Tenants, and entitlement guards.
3. **Orchestration Layer (`shared/stateMachine.ts`, `server/worker.ts`)**: Durable multi-phase task engine supporting `QUEUED`, `RUNNING`, `PAUSED`, `REVIEW`, `DONE`, `SKIPPED` (expected soft skips), `BLOCKED` (dependency/phase gate blocks), `FAILED` (real failures), and `CANCELLED` states, with retry, pause/resume/cancel controls, approval gates, and startup recovery for interrupted jobs.
4. **Agent Runtime Layer (`server/agentRuntime.ts`)**: Provider-neutral runtime implementing an AG-UI-compatible event stream (`RUN_STARTED`, `STEP_STARTED`, `PLAN_UPDATED`, `TOOL_CALL_START`, `APPROVAL_REQUIRED`, `TOOL_CALL_RESULT`, `ARTIFACT_CREATED`, `RUN_FINISHED`, `RUN_ERROR`) separating model/provider adapters from business logic.
5. **Tools & Integrations Layer (`shared/constants.ts`, `shared/policyEngine.ts`)**: Declarative tool registry where every tool declares required permissions, read/write risk (`read`, `write`, `sensitive`, `destructive`), approval policy, and audit behavior. Mock adapters are clearly typed and badged in the UI whenever live credentials are not configured.
6. **Knowledge & Artifact Layer (`server/repositories.ts`)**: Per-client Knowledge Brain storing structured nodes, claims, confidence scores, timestamps, source URLs, and provenance chains alongside Business Spaces (nested pages with autosave and revision history) and OS-windowed multi-format artifacts.
7. **Governance & Billing Layer (`server/paymentAdapter.ts`, `shared/policyEngine.ts`)**: Payment provider abstraction supporting Stripe Checkout + Test Mode with HMAC-signed, idempotent webhook verification, modeling the exact commercial offer (**$997 one-time setup fee**, **first 2 months included**, **$2,400/month ongoing subscription**), plus org/coworker tool allowlists, secret redaction, rate limiting, full audit receipts, data export/deletion, and SSO/SCIM & self-hosting configuration interfaces.

---

## 2. Repository & License Assessment (Reference Projects)

| Reference | Repository / URL | Observed License | Assessment & Reuse Decision |
|---|---|---|---|
| **SEO OS** (Primary shell) | `https://github.com/AgriciDaniel/seo-os` | **AGPL-3.0** | **ZERO code copied or vendored.** Because AGPL-3.0 requires network-served derivatives of its source code to also be licensed under AGPL-3.0, we implemented a **100% clean-room original codebase** inspired strictly by its UX concepts: 3D office/desk metaphor, Orchestrator Dais, Specialist Desks, Brain Chandelier, OS-style windows, Task Feed semantics, and 7 switchable themes. |
| **OpenFuse** (Personal agent path) | `https://github.com/CopilotKit/openfuse` | **MIT** | **Clean-room architectural inspiration only** (no code vendored). Used as UX reference for durable visible plans, pause/resume/stop/retry/cancel controls, human browser takeover, inline artifact cards, opt-in terminal/file permissions, goals, recurring checks, receipts, and personal preferences/memories. |
| **OpenDots** (Business coworker path) | `https://github.com/CopilotKit/OpenDots` | **MIT** | **Clean-room architectural inspiration only** (no code vendored). Used as UX reference for persistent AI coworkers (name, role, instructions, tools, permissions, default Space), Business Spaces with autosave/revisions, live computer panel (browser/files/terminal/activity), and inline human-in-the-loop approval cards. |
| **OpenBot** (Enterprise governance) | `https://open.bot/` (`CopilotKit/OpenBot`) | **Mixed / Dual-licensed** (MIT templates + PolyForm Noncommercial / Commercial enterprise backend) | **Product-direction reference only; zero code copied.** Verified that enterprise deployment & governance claims require real backend enforcement. Used as design inspiration for RBAC, tool allowlists, approval policies, audit trails, cost metering, SSO/SCIM readiness interfaces, and self-hostable Docker/Kubernetes deployment templates. |

---

## 3. Proposed Stack & Rationale

- **React 19 + TypeScript + Vite + Tailwind CSS v4**: Fast, strictly typed presentation layer with CSS custom-property theming across all 7 SEO OS themes and responsive mobile fallbacks.
- **Vanilla Three.js (`three`) WebGL Scene**: Delivers a genuine, smooth 3D spatial office (Orchestrator Dais, 9 Specialist Desks, AI Coworker pods, overhead Knowledge Brain Chandelier) without React reconciler peer-dependency fragility, paired with an instant accessible 2D Spatial Desk fallback and `prefers-reduced-motion` support.
- **Node.js 22 + Express 5 + Built-in SQLite (`node:sqlite`) + Zod**: Zero native C++ build friction, real relational SQL migrations (`server/migrations/001_initial_schema.sql`), explicit indexes, strict payload validation, and straightforward migration path to PostgreSQL for multi-node Kubernetes clusters.
- **Dual-Mode Client Adapter (`src/lib/api.ts` + `src/lib/sandboxEngine.ts`)**: Connects to the live Express+SQLite API during local/server deployment, and seamlessly activates an in-browser deterministic sandbox engine (explicitly badged `STATIC DEMO SANDBOX / MOCK PROVIDERS`) for static GitHub Pages previews while enforcing identical state transitions, HMAC webhook verification flows, approval gates, and tenant boundaries.
- **Vitest + Supertest + React Testing Library**: Automated coverage across authentication, authorization/RBAC, tenant isolation, signed idempotent webhooks, entitlement gating, task state transitions, approval policies, job recovery, and core UI flows.

---

## 4. Route Map

| Route | Access Level | Purpose |
|---|---|---|
| `/` | Public | Marketing landing page with simplified desk preview, Personal vs Business split, How It Works, features, comparison, exact pricing (`$997` setup, 2 months included, `$2,400/mo`), FAQ, and CTAs. |
| `/personal` | Public | Personal Agent overview and free-to-try entry point. |
| `/personal/agent` | Authenticated (Personal) | Free Personal Agent workspace (chat, durable plans, browser takeover, opt-in terminal/files, goals, monitors, receipts, preferences). Isolated from business tenants. |
| `/business` | Public | Business Workspace overview and paid offer details. |
| `/checkout` | Public / Auth | Setup-fee checkout handoff (`$997` setup -> 2 months included -> `$2,400/mo`), test-mode payment + explicit signed server webhook verification. |
| `/onboarding` | Authenticated + Entitled | Account, organization, first client site, goals, integrations, and read-only safe defaults. |
| `/desk` | Auth + Business Entitlement | Main SEO OS 3D/2D spatial desk shell, Task Feed, Brain Chandelier, and OS Window Manager. |
| `/desk/orchestrator` | Auth + Business Entitlement | Central business orchestrator with phase-gated parallel dispatch. |
| `/desk/clients` & `/desk/clients/:clientId` | Auth + Business Entitlement | Client & site workspaces, client brain, audits, tasks, reports, and specialists. |
| `/desk/coworkers` & `/desk/coworkers/:coworkerId` | Auth + Business Entitlement | AI coworker directory, builder, chat, live computer panel, activity timeline, and approvals. |
| `/desk/spaces` | Auth + Business Entitlement | Business Spaces, nested pages, markdown editor, autosave, revisions. |
| `/desk/tasks` | Auth + Business Entitlement | Filterable Task Feed, dependencies, phase gates, and retry/pause/resume/cancel controls. |
| `/desk/brain` | Auth + Business Entitlement | Client Knowledge Graph / Second-Brain with structured claims, confidence, and provenance. |
| `/desk/reports` | Auth + Business Entitlement | Reports and artifact library opening inside OS-style windows. |
| `/desk/integrations` | Auth + Business Entitlement | Integrations, encrypted credential refs, MCP tool allowlists, mock vs live status. |
| `/desk/admin` | Auth + Admin/Owner Role | Members, RBAC, approval policies, audit log, usage/cost, billing status, retention/export/deletion, SSO/SCIM & self-hosting readiness. |

---

## 5. Phased Implementation Checklist

- **Phase 1 (Product Shell & Landing Page)**: Visual system (7 SEO OS themes), marketing landing page, exact pricing, FAQ, Personal/Business split, auth flows, SEO OS desk shell with 3D + accessible 2D navigation.
- **Phase 2 (Checkout & Entitlements)**: Payment provider abstraction, `$997` setup-fee checkout in test mode, HMAC-signed idempotent webhooks, 2-month included period + `$2,400/mo` schedule, strict server-side Business Workspace gating, onboarding & billing status.
- **Phase 3 (SEO OS Core Workflows)**: Client workspaces, Client Brain with provenance, Central Orchestrator, 9 Specialist Desks, Task Feed (`RUNNING`, `REVIEW`, `DONE`, `SKIPPED`, `BLOCKED`, `FAILED`), phase gates, reports, and OS-style artifact windows.
- **Phase 4 (Personal Agent)**: Isolated free-to-try personal workspace with durable visible plans, pause/resume/stop/retry/cancel, browser takeover, opt-in terminal/files, file upload/artifact cards, receipts, goals, recurring monitors, and preferences/memories.
- **Phase 5 (Business AI Coworkers)**: Coworker builder (role, instructions, tools, permissions, schedule, default Space), Spaces & nested pages with autosave/revisions, coworker chat with conversation-to-document save, live computer panel, approval cards, and background status.
- **Phase 6 (Enterprise Controls)**: Organization admin, RBAC, approval policies & blocked actions, redacted audit log, usage/cost metering, retention/export/deletion, integration/MCP management, and honestly labeled SSO/SCIM & K8s/private-cloud configuration interfaces.
- **Phase 7 (Production Hardening)**: Automated Vitest suite (auth, RBAC, tenant isolation, webhooks, entitlements, state transitions, job recovery, approvals, UI flows), Docker/K8s/GitHub Pages deployment artifacts, and full operational documentation.

---

## 6. Assumptions & Unresolved Questions

- **Live External Providers**: Real Stripe keys, LLM API keys, Google Search Console OAuth tokens, and live Playwright/Docker sandboxes are kept strictly behind typed server adapters and environment variables. Until configured, the app runs deterministically on clearly badged mock adapters and never fakes live external side effects.
- **GitHub Pages Static Deployment**: Because GitHub Pages serves static assets only, `npm run build:pages` bundles the full SPA with `VITE_STATIC_DEMO_MODE=true` using an in-browser sandbox engine mirroring the server API contract (including signed test webhook simulation and strict entitlement gating) while visibly displaying a `STATIC DEMO SANDBOX` indicator. Production deployments run the full Node/Express + SQLite/PostgreSQL backend via `npm start` or Docker.
- **Compliance & Certifications**: No SOC 2, HIPAA, or ISO 27001 certification is claimed anywhere in the product or marketing copy.
