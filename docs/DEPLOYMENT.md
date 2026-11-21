# SEO OS AI Workbench — Setup, Deployment, Monitoring & Incident Recovery

## 1. Local Development

### Prerequisites
- Node.js `>= 22.13.0` (includes built-in `node:sqlite`)
- npm `>= 10`

### Steps
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Run database migrations & seed deterministic demo data
npm run migrate

# 4. Start backend API server (port 4000)
npm run dev:server

# 5. In a second terminal, start Vite frontend dev server (port 5173)
npm run dev
```

Visit `http://localhost:5173`.

## 2. Running Automated Tests

```bash
npm test
```

The test suite verifies:
- Authentication (signup, signin, session cookies, logout)
- Authorization & RBAC (viewer/admin restrictions, personal vs business isolation)
- Tenant isolation across organizations and personal workspaces
- Checkout, HMAC-signed webhook verification, idempotency, and server-side entitlement gating (`$997` setup + 2 months included + `$2,400/mo`)
- Task state machine transitions (`RUNNING`, `REVIEW`, `DONE`, `SKIPPED`, `BLOCKED`, `FAILED`), phase gates, and worker restart recovery
- Approval gates, secret redaction, and audit trail receipts
- Core UI flows, pricing copy accuracy, and accessible non-3D fallback

## 3. Environment Variables

See [`.env.example`](../.env.example). Critical production variables:
- `SESSION_SECRET`: 32+ byte random hex string for session signing
- `SECRETS_ENCRYPTION_KEY`: 64-char hex key (32 bytes) for AES-256-GCM integration credential encryption
- `PAYMENT_PROVIDER`: `test` (development) or `stripe` (production)
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: Required when `PAYMENT_PROVIDER=stripe`
- `DATABASE_PATH`: Path to persistent SQLite volume (or swap repository adapter for PostgreSQL in multi-replica Kubernetes)

## 4. Deployment Targets

### A. Static GitHub Pages Preview (Demo Sandbox Mode)
```bash
npm run build:pages
```
Automated via `.github/workflows/deploy-pages.yml` on pushes to `main`. Runs in `STATIC DEMO SANDBOX` mode with all mock adapters clearly labeled in the UI.

### B. Docker / Single-Node Production
```bash
docker compose up -d --build
```
Mounts persistent `./data` volume for SQLite storage and exposes the combined web + API server on port `4000`.

### C. Private Cloud / Kubernetes (Template)
See `deploy/k8s/deployment.yaml` for a baseline Kubernetes manifest with health probes (`/api/health`), Secret references, and non-root security context. *Note: Multi-replica HA deployment requires swapping the SQLite storage adapter for a managed PostgreSQL database and external Redis/BullMQ queue before production cutover.*

## 5. Backups, Monitoring & Incident Recovery

- **Health Check**: `GET /api/health` returns DB connectivity, worker queue status, and payment provider mode.
- **SQLite Backups**: Schedule periodic hot backups (`sqlite3 data/seo-os-workbench.sqlite ".backup 'backups/backup-$(date +%F).sqlite'"`) to encrypted object storage.
- **Background Job Recovery**: On server startup, `TaskWorker.recoverInterruptedTasks()` scans for tasks stuck in `RUNNING` from an unclean shutdown and transitions them safely to `QUEUED` (with an audit + task event) for idempotent resumption.
- **Webhook Replay & Incident Recovery**: Stripe webhook events are deduplicated via `webhook_events.event_id`. If the API experiences downtime, Stripe retries webhooks automatically and idempotency guarantees no duplicate billing or entitlement drift.
- **Credential Compromise**: Rotate `SECRETS_ENCRYPTION_KEY` and `SESSION_SECRET`, revoke affected integration tokens in `/desk/integrations`, and inspect `/desk/admin` audit logs for actor/tool receipts.
