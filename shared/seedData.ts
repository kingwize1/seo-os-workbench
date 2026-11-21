import { PRICING, SPECIALIST_DESK_BLUEPRINTS } from './constants';
import type {
  ApprovalRequest,
  Artifact,
  AuditEvent,
  BrainNode,
  ClientWorkspace,
  Coworker,
  Entitlement,
  Integration,
  InvoiceRecord,
  NotificationItem,
  PersonalWorkspace,
  Space,
  SpacePage,
  Task,
  UsageRecord,
} from './types';

// ==============================================================================
// Seeded Deterministic Demo Experience
// Clearly labeled as DEMO / MOCK data — never contacts external services.
// ==============================================================================

const NOW = '2026-11-21T16:30:00.000Z';
const TWO_HOURS_AGO = '2026-11-21T14:30:00.000Z';
const YESTERDAY = '2026-11-20T18:15:00.000Z';

export function buildSeededDemoBundle(orgId: string, userId: string, userName: string) {
  const clientId = `client_demo_apex_${orgId.slice(-6)}`;
  const spaceBriefsId = `space_briefs_${orgId.slice(-6)}`;
  const spaceRoadmapId = `space_roadmap_${orgId.slice(-6)}`;
  const runId = `run_demo_q4_${orgId.slice(-6)}`;

  const client: ClientWorkspace = {
    id: clientId,
    organizationId: orgId,
    name: 'Apex Cloud Health (Demo)',
    domain: 'apexcloudhealth.example',
    industry: 'B2B Healthcare SaaS',
    goals: [
      'Surface technical crawl bottlenecks blocking clinical workflow landing pages',
      'Draft evidence-backed commercial keyword briefs for enterprise buyers',
      'Improve entity clarity and structured citations for AI answer engines (GEO)',
    ],
    dataMode: 'MOCK_DEMO',
    isDemo: true,
    createdAt: YESTERDAY,
  };

  // 9 SEO Specialist Desks + 3 Business AI Coworkers
  const specialistCoworkers: Coworker[] = SPECIALIST_DESK_BLUEPRINTS.map((bp, idx) => ({
    id: `spec_${bp.deskKey}_${orgId.slice(-6)}`,
    organizationId: orgId,
    clientId,
    kind: 'SPECIALIST',
    deskKey: bp.deskKey,
    name: bp.name,
    role: bp.role,
    avatarEmoji: ['🛠️', '🔎', '📊', '🧭', '🧩', '✍️', '📍', '✨', '🗺️'][idx] ?? '🤖',
    accentColor: bp.accentColor,
    instructions: `Specialist SEO desk focused exclusively on: ${bp.role} Always attach source links, timestamps, confidence scores, and mark mocked data explicitly.`,
    allowedTools: bp.defaultTools,
    approvalPolicy: 'REQUIRE_APPROVAL_WRITES',
    scheduleCron: null,
    defaultSpaceId: spaceBriefsId,
    status:
      bp.deskKey === 'content-strategy'
        ? 'WORKING'
        : bp.deskKey === 'schema-architect'
          ? 'AWAITING_APPROVAL'
          : bp.deskKey === 'gsc-analytics'
            ? 'ERROR'
            : 'IDLE',
    isDemo: true,
    createdAt: YESTERDAY,
  }));

  const businessCoworkers: Coworker[] = [
    {
      id: `cw_strategist_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      kind: 'COWORKER',
      deskKey: 'coworker-strategist',
      name: 'Aria Vance',
      role: 'SEO Strategist',
      avatarEmoji: '🧠',
      accentColor: '#38bdf8',
      instructions:
        'Synthesizes technical crawl diagnostics, Search Console trends, and competitor SERP gaps into prioritized roadmaps. Never publishes without explicit human approval.',
      allowedTools: ['seo_crawl_inspector', 'serp_analyzer', 'gsc_query_reader', 'space_page_draft', 'artifact_export'],
      approvalPolicy: 'REQUIRE_APPROVAL_WRITES',
      scheduleCron: '0 9 * * 1',
      defaultSpaceId: spaceRoadmapId,
      status: 'WORKING',
      isDemo: true,
      createdAt: YESTERDAY,
    },
    {
      id: `cw_content_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      kind: 'COWORKER',
      deskKey: 'coworker-content',
      name: 'Devon Park',
      role: 'Content Planner',
      avatarEmoji: '📝',
      accentColor: '#a78bfa',
      instructions:
        'Drafts evidence-backed SEO briefs, internal linking recommendations, and comparison outlines inside Business Spaces. Requires approval before saving Space pages or pushing CMS drafts.',
      allowedTools: ['keyword_volume_reader', 'browser_read', 'space_page_draft', 'cms_publish'],
      approvalPolicy: 'REQUIRE_APPROVAL_WRITES',
      scheduleCron: '0 10 * * 2,4',
      defaultSpaceId: spaceBriefsId,
      status: 'AWAITING_APPROVAL',
      isDemo: true,
      createdAt: YESTERDAY,
    },
    {
      id: `cw_analyst_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      kind: 'COWORKER',
      deskKey: 'coworker-analyst',
      name: 'Maya Lin',
      role: 'Research Analyst',
      avatarEmoji: '🔬',
      accentColor: '#34d399',
      instructions:
        'Monitors rival product positioning, SERP feature shifts, and AI answer-engine citations. Runs read-only browser & SERP inspections and logs verifiable provenance claims.',
      allowedTools: ['browser_read', 'serp_analyzer', 'schema_validator', 'mcp_custom_query'],
      approvalPolicy: 'AUTO_READ_ONLY',
      scheduleCron: '0 8 * * *',
      defaultSpaceId: spaceBriefsId,
      status: 'IDLE',
      isDemo: true,
      createdAt: YESTERDAY,
    },
  ];

  const coworkers = [...specialistCoworkers, ...businessCoworkers];

  const specId = (deskKey: string) => `spec_${deskKey}_${orgId.slice(-6)}`;

  // Tasks covering ALL distinct states: DONE, RUNNING, REVIEW, SKIPPED (soft), BLOCKED (gate), FAILED (real)
  const taskTechId = `task_tech_${orgId.slice(-6)}`;
  const taskKwId = `task_kw_${orgId.slice(-6)}`;
  const taskGscId = `task_gsc_${orgId.slice(-6)}`;
  const taskCompId = `task_comp_${orgId.slice(-6)}`;
  const taskSchemaId = `task_schema_${orgId.slice(-6)}`;
  const taskContentId = `task_content_${orgId.slice(-6)}`;
  const taskLocalId = `task_local_${orgId.slice(-6)}`;
  const taskGeoId = `task_geo_${orgId.slice(-6)}`;
  const taskFinalId = `task_final_${orgId.slice(-6)}`;

  const tasks: Task[] = [
    {
      id: taskTechId,
      organizationId: orgId,
      clientId,
      orchestratorRunId: runId,
      coworkerId: specId('technical-audit'),
      deskKey: 'technical-audit',
      title: 'Technical Crawl & Core Web Vitals Audit',
      description: 'Inspect canonical chains, robots directives, LCP bottlenecks, and orphan URLs on apexcloudhealth.example.',
      phase: 1,
      status: 'DONE',
      statusReason: 'Completed with 14 verified findings and 3 high-priority technical opportunities.',
      progressPct: 100,
      isMock: true,
      dependsOn: [],
      createdAt: TWO_HOURS_AGO,
      updatedAt: NOW,
    },
    {
      id: taskKwId,
      organizationId: orgId,
      clientId,
      orchestratorRunId: runId,
      coworkerId: specId('keyword-research'),
      deskKey: 'keyword-research',
      title: 'Commercial Intent & Topic Gap Brief',
      description: 'Cluster high-intent clinical SaaS queries and identify non-branded landing page gaps.',
      phase: 1,
      status: 'DONE',
      statusReason: 'Completed: 42 commercial clusters mapped with SERP difficulty bands.',
      progressPct: 100,
      isMock: true,
      dependsOn: [],
      createdAt: TWO_HOURS_AGO,
      updatedAt: NOW,
    },
    {
      id: taskGscId,
      organizationId: orgId,
      clientId,
      orchestratorRunId: runId,
      coworkerId: specId('gsc-analytics'),
      deskKey: 'gsc-analytics',
      title: 'Search Console 90-Day Decay Diagnostic',
      description: 'Pull query-level CTR anomalies and landing-page impression drops from GSC adapter.',
      phase: 1,
      status: 'FAILED',
      statusReason: 'Mock GSC OAuth adapter returned 401 TokenExpired — reconnect or click Retry with deterministic fallback fixture.',
      progressPct: 38,
      isMock: true,
      dependsOn: [],
      createdAt: TWO_HOURS_AGO,
      updatedAt: NOW,
    },
    {
      id: taskCompId,
      organizationId: orgId,
      clientId,
      orchestratorRunId: runId,
      coworkerId: specId('competitor-research'),
      deskKey: 'competitor-research',
      title: 'Top-3 Rival SERP & Backlink Gap Analysis',
      description: 'Compare clinical workflow hub architecture against MedFlow Systems and CareGrid.',
      phase: 1,
      status: 'DONE',
      statusReason: 'Completed: surfaced 19 referring-domain gaps and comparison-page structural differences.',
      progressPct: 100,
      isMock: true,
      dependsOn: [],
      createdAt: TWO_HOURS_AGO,
      updatedAt: NOW,
    },
    {
      id: taskSchemaId,
      organizationId: orgId,
      clientId,
      orchestratorRunId: runId,
      coworkerId: specId('schema-architect'),
      deskKey: 'schema-architect',
      title: 'SoftwareApplication & FAQ JSON-LD Draft',
      description: 'Prepare validated JSON-LD structured data templates for product and documentation pages.',
      phase: 2,
      status: 'REVIEW',
      statusReason: 'Draft ready for human review before saving to Business Space or CMS staging.',
      progressPct: 90,
      isMock: true,
      dependsOn: [taskTechId],
      createdAt: TWO_HOURS_AGO,
      updatedAt: NOW,
    },
    {
      id: taskContentId,
      organizationId: orgId,
      clientId,
      orchestratorRunId: runId,
      coworkerId: specId('content-strategy'),
      deskKey: 'content-strategy',
      title: 'Q1 Editorial & Internal Linking Plan',
      description: 'Draft 8 evidence-backed content briefs aligned with commercial keyword clusters.',
      phase: 2,
      status: 'RUNNING',
      statusReason: 'Generating brief #6 of 8 (internal link graph cross-checked against client brain).',
      progressPct: 72,
      isMock: true,
      dependsOn: [taskKwId, taskCompId],
      createdAt: TWO_HOURS_AGO,
      updatedAt: NOW,
    },
    {
      id: taskLocalId,
      organizationId: orgId,
      clientId,
      orchestratorRunId: runId,
      coworkerId: specId('local-seo'),
      deskKey: 'local-seo',
      title: 'Local GBP & Multi-Location Citation Audit',
      description: 'Audit Google Business Profile listings and local NAP consistency.',
      phase: 2,
      status: 'SKIPPED',
      statusReason: 'Expected soft skip: apexcloudhealth.example is a cloud-only B2B SaaS with no physical storefronts. Does not block Phase 3 gate.',
      progressPct: 100,
      isMock: true,
      dependsOn: [],
      createdAt: TWO_HOURS_AGO,
      updatedAt: NOW,
    },
    {
      id: taskGeoId,
      organizationId: orgId,
      clientId,
      orchestratorRunId: runId,
      coworkerId: specId('geo-ai-search'),
      deskKey: 'geo-ai-search',
      title: 'GEO / AI Answer Engine Citation Readiness',
      description: 'Evaluate definition blocks, source attribution clarity, and machine-readable tables for AI search surfaces.',
      phase: 2,
      status: 'DONE',
      statusReason: 'Completed: 6 citation-clarity recommendations attached to Client Brain.',
      progressPct: 100,
      isMock: true,
      dependsOn: [taskTechId, taskCompId],
      createdAt: TWO_HOURS_AGO,
      updatedAt: NOW,
    },
    {
      id: taskFinalId,
      organizationId: orgId,
      clientId,
      orchestratorRunId: runId,
      coworkerId: specId('final-planning'),
      deskKey: 'final-planning',
      title: 'Executive 90-Day SEO & GEO Action Roadmap',
      description: 'Synthesize verified Phase 1 & Phase 2 outputs into an approval-ready quarterly execution plan.',
      phase: 3,
      status: 'BLOCKED',
      statusReason: 'Phase 3 gate waiting on: GSC 90-Day Decay (FAILED), Schema Draft (REVIEW), and Content Plan (RUNNING). Local SEO soft-skip ignored.',
      progressPct: 15,
      isMock: true,
      dependsOn: [taskTechId, taskKwId, taskGscId, taskSchemaId, taskContentId, taskLocalId, taskGeoId],
      createdAt: TWO_HOURS_AGO,
      updatedAt: NOW,
    },
  ];

  // Sample Client Knowledge Brain (with confidence, source links, timestamps, provenance)
  const brainNodes: BrainNode[] = [
    {
      id: `bn_cwv_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      label: 'LCP Render Bottleneck (/solutions/*)',
      category: 'TECHNICAL',
      summary: 'Hero dashboard PNGs (2.4MB unoptimized) delay mobile LCP to 4.1s across 6 solution landing pages.',
      x: -2.4,
      y: 3.4,
      z: -1.1,
      connections: [`bn_canonical_${orgId.slice(-6)}`, `bn_geo_entity_${orgId.slice(-6)}`],
      isDemo: true,
      updatedAt: NOW,
      claims: [
        {
          id: `cl_1_${orgId.slice(-6)}`,
          nodeId: `bn_cwv_${orgId.slice(-6)}`,
          statement: '6 commercial /solutions/* pages exceed the 2.5s LCP threshold due to unpreloaded hero PNG assets.',
          confidence: 0.94,
          status: 'VERIFIED',
          createdAt: NOW,
          evidence: [
            {
              id: `ev_1_${orgId.slice(-6)}`,
              sourceLabel: 'Mock Lighthouse Mobile Trace — /solutions/clinical-intake',
              sourceUrl: 'https://apexcloudhealth.example/solutions/clinical-intake',
              capturedAt: NOW,
              toolName: 'pagespeed_reader',
              snippet: 'LCP: 4.12s (element: img.hero-preview.png, 2,410 KB, fetchpriority missing)',
              isMock: true,
            },
          ],
        },
      ],
    },
    {
      id: `bn_canonical_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      label: 'Duplicate Faceted Docs URLs',
      category: 'TECHNICAL',
      summary: 'Filter query parameters (?version=2&role=admin) on /docs/ are indexed without self-referencing canonicals.',
      x: -0.9,
      y: 4.1,
      z: -2.0,
      connections: [`bn_cwv_${orgId.slice(-6)}`, `bn_schema_${orgId.slice(-6)}`],
      isDemo: true,
      updatedAt: NOW,
      claims: [
        {
          id: `cl_2_${orgId.slice(-6)}`,
          nodeId: `bn_canonical_${orgId.slice(-6)}`,
          statement: '318 parameterized documentation URLs return HTTP 200 without canonical tags pointing to base paths.',
          confidence: 0.91,
          status: 'VERIFIED',
          createdAt: NOW,
          evidence: [
            {
              id: `ev_2_${orgId.slice(-6)}`,
              sourceLabel: 'Mock Crawl Snapshot — /docs/api-webhooks',
              sourceUrl: 'https://apexcloudhealth.example/docs/api-webhooks?version=2',
              capturedAt: NOW,
              toolName: 'seo_crawl_inspector',
              snippet: 'status=200, canonical=missing, meta_robots=index,follow (318 similar URLs)',
              isMock: true,
            },
          ],
        },
      ],
    },
    {
      id: `bn_kw_cluster_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      label: 'Clinical Intake Automation Cluster',
      category: 'KEYWORD',
      summary: 'High-intent commercial cluster (est. 8,900 monthly searches across 14 terms) with no dedicated comparison hub.',
      x: 1.4,
      y: 3.9,
      z: -1.6,
      connections: [`bn_comp_gap_${orgId.slice(-6)}`, `bn_content_hub_${orgId.slice(-6)}`],
      isDemo: true,
      updatedAt: NOW,
      claims: [
        {
          id: `cl_3_${orgId.slice(-6)}`,
          nodeId: `bn_kw_cluster_${orgId.slice(-6)}`,
          statement: 'Competitors capture top-3 visibility for "patient intake workflow software" using interactive ROI and integration matrices.',
          confidence: 0.87,
          status: 'VERIFIED',
          createdAt: NOW,
          evidence: [
            {
              id: `ev_3_${orgId.slice(-6)}`,
              sourceLabel: 'Mock SERP Snapshot — "patient intake workflow software"',
              sourceUrl: 'https://serp-fixture.local/query/patient-intake-workflow-software',
              capturedAt: NOW,
              toolName: 'serp_analyzer',
              snippet: 'Top 3 results include structured EHR integration tables and security FAQ schema.',
              isMock: true,
            },
          ],
        },
      ],
    },
    {
      id: `bn_comp_gap_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      label: 'Rival Teardown: MedFlow vs CareGrid',
      category: 'COMPETITOR',
      summary: 'MedFlow publishes 24 EHR integration landing pages (Epic, Athena, Cerner); Apex has only 1 generic integrations page.',
      x: 2.6,
      y: 3.3,
      z: 0.3,
      connections: [`bn_kw_cluster_${orgId.slice(-6)}`, `bn_content_hub_${orgId.slice(-6)}`],
      isDemo: true,
      updatedAt: NOW,
      claims: [
        {
          id: `cl_4_${orgId.slice(-6)}`,
          nodeId: `bn_comp_gap_${orgId.slice(-6)}`,
          statement: 'Dedicated per-EHR integration pages account for ~34% of MedFlow estimated non-brand organic traffic.',
          confidence: 0.82,
          status: 'NEEDS_REVIEW',
          createdAt: NOW,
          evidence: [
            {
              id: `ev_4_${orgId.slice(-6)}`,
              sourceLabel: 'Mock Competitor Directory Map',
              sourceUrl: 'https://medflow-competitor.example/integrations',
              capturedAt: NOW,
              toolName: 'browser_read',
              snippet: '24 dedicated integration URLs discovered in XML sitemap.',
              isMock: true,
            },
          ],
        },
      ],
    },
    {
      id: `bn_schema_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      label: 'SoftwareApplication & Org Entity Graph',
      category: 'SCHEMA',
      summary: 'Missing sameAs entity links and SoftwareApplication JSON-LD on core product pages.',
      x: 0.2,
      y: 3.2,
      z: 1.5,
      connections: [`bn_canonical_${orgId.slice(-6)}`, `bn_geo_entity_${orgId.slice(-6)}`],
      isDemo: true,
      updatedAt: NOW,
      claims: [
        {
          id: `cl_5_${orgId.slice(-6)}`,
          nodeId: `bn_schema_${orgId.slice(-6)}`,
          statement: 'Adding linked Organization + SoftwareApplication JSON-LD helps search and AI engines disambiguate product capabilities.',
          confidence: 0.89,
          status: 'VERIFIED',
          createdAt: NOW,
          evidence: [
            {
              id: `ev_5_${orgId.slice(-6)}`,
              sourceLabel: 'Mock JSON-LD Validator Check',
              sourceUrl: 'https://apexcloudhealth.example/',
              capturedAt: NOW,
              toolName: 'schema_validator',
              snippet: 'Detected 0 SoftwareApplication entities; 1 partial Organization block missing sameAs.',
              isMock: true,
            },
          ],
        },
      ],
    },
    {
      id: `bn_content_hub_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      label: 'Q1 EHR Integration Pillar Architecture',
      category: 'CONTENT',
      summary: 'Recommended 8-page hub linking technical documentation to commercial buyer briefs.',
      x: -1.8,
      y: 3.5,
      z: 1.4,
      connections: [`bn_kw_cluster_${orgId.slice(-6)}`, `bn_comp_gap_${orgId.slice(-6)}`, `bn_geo_entity_${orgId.slice(-6)}`],
      isDemo: true,
      updatedAt: NOW,
      claims: [
        {
          id: `cl_6_${orgId.slice(-6)}`,
          nodeId: `bn_content_hub_${orgId.slice(-6)}`,
          statement: 'Internal linking from high-authority /docs/ pages to /solutions/ commercial pages is currently < 2 links per page.',
          confidence: 0.9,
          status: 'VERIFIED',
          createdAt: NOW,
          evidence: [
            {
              id: `ev_6_${orgId.slice(-6)}`,
              sourceLabel: 'Mock Internal Link Graph',
              sourceUrl: 'https://apexcloudhealth.example/docs/',
              capturedAt: NOW,
              toolName: 'seo_crawl_inspector',
              snippet: 'Average contextual inlinks to /solutions/* from /docs/* = 1.3.',
              isMock: true,
            },
          ],
        },
      ],
    },
    {
      id: `bn_geo_entity_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      label: 'GEO Citation Readiness Signals',
      category: 'GEO_AI',
      summary: 'Product pages lack concise 40-word answerable definitions and tabular capability specs preferred by AI answer engines.',
      x: 0.0,
      y: 4.4,
      z: 0.0,
      connections: [`bn_cwv_${orgId.slice(-6)}`, `bn_schema_${orgId.slice(-6)}`, `bn_content_hub_${orgId.slice(-6)}`],
      isDemo: true,
      updatedAt: NOW,
      claims: [
        {
          id: `cl_7_${orgId.slice(-6)}`,
          nodeId: `bn_geo_entity_${orgId.slice(-6)}`,
          statement: 'Adding concise specification tables and verifiable benchmark citations improves extractability for AI search summaries.',
          confidence: 0.85,
          status: 'VERIFIED',
          createdAt: NOW,
          evidence: [
            {
              id: `ev_7_${orgId.slice(-6)}`,
              sourceLabel: 'Mock GEO Extractability Audit',
              sourceUrl: 'https://apexcloudhealth.example/platform',
              capturedAt: NOW,
              toolName: 'browser_read',
              snippet: 'Key product specifications currently embedded in raster images instead of semantic HTML tables.',
              isMock: true,
            },
          ],
        },
      ],
    },
  ];

  // Sample Artifacts (Technical Audit, Keyword Brief, Content Plan, Final Recommendation)
  const artifacts: Artifact[] = [
    {
      id: `art_tech_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      taskId: taskTechId,
      title: 'Technical SEO Audit — apexcloudhealth.example [DEMO]',
      kind: 'TECHNICAL_AUDIT',
      format: 'markdown',
      confidence: 0.93,
      approved: true,
      createdAt: NOW,
      provenance: {
        generatedBy: 'Technical Audit Desk (Mock Adapter)',
        toolsUsed: ['seo_crawl_inspector', 'pagespeed_reader'],
        sourceLinks: [
          'https://apexcloudhealth.example/solutions/clinical-intake',
          'https://apexcloudhealth.example/docs/api-webhooks?version=2',
        ],
        timestamp: NOW,
        isMock: true,
      },
      content: `# Technical SEO Audit — apexcloudhealth.example
> **Data Source Notice**: Generated using deterministic **DEMO / MOCK** crawl fixtures. Connect live Google Search Console & Crawl adapters in \`/desk/integrations\` for production site diagnostics.

## Executive Summary
This audit surfaces **3 high-leverage technical opportunities** and **11 secondary hygiene items**. Fixing canonical duplication and hero asset delivery is recommended before scaling new commercial pages.

## Priority Findings
| Priority | Finding | Affected URLs | Recommended Action | Requires Approval |
|---|---|---|---|---|
| **P1** | Unoptimized hero PNGs (>2.4MB) pushing mobile LCP to 4.1s | 6 \`/solutions/*\` URLs | Convert to AVIF/WebP + \`fetchpriority="high"\` | Engineering PR |
| **P1** | Faceted \`/docs/\` query URLs indexed without canonicals | 318 URLs | Emit self-referencing canonical to clean base path | Engineering PR |
| **P2** | Orphaned product release notes lacking hub links | 19 URLs | Link from \`/changelog\` and relevant solution hubs | Content Review |

## Provenance & Confidence
- **Confidence**: 93% (deterministic mock fixture)
- **Tools**: \`seo_crawl_inspector\`, \`pagespeed_reader\`
- **Safe Default**: Read-only audit completed; zero external changes made.`,
    },
    {
      id: `art_kw_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      taskId: taskKwId,
      title: 'Commercial Keyword Opportunity Brief — Q1 [DEMO]',
      kind: 'KEYWORD_BRIEF',
      format: 'markdown',
      confidence: 0.88,
      approved: true,
      createdAt: NOW,
      provenance: {
        generatedBy: 'Keyword Research Desk (Mock Adapter)',
        toolsUsed: ['keyword_volume_reader', 'serp_analyzer'],
        sourceLinks: ['https://serp-fixture.local/query/patient-intake-workflow-software'],
        timestamp: NOW,
        isMock: true,
      },
      content: `# Commercial Keyword Opportunity Brief (Demo Fixture)

## Top Recommended Topic Clusters
1. **Clinical Intake Automation** — Est. 8,900 monthly searches · Commercial / Evaluation intent
   - Core terms: *patient intake workflow software*, *digital clinic intake automation*, *EHR intake sync*
   - Current gap: No dedicated comparison or integration spec page.
2. **EHR Integration Hubs** — Est. 5,400 monthly searches · Bottom-of-funnel intent
   - Core terms: *Epic patient intake integration*, *Athenahealth intake connector*
   - Competitor signal: MedFlow captures top-3 spots with 24 dedicated integration URLs.
3. **AI-Ready Healthcare Workflow Definitions (GEO)** — Informational / Citation intent
   - Opportunity: Structured HTML spec tables and clear definitions help AI search surfaces cite primary vendor docs.

*Note: Search demand figures represent seeded demo estimates and do not guarantee rankings or traffic outcomes.*`,
    },
    {
      id: `art_content_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      taskId: taskContentId,
      title: 'Q1 Content & Internal Linking Plan [DEMO — IN PROGRESS]',
      kind: 'CONTENT_PLAN',
      format: 'markdown',
      confidence: 0.85,
      approved: false,
      createdAt: NOW,
      provenance: {
        generatedBy: 'Content Strategy Desk + Devon Park (Mock Adapter)',
        toolsUsed: ['space_page_draft', 'browser_read'],
        sourceLinks: ['https://apexcloudhealth.example/docs/'],
        timestamp: NOW,
        isMock: true,
      },
      content: `# Q1 Content & Internal Linking Plan (Draft — Awaiting Review)

## Proposed Editorial Cadence (First 60 Days)
- **Wave 1 (Weeks 1–3)**: Launch 4 core EHR integration hub pages (*Epic*, *Athenahealth*, *Cerner*, *eClinicalWorks*) with structured HTML capability matrices.
- **Wave 2 (Weeks 4–6)**: Publish *Clinical Intake Architecture Guide* + add contextual internal links from top 15 \`/docs/*\` guides.
- **Wave 3 (Weeks 7–8)**: Deploy validated \`SoftwareApplication\` + \`FAQPage\` JSON-LD after engineering & legal review.

## Governance Check
- All copy drafts require **human subject-matter review** prior to CMS staging.
- Automated publishing is disabled under safe-default organization policy.`,
    },
    {
      id: `art_final_${orgId.slice(-6)}`,
      organizationId: orgId,
      clientId,
      taskId: taskFinalId,
      title: 'Draft 90-Day Executive Recommendation [PENDING PHASE 3 GATE]',
      kind: 'FINAL_RECOMMENDATION',
      format: 'markdown',
      confidence: 0.84,
      approved: false,
      createdAt: NOW,
      provenance: {
        generatedBy: 'Final Planning Desk (Mock Adapter)',
        toolsUsed: ['artifact_export'],
        sourceLinks: ['https://apexcloudhealth.example/'],
        timestamp: NOW,
        isMock: true,
      },
      content: `# 90-Day SEO & GEO Execution Recommendation (Preliminary)
> **Gate Status**: \`BLOCKED\` — awaiting retry of GSC Decay Diagnostic and human approval of Schema Draft.

## Recommended Sequence
1. **Stabilize Technical Foundation (Days 1–14)**: Resolve \`/docs/\` canonical duplication and compress \`/solutions/*\` hero media.
2. **Capture High-Intent EHR Integration Demand (Days 15–45)**: Draft and review 4 dedicated integration landing pages in Business Spaces.
3. **Strengthen GEO & Entity Signals (Days 46–90)**: Ship reviewed JSON-LD entity graphs and semantic comparison tables.

*All recommendations surface opportunities based on audited signals and require explicit team approval before execution.*`,
    },
  ];

  // Business Spaces & Nested Pages
  const spaces: Space[] = [
    {
      id: spaceBriefsId,
      organizationId: orgId,
      clientId,
      name: 'SEO Briefs & Content Specs',
      description: 'Evidence-backed briefs, schema drafts, and editorial guidelines curated with AI coworkers.',
      icon: '📚',
      createdAt: YESTERDAY,
    },
    {
      id: spaceRoadmapId,
      organizationId: orgId,
      clientId,
      name: 'Executive Roadmaps',
      description: 'Quarterly strategy pages, client meeting digests, and approved action plans.',
      icon: '🗺️',
      createdAt: YESTERDAY,
    },
  ];

  const page1Id = `page_pillar_${orgId.slice(-6)}`;
  const page2Id = `page_epic_${orgId.slice(-6)}`;
  const page3Id = `page_q1_${orgId.slice(-6)}`;

  const pages: SpacePage[] = [
    {
      id: page1Id,
      organizationId: orgId,
      spaceId: spaceBriefsId,
      parentPageId: null,
      title: 'Clinical Intake Pillar Strategy',
      version: 2,
      updatedBy: 'Devon Park (AI Coworker — Approved by ' + userName + ')',
      updatedAt: NOW,
      content: `# Clinical Intake Pillar Strategy

## Target Audience
VP of Clinical Operations and Digital Health IT leaders evaluating intake automation.

## Core Evidence Links
- Mobile LCP bottleneck on existing \`/solutions/clinical-intake\` (4.1s)
- Rival MedFlow maintains 24 EHR integration pages

## Recommended Structure
1. Concise 40-word product definition block (GEO extractability)
2. Semantic HTML EHR compatibility table
3. Verifiable security & operational architecture summary (no unverified certification claims)`,
      revisions: [
        {
          id: `rev_1_${orgId.slice(-6)}`,
          pageId: page1Id,
          version: 1,
          authorName: 'Devon Park (AI Coworker)',
          createdAt: TWO_HOURS_AGO,
          content: '# Clinical Intake Pillar Strategy\n\nInitial outline drafted from Keyword Research Desk.',
        },
        {
          id: `rev_2_${orgId.slice(-6)}`,
          pageId: page1Id,
          version: 2,
          authorName: userName,
          createdAt: NOW,
          content: '# Clinical Intake Pillar Strategy\n\nAdded GEO extractability section and evidence links.',
        },
      ],
    },
    {
      id: page2Id,
      organizationId: orgId,
      spaceId: spaceBriefsId,
      parentPageId: page1Id,
      title: 'Sub-Brief: Epic EHR Integration Page',
      version: 1,
      updatedBy: 'Devon Park (Draft)',
      updatedAt: NOW,
      content: `# Epic EHR Integration Landing Page Brief

- **Primary Intent**: Healthcare IT teams searching for Epic patient intake connectors
- **Required Sections**: HL7/FHIR data flow overview, setup timeline, admin governance controls
- **Status**: Drafted inside SEO OS Desk — requires legal & product review before publishing`,
      revisions: [
        {
          id: `rev_3_${orgId.slice(-6)}`,
          pageId: page2Id,
          version: 1,
          authorName: 'Devon Park (AI Coworker)',
          createdAt: NOW,
          content: '# Epic EHR Integration Landing Page Brief\n\nInitial nested sub-page brief.',
        },
      ],
    },
    {
      id: page3Id,
      organizationId: orgId,
      spaceId: spaceRoadmapId,
      parentPageId: null,
      title: 'Q1 Executive SEO Operating Plan',
      version: 1,
      updatedBy: 'Aria Vance (AI Coworker)',
      updatedAt: NOW,
      content: `# Q1 Executive SEO Operating Plan (Demo)

## Commercial Offer & Workspace Cadence
- Weekly specialist orchestrator audit runs every Monday 09:00 UTC
- Human-in-the-loop review required on all schema pushes, CMS writes, and client emails
- All data currently backed by **DEMO / MOCK** adapters until client connects Search Console & GA4`,
      revisions: [
        {
          id: `rev_4_${orgId.slice(-6)}`,
          pageId: page3Id,
          version: 1,
          authorName: 'Aria Vance (AI Coworker)',
          createdAt: NOW,
          content: '# Q1 Executive SEO Operating Plan (Demo)\n\nInitial executive summary.',
        },
      ],
    },
  ];

  // Integrations & MCP Connectors (never exposes raw keys)
  const integrations: Integration[] = [
    {
      id: `int_gsc_${orgId.slice(-6)}`,
      organizationId: orgId,
      providerKey: 'google-search-console',
      name: 'Google Search Console',
      category: 'ANALYTICS',
      status: 'MOCK_ACTIVE',
      mode: 'MOCK_DEMO',
      credentialConfigured: false,
      credentialLabel: 'Demo Fixture Adapter (No Live OAuth Token)',
      allowedScopes: ['gsc:read_queries', 'gsc:read_sitemaps'],
      enabledCoworkerIds: [specId('gsc-analytics'), `cw_strategist_${orgId.slice(-6)}`],
      updatedAt: NOW,
    },
    {
      id: `int_ga4_${orgId.slice(-6)}`,
      organizationId: orgId,
      providerKey: 'google-analytics-4',
      name: 'Google Analytics 4',
      category: 'ANALYTICS',
      status: 'MOCK_ACTIVE',
      mode: 'MOCK_DEMO',
      credentialConfigured: false,
      credentialLabel: 'Demo Fixture Adapter',
      allowedScopes: ['ga4:read_reports'],
      enabledCoworkerIds: [specId('gsc-analytics'), `cw_strategist_${orgId.slice(-6)}`],
      updatedAt: NOW,
    },
    {
      id: `int_serp_${orgId.slice(-6)}`,
      organizationId: orgId,
      providerKey: 'serp-backlinks-mcp',
      name: 'SERP & Backlink Intelligence (MCP)',
      category: 'MCP_SERVER',
      status: 'MOCK_ACTIVE',
      mode: 'MOCK_DEMO',
      credentialConfigured: false,
      credentialLabel: 'Typed Mock MCP Bridge',
      allowedScopes: ['serp:read', 'backlinks:read'],
      enabledCoworkerIds: [specId('keyword-research'), specId('competitor-research'), `cw_analyst_${orgId.slice(-6)}`],
      updatedAt: NOW,
    },
    {
      id: `int_cms_${orgId.slice(-6)}`,
      organizationId: orgId,
      providerKey: 'headless-cms-mcp',
      name: 'Headless CMS Staging Bridge (MCP)',
      category: 'MCP_SERVER',
      status: 'DISCONNECTED',
      mode: 'MOCK_DEMO',
      credentialConfigured: false,
      credentialLabel: 'Approval-Gated Write Adapter (Disconnected)',
      allowedScopes: ['cms:draft_write'],
      enabledCoworkerIds: [`cw_content_${orgId.slice(-6)}`],
      updatedAt: NOW,
    },
    {
      id: `int_model_${orgId.slice(-6)}`,
      organizationId: orgId,
      providerKey: 'provider-neutral-llm',
      name: 'AG-UI Model Runtime Router',
      category: 'MODEL_PROVIDER',
      status: 'MOCK_ACTIVE',
      mode: 'MOCK_DEMO',
      credentialConfigured: false,
      credentialLabel: 'Deterministic Mock Runtime (Set OPENAI/GEMINI/ANTHROPIC key on server)',
      allowedScopes: ['runtime:stream', 'runtime:tools'],
      enabledCoworkerIds: coworkers.map((c) => c.id),
      updatedAt: NOW,
    },
    {
      id: `int_slack_${orgId.slice(-6)}`,
      organizationId: orgId,
      providerKey: 'slack-voice-channels',
      name: 'Slack & Voice Channels',
      category: 'CHANNEL',
      status: 'PLANNED_ROADMAP',
      mode: 'MOCK_DEMO',
      credentialConfigured: false,
      credentialLabel: 'Planned Phase Integration (Not Active)',
      allowedScopes: [],
      enabledCoworkerIds: [],
      updatedAt: NOW,
    },
  ];

  // Example Pending Approval Requests (Sensitive actions paused until human approves)
  const approvals: ApprovalRequest[] = [
    {
      id: `appr_schema_${orgId.slice(-6)}`,
      organizationId: orgId,
      userId,
      scope: 'BUSINESS',
      taskId: taskSchemaId,
      coworkerId: specId('schema-architect'),
      coworkerName: 'Schema & Structured Data Desk',
      toolName: 'space_page_draft',
      riskLevel: 'write',
      summary: 'Save validated SoftwareApplication + FAQPage JSON-LD draft to "SEO Briefs & Content Specs" Space.',
      redactedPayload: {
        targetSpace: 'SEO Briefs & Content Specs',
        pageTitle: 'JSON-LD Schema Blueprint — apexcloudhealth.example',
        entityCount: 2,
        livePublish: false,
      },
      status: 'PENDING',
      decidedBy: null,
      decisionNote: null,
      createdAt: NOW,
      decidedAt: null,
    },
    {
      id: `appr_cms_${orgId.slice(-6)}`,
      organizationId: orgId,
      userId,
      scope: 'BUSINESS',
      taskId: taskContentId,
      coworkerId: `cw_content_${orgId.slice(-6)}`,
      coworkerName: 'Devon Park (Content Planner)',
      toolName: 'cms_publish',
      riskLevel: 'sensitive',
      summary: 'Stage "Epic EHR Integration" brief as unpublished CMS draft (paused by safe-default approval gate).',
      redactedPayload: {
        targetCms: 'Mock Headless CMS Staging',
        slug: '/integrations/epic-ehr',
        publishImmediately: false,
        apiKey: '[REDACTED]',
      },
      status: 'PENDING',
      decidedBy: null,
      decisionNote: null,
      createdAt: NOW,
      decidedAt: null,
    },
  ];

  // Example Audit Trail Events
  const auditEvents: AuditEvent[] = [
    {
      id: `aud_1_${orgId.slice(-6)}`,
      organizationId: orgId,
      userId,
      actorType: 'ORCHESTRATOR',
      actorName: 'Central SEO OS Orchestrator',
      coworkerId: null,
      action: 'ORCHESTRATOR_RUN_STARTED',
      toolName: null,
      redactedInput: { clientDomain: 'apexcloudhealth.example', objective: 'Full Q4 SEO & GEO diagnostic', isDemo: true },
      redactedOutput: { dispatchedTasks: 9, phaseGates: 3 },
      approvalId: null,
      outcome: 'SUCCESS',
      createdAt: TWO_HOURS_AGO,
    },
    {
      id: `aud_2_${orgId.slice(-6)}`,
      organizationId: orgId,
      userId,
      actorType: 'COWORKER',
      actorName: 'Technical Audit Desk',
      coworkerId: specId('technical-audit'),
      action: 'TOOL_EXECUTED',
      toolName: 'seo_crawl_inspector',
      redactedInput: { domain: 'apexcloudhealth.example', maxPages: 500, mode: 'MOCK_DEMO' },
      redactedOutput: { findings: 14, p1Count: 2, confidence: 0.93 },
      approvalId: null,
      outcome: 'SUCCESS',
      createdAt: TWO_HOURS_AGO,
    },
    {
      id: `aud_3_${orgId.slice(-6)}`,
      organizationId: orgId,
      userId,
      actorType: 'COWORKER',
      actorName: 'Devon Park (Content Planner)',
      coworkerId: `cw_content_${orgId.slice(-6)}`,
      action: 'SENSITIVE_TOOL_PAUSED_FOR_APPROVAL',
      toolName: 'cms_publish',
      redactedInput: { slug: '/integrations/epic-ehr', apiKey: '[REDACTED]' },
      redactedOutput: { approvalRequestId: `appr_cms_${orgId.slice(-6)}` },
      approvalId: `appr_cms_${orgId.slice(-6)}`,
      outcome: 'AWAITING_APPROVAL',
      createdAt: NOW,
    },
  ];

  const usageRecords: UsageRecord[] = [
    {
      id: `usg_1_${orgId.slice(-6)}`,
      organizationId: orgId,
      metric: 'TASKS_RUN',
      quantity: 9,
      estimatedCostUsd: 0.42,
      periodLabel: '2026-11 (Demo)',
      recordedAt: NOW,
    },
    {
      id: `usg_2_${orgId.slice(-6)}`,
      organizationId: orgId,
      metric: 'TOKENS_IN_OUT',
      quantity: 148200,
      estimatedCostUsd: 1.18,
      periodLabel: '2026-11 (Demo)',
      recordedAt: NOW,
    },
    {
      id: `usg_3_${orgId.slice(-6)}`,
      organizationId: orgId,
      metric: 'BROWSER_MINUTES',
      quantity: 14,
      estimatedCostUsd: 0.28,
      periodLabel: '2026-11 (Demo)',
      recordedAt: NOW,
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: `notif_1_${orgId.slice(-6)}`,
      userId,
      scope: 'BUSINESS',
      title: '2 Actions Awaiting Approval',
      body: 'Schema Desk and Devon Park paused before write/CMS actions. Review in SEO OS Desk.',
      read: false,
      createdAt: NOW,
    },
    {
      id: `notif_2_${orgId.slice(-6)}`,
      userId,
      scope: 'BUSINESS',
      title: 'GSC Decay Task Needs Retry',
      body: 'Search Console mock adapter simulated a 401 token error. Retry from Task Feed to unblock Phase 3.',
      read: false,
      createdAt: NOW,
    },
  ];

  return {
    client,
    coworkers,
    tasks,
    brainNodes,
    artifacts,
    spaces,
    pages,
    integrations,
    approvals,
    auditEvents,
    usageRecords,
    notifications,
  };
}

export function buildSeededPersonalWorkspace(userId: string): PersonalWorkspace {
  const taskId = `ptask_demo_${userId.slice(-6)}`;
  const receiptId = `preceipt_demo_${userId.slice(-6)}`;

  return {
    id: `pws_${userId.slice(-6)}`,
    userId,
    tone: 'analytical',
    avatarLabel: 'PA',
    memories: [
      'Prefer concise bullet summaries with direct source URLs',
      'Always ask before sending emails or running terminal scripts',
      'Track weekly SaaS pricing & SERP feature changes on Mondays',
    ],
    notifications: {
      taskDone: true,
      approvalRequired: true,
      recurringAlerts: true,
    },
    terminalEnabled: false, // Safe default: behind explicit user permission toggle
    filesEnabled: true,
    uploadedFiles: [
      {
        id: `pfile_1_${userId.slice(-6)}`,
        name: 'q4-vendor-comparison.csv',
        sizeLabel: '18 KB',
        preview: 'Vendor,SetupFee,Monthly,Trial\nSEO OS Workbench,$997,$2400,2 months included\nLegacy Suite,$0,$3500,None',
        uploadedAt: YESTERDAY,
      },
    ],
    tasks: [
      {
        id: taskId,
        userId,
        prompt: 'Research top 3 technical SEO checklist trends for 2026 and summarize sources with an action checklist.',
        status: 'DONE',
        progressPct: 100,
        browserTakeoverActive: false,
        browserCurrentUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
        receiptId,
        isMock: true,
        createdAt: TWO_HOURS_AGO,
        updatedAt: NOW,
        followUpQueue: ['Draft a 1-page PDF checklist for my Monday standup'],
        steps: [
          {
            id: 'step_1',
            title: 'Inspect documentation sources via Read-Only Browser',
            status: 'DONE',
            detail: 'Collected 3 canonical technical SEO references (Mock Browser Adapter).',
          },
          {
            id: 'step_2',
            title: 'Extract Core Web Vitals & AI Search citation guidance',
            status: 'DONE',
            detail: 'Synthesized INP, structured data, and entity-clarity guidance.',
          },
          {
            id: 'step_3',
            title: 'Save receipt & inline summary artifacts',
            status: 'DONE',
            detail: 'Stored verifiable receipt in personal workspace (isolated from business tenants).',
          },
        ],
        cards: [
          {
            id: 'card_browser_1',
            kind: 'browser',
            title: 'Browser Research Snapshot (Demo Fixture)',
            summary: 'Extracted structured guidance on crawl hygiene, canonical consistency, and semantic HTML tables.',
            url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
            metadata: { adapter: 'Mock Browser', status: '200 OK', mode: 'Read-Only' },
            isMock: true,
          },
          {
            id: 'card_plan_1',
            kind: 'plan',
            title: 'Personal Technical SEO Action Checklist',
            summary: '1) Audit mobile LCP & INP · 2) Normalize canonical query URLs · 3) Add semantic specification tables.',
            metadata: { items: '3 priority actions', provenance: 'Saved Receipt #' + receiptId.slice(-6) },
            isMock: true,
          },
          {
            id: 'card_pdf_1',
            kind: 'pdf',
            title: '2026-technical-seo-digest.pdf (Simulated Export)',
            summary: '2-page formatted research digest ready to view or download.',
            metadata: { pages: '2', size: '142 KB' },
            isMock: true,
          },
        ],
      },
    ],
    goals: [
      {
        id: `pgoal_1_${userId.slice(-6)}`,
        userId,
        title: 'Launch Personal Newsletter SEO Audit Workflow',
        targetDate: '2026-12-15',
        milestones: [
          { id: 'm1', label: 'Gather 2026 technical checklist sources', done: true },
          { id: 'm2', label: 'Set up weekly homepage monitor', done: true },
          { id: 'm3', label: 'Review drafted editorial calendar', done: false },
        ],
      },
    ],
    monitors: [
      {
        id: `pmon_1_${userId.slice(-6)}`,
        userId,
        label: 'Personal Blog Robots & Meta Check',
        url: 'https://my-portfolio.example/robots.txt',
        cadence: 'WEEKLY',
        enabled: true,
        lastCheckedAt: NOW,
        lastStatus: '200 OK — No accidental noindex detected (Demo)',
      },
    ],
    receipts: [
      {
        id: receiptId,
        userId,
        taskId,
        title: 'Technical SEO 2026 Checklist Research',
        toolsUsed: ['browser_read'],
        approvalDecision: 'Auto-approved (Read-only personal research)',
        outcome: 'Completed with 3 inline artifact cards (Mock Adapter)',
        createdAt: NOW,
      },
    ],
  };
}

export function buildActiveTrialEntitlement(orgId: string, paidAtIso: string): {
  entitlement: Entitlement;
  invoices: InvoiceRecord[];
} {
  const paidDate = new Date(paidAtIso);
  const includedEnd = new Date(paidDate.getTime() + PRICING.includedTrialDays * 24 * 60 * 60 * 1000);

  const entitlement: Entitlement = {
    id: `ent_${orgId.slice(-6)}`,
    organizationId: orgId,
    planCode: 'BUSINESS_WORKSPACE',
    status: 'TRIAL_INCLUDED',
    setupFeeCents: PRICING.setupFeeCents,
    monthlyAmountCents: PRICING.monthlySubscriptionCents,
    includedMonths: PRICING.includedTrialMonths,
    setupPaidAt: paidAtIso,
    includedPeriodEndsAt: includedEnd.toISOString(),
    nextBillingAt: includedEnd.toISOString(),
    cancelledAt: null,
  };

  const invoices: InvoiceRecord[] = [
    {
      id: `inv_setup_${orgId.slice(-6)}`,
      organizationId: orgId,
      providerInvoiceId: `in_test_setup_${orgId.slice(-6)}`,
      description: 'SEO OS Business Workspace — One-Time Setup Fee (Includes First 2 Months)',
      amountCents: PRICING.setupFeeCents,
      status: 'PAID',
      issuedAt: paidAtIso,
      dueAt: paidAtIso,
    },
    {
      id: `inv_sched_${orgId.slice(-6)}`,
      organizationId: orgId,
      providerInvoiceId: `in_test_sched_${orgId.slice(-6)}`,
      description: 'SEO OS Business Workspace — Ongoing Monthly Subscription (Begins After 2-Month Included Period)',
      amountCents: PRICING.monthlySubscriptionCents,
      status: 'SCHEDULED',
      issuedAt: paidAtIso,
      dueAt: includedEnd.toISOString(),
    },
  ];

  return { entitlement, invoices };
}
