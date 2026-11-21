import type { ThemeId, ToolDefinition } from './types';

// ==============================================================================
// Commercial Offer Constants (Unmistakable Pricing — Never describe as "free")
// ==============================================================================
export const PRICING = {
  setupFeeUsd: 997,
  setupFeeCents: 99700,
  includedTrialMonths: 2,
  includedTrialDays: 60,
  monthlySubscriptionUsd: 2400,
  monthlySubscriptionCents: 240000,
  currency: 'USD',
  summaryLine: '$997 one-time setup fee · First 2 months included · Then $2,400/month',
  shortHeadline: '$997 setup, first 2 months included, then $2,400/month',
} as const;

// ==============================================================================
// 7 SEO OS Switchable Themes (CSS vars + Three.js 3D Scene Palettes)
// ==============================================================================
export interface SeoOsThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  bgHex: string;
  fogHex: string;
  floorHex: string;
  gridHex: string;
  accentHex: string;
  secondaryHex: string;
  ambientHex: string;
}

export const SEO_OS_THEMES: Record<ThemeId, SeoOsThemeConfig> = {
  cosmos: {
    id: 'cosmos',
    name: 'Cosmos',
    tagline: 'Deep orbital indigo & cyan telemetry',
    bgHex: '#070913',
    fogHex: '#0b1024',
    floorHex: '#0d1328',
    gridHex: '#1f3366',
    accentHex: '#38bdf8',
    secondaryHex: '#a78bfa',
    ambientHex: '#60a5fa',
  },
  datacenter: {
    id: 'datacenter',
    name: 'Datacenter',
    tagline: 'High-contrast obsidian & emerald rack glow',
    bgHex: '#060b0a',
    fogHex: '#0a1412',
    floorHex: '#0c1715',
    gridHex: '#134e4a',
    accentHex: '#10b981',
    secondaryHex: '#2dd4bf',
    ambientHex: '#34d399',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    tagline: 'Calm nocturnal pine & amber lamp warmth',
    bgHex: '#08100c',
    fogHex: '#0e1a13',
    floorHex: '#111f17',
    gridHex: '#264734',
    accentHex: '#4ade80',
    secondaryHex: '#fbbf24',
    ambientHex: '#86efac',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    tagline: 'Abyssal slate blue & bioluminescent teal',
    bgHex: '#040d17',
    fogHex: '#081a2c',
    floorHex: '#0a2138',
    gridHex: '#164e63',
    accentHex: '#22d3ee',
    secondaryHex: '#3b82f6',
    ambientHex: '#67e8f9',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    tagline: 'Warm dusk violet & copper horizon',
    bgHex: '#120810',
    fogHex: '#1f0e1b',
    floorHex: '#22111e',
    gridHex: '#5b2348',
    accentHex: '#fb7185',
    secondaryHex: '#f59e0b',
    ambientHex: '#fda4af',
  },
  clouds: {
    id: 'clouds',
    name: 'Clouds',
    tagline: 'Cool twilight mist & silver-blue desk steel',
    bgHex: '#0d111a',
    fogHex: '#171f30',
    floorHex: '#1b2436',
    gridHex: '#334155',
    accentHex: '#93c5fd',
    secondaryHex: '#cbd5e1',
    ambientHex: '#bfdbfe',
  },
  retro: {
    id: 'retro',
    name: 'Retro',
    tagline: 'CRT phosphor amber & synthwave magenta grid',
    bgHex: '#100817',
    fogHex: '#1a0d26',
    floorHex: '#1b0f29',
    gridHex: '#6b21a8',
    accentHex: '#f472b6',
    secondaryHex: '#facc15',
    ambientHex: '#e879f9',
  },
};

// ==============================================================================
// 9 Specialist SEO Desks (SEO OS Spatial Layout Coordinates)
// ==============================================================================
export interface SpecialistDeskBlueprint {
  deskKey: string;
  name: string;
  shortLabel: string;
  role: string;
  phase: 1 | 2 | 3;
  position: [number, number, number];
  accentColor: string;
  defaultTools: string[];
}

export const SPECIALIST_DESK_BLUEPRINTS: SpecialistDeskBlueprint[] = [
  {
    deskKey: 'technical-audit',
    name: 'Technical Audit Desk',
    shortLabel: 'Tech Audit',
    role: 'Crawlability, Core Web Vitals, status codes, canonicals, and indexation diagnostics.',
    phase: 1,
    position: [-5.5, 0, -3.2],
    accentColor: '#38bdf8',
    defaultTools: ['seo_crawl_inspector', 'pagespeed_reader'],
  },
  {
    deskKey: 'keyword-research',
    name: 'Keyword Research Desk',
    shortLabel: 'Keywords',
    role: 'Search intent clustering, topic gap discovery, and commercial opportunity prioritization.',
    phase: 1,
    position: [-2.8, 0, -4.4],
    accentColor: '#a78bfa',
    defaultTools: ['serp_analyzer', 'keyword_volume_reader'],
  },
  {
    deskKey: 'gsc-analytics',
    name: 'Search Console & Analytics Desk',
    shortLabel: 'GSC & GA4',
    role: 'Organic impressions, CTR anomalies, decay detection, and conversion attribution.',
    phase: 1,
    position: [0.0, 0, -4.8],
    accentColor: '#34d399',
    defaultTools: ['gsc_query_reader', 'analytics_reader'],
  },
  {
    deskKey: 'competitor-research',
    name: 'Competitor Research Desk',
    shortLabel: 'Competitors',
    role: 'SERP rival teardown, backlink gap mapping, and share-of-voice evidence.',
    phase: 1,
    position: [2.8, 0, -4.4],
    accentColor: '#fb7185',
    defaultTools: ['serp_analyzer', 'browser_read'],
  },
  {
    deskKey: 'schema-architect',
    name: 'Schema & Structured Data Desk',
    shortLabel: 'Schema',
    role: 'JSON-LD entity graphs, FAQ/Product/Organization markup validation, and rich result readiness.',
    phase: 2,
    position: [5.5, 0, -3.2],
    accentColor: '#f59e0b',
    defaultTools: ['schema_validator', 'space_page_draft'],
  },
  {
    deskKey: 'content-strategy',
    name: 'Content Strategy Desk',
    shortLabel: 'Content Plan',
    role: 'Editorial roadmaps, evidence-backed briefs, internal linking graphs, and refresh specs.',
    phase: 2,
    position: [-5.2, 0, 2.2],
    accentColor: '#22d3ee',
    defaultTools: ['space_page_draft', 'browser_read'],
  },
  {
    deskKey: 'local-seo',
    name: 'Local SEO Desk',
    shortLabel: 'Local SEO',
    role: 'GBP signals, NAP citation consistency, and multi-location landing page diagnostics.',
    phase: 2,
    position: [-2.4, 0, 3.8],
    accentColor: '#94a3b8',
    defaultTools: ['serp_analyzer', 'browser_read'],
  },
  {
    deskKey: 'geo-ai-search',
    name: 'GEO / AI Search Desk',
    shortLabel: 'GEO / AI',
    role: 'Entity clarity, citation-ready passages, and visibility diagnostics for AI answer engines.',
    phase: 2,
    position: [2.4, 0, 3.8],
    accentColor: '#c084fc',
    defaultTools: ['browser_read', 'schema_validator'],
  },
  {
    deskKey: 'final-planning',
    name: 'Final Planning & Roadmap Desk',
    shortLabel: 'Final Plan',
    role: 'Synthesizes verified evidence into a prioritized 90-day action plan awaiting human review.',
    phase: 3,
    position: [5.2, 0, 2.2],
    accentColor: '#10b981',
    defaultTools: ['space_page_draft', 'artifact_export'],
  },
];

// ==============================================================================
// Declarative Tool Registry (Permissions, Risk Level, Approval Policy & Audit)
// ==============================================================================
export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: 'browser_read',
    name: 'Browser Research (Read-Only)',
    category: 'browser',
    description: 'Fetches and inspects public pages, captures snapshots, and extracts citations.',
    risk: 'read',
    defaultApprovalPolicy: 'AUTO_READ_ONLY',
    requiredPermission: 'tools:read',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'seo_crawl_inspector',
    name: 'Technical Crawl Inspector',
    category: 'seo',
    description: 'Audits status codes, canonicals, robots directives, and metadata.',
    risk: 'read',
    defaultApprovalPolicy: 'AUTO_READ_ONLY',
    requiredPermission: 'seo:read',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'pagespeed_reader',
    name: 'Core Web Vitals Reader',
    category: 'seo',
    description: 'Reads LCP, INP, CLS, and render-blocking resource diagnostics.',
    risk: 'read',
    defaultApprovalPolicy: 'AUTO_READ_ONLY',
    requiredPermission: 'seo:read',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'gsc_query_reader',
    name: 'Google Search Console Reader',
    category: 'seo',
    description: 'Reads search queries, clicks, impressions, CTR, and indexation reports.',
    risk: 'read',
    defaultApprovalPolicy: 'AUTO_READ_ONLY',
    requiredPermission: 'analytics:read',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'analytics_reader',
    name: 'GA4 Analytics Reader',
    category: 'seo',
    description: 'Reads landing page engagement and conversion funnels.',
    risk: 'read',
    defaultApprovalPolicy: 'AUTO_READ_ONLY',
    requiredPermission: 'analytics:read',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'serp_analyzer',
    name: 'SERP & Backlink Analyzer',
    category: 'seo',
    description: 'Inspects top-ranking SERP features, rival structure, and referring domains.',
    risk: 'read',
    defaultApprovalPolicy: 'AUTO_READ_ONLY',
    requiredPermission: 'seo:read',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'keyword_volume_reader',
    name: 'Keyword Demand Reader',
    category: 'seo',
    description: 'Retrieves search volume bands, difficulty signals, and intent classifications.',
    risk: 'read',
    defaultApprovalPolicy: 'AUTO_READ_ONLY',
    requiredPermission: 'seo:read',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'schema_validator',
    name: 'JSON-LD Schema Validator',
    category: 'seo',
    description: 'Validates structured data payloads against schema.org definitions.',
    risk: 'read',
    defaultApprovalPolicy: 'AUTO_READ_ONLY',
    requiredPermission: 'seo:read',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'space_page_draft',
    name: 'Save Draft to Business Space',
    category: 'files',
    description: 'Creates or updates a working document inside an authorized Business Space.',
    risk: 'write',
    defaultApprovalPolicy: 'REQUIRE_APPROVAL_WRITES',
    requiredPermission: 'spaces:write',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: false,
  },
  {
    id: 'artifact_export',
    name: 'Export Report Artifact',
    category: 'files',
    description: 'Generates downloadable Markdown, JSON, or CSV report artifacts.',
    risk: 'read',
    defaultApprovalPolicy: 'AUTO_READ_ONLY',
    requiredPermission: 'artifacts:read',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: false,
  },
  {
    id: 'terminal_exec',
    name: 'Sandboxed Terminal Execution',
    category: 'terminal',
    description: 'Runs bounded shell/script commands inside an isolated agent computer.',
    risk: 'sensitive',
    defaultApprovalPolicy: 'REQUIRE_APPROVAL_WRITES',
    requiredPermission: 'computer:terminal',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'cms_publish',
    name: 'Publish to Live CMS / Website',
    category: 'cms',
    description: 'Pushes schema, metadata, or article updates to a production CMS. Always gated.',
    risk: 'sensitive',
    defaultApprovalPolicy: 'REQUIRE_APPROVAL_ALL',
    requiredPermission: 'cms:publish',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'email_send',
    name: 'Send External Email / Slack Message',
    category: 'comms',
    description: 'Sends an outbound message to a client stakeholder or team channel. Always gated.',
    risk: 'sensitive',
    defaultApprovalPolicy: 'REQUIRE_APPROVAL_ALL',
    requiredPermission: 'comms:send',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'mcp_custom_query',
    name: 'MCP Tool Bridge (Read/Write)',
    category: 'mcp',
    description: 'Invokes an organization-approved MCP server tool under per-coworker allowlists.',
    risk: 'write',
    defaultApprovalPolicy: 'REQUIRE_APPROVAL_WRITES',
    requiredPermission: 'mcp:invoke',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: true,
  },
  {
    id: 'data_delete',
    name: 'Delete Workspace Records',
    category: 'files',
    description: 'Permanently deletes client files or pages. Requires explicit admin approval.',
    risk: 'destructive',
    defaultApprovalPolicy: 'REQUIRE_APPROVAL_ALL',
    requiredPermission: 'admin:delete',
    auditLevel: 'FULL_REDACTED',
    isMockByDefault: false,
  },
];

export function getToolDefinition(toolId: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((t) => t.id === toolId);
}
