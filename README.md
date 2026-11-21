# SEO OS AI Workbench

**SEO OS AI Workbench** is a unified, production-structured SaaS platform whose central workspace is built around the **SEO OS** dark 3D spatial office metaphor—integrating a free-to-try **Personal Agent**, **9 SEO Specialist Desks**, persistent **Business AI Coworkers**, **Business Spaces**, per-client **Knowledge Brains**, and **Enterprise Governance** into one cohesive operating system.

## Commercial Structure (Unmistakable Pricing)
- **Personal Agent Path (`/personal`, `/personal/agent`)**: Free to try for individual productivity, strictly isolated from business tenants.
- **Business Workspace Path (`/business`, `/checkout`, `/desk`)**:
  - **One-time setup fee**: **$997** (paid first)
  - **Included trial period**: **First 2 months included** after setup
  - **Ongoing subscription**: **$2,400/month** beginning after the included two-month period
- Paid access is granted **strictly after verified server-side payment webhook events** (HMAC-SHA256 signed & idempotent)—never merely because a browser returned from checkout.

## Clean-Room License & Reference Notice
All source code in this repository is a **100% clean-room original implementation**:
- Inspired conceptually by **SEO OS** (`AgriciDaniel/seo-os`, AGPL-3.0 — zero code copied or vendored) for the 3D office/desk metaphor, orchestrator dais, specialist desks, brain chandelier, OS windows, task feed, and 7 switchable themes.
- Inspired conceptually by **OpenFuse** (`CopilotKit/openfuse`, MIT) for the personal agent durable plans, browser takeover, opt-in terminal/files, goals, monitors, and receipts.
- Inspired conceptually by **OpenDots** (`CopilotKit/OpenDots`, MIT) for persistent AI coworkers, Business Spaces/pages with revisions, live computer panels, and human-in-the-loop approval cards.
- Inspired conceptually by **OpenBot** (`open.bot`, mixed MIT/commercial) for enterprise governance, RBAC, tool allowlists, audit trails, and self-hosting deployment templates.

## Quick Start (Local Full-Stack)

```bash
npm install
cp .env.example .env
npm run migrate
npm run dev:server   # Express + SQLite API on http://localhost:4000
npm run dev          # Vite React frontend on http://localhost:5173
```

## Automated Tests

```bash
npm test
```

## Documentation
- [Architecture & Reference Assessment](docs/ARCHITECTURE.md)
- [19-Domain Data Model & Tenant Isolation](docs/DATA_MODEL.md)
- [Setup, Deployment, Monitoring & Incident Recovery](docs/DEPLOYMENT.md)
