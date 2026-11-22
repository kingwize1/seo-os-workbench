// ==============================================================================
// Server-Only Live Provider Registry & Safe Status Inspector
// Reads secrets exclusively from server process.env.
// NEVER returns raw API keys, tokens, or passwords to any HTTP response.
// ==============================================================================

export interface ServerProviderStatus {
  key: string;
  name: string;
  category: 'BILLING' | 'AUTH' | 'MODEL_PROVIDER' | 'SEO_DATA' | 'CRAWL_SCRAPE' | 'VOICE_AVATAR' | 'SOCIAL_AGENT';
  configured: boolean;
  mode: 'LIVE_ENV_CONFIGURED' | 'MOCK_ADAPTER';
  approvalRequired: boolean;
  detail: string;
}

function hasEnv(name: string): boolean {
  const val = process.env[name];
  return typeof val === 'string' && val.trim().length > 0;
}

export function getServerProviderStatuses(): ServerProviderStatus[] {
  return [
    {
      key: 'stripe',
      name: 'Stripe Live Checkout & Webhooks',
      category: 'BILLING',
      configured: hasEnv('STRIPE_SECRET_KEY') && hasEnv('STRIPE_WEBHOOK_SECRET'),
      mode:
        (process.env.PAYMENT_PROVIDER || 'test').toLowerCase() === 'stripe' &&
        hasEnv('STRIPE_SECRET_KEY') &&
        hasEnv('STRIPE_WEBHOOK_SECRET')
          ? 'LIVE_ENV_CONFIGURED'
          : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: 'Server-only Stripe Checkout + signed webhook verification ($997 setup, 2 mo included, $2,400/mo).',
    },
    {
      key: 'google-oauth',
      name: 'Google OAuth Sign-In (WBCP)',
      category: 'AUTH',
      configured: hasEnv('GOOGLE_CLIENT_ID') && hasEnv('GOOGLE_CLIENT_SECRET'),
      mode: hasEnv('GOOGLE_CLIENT_ID') && hasEnv('GOOGLE_CLIENT_SECRET') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: 'Server-side Google OAuth 2.0 client credentials configured for user sign-in.',
    },
    {
      key: 'anthropic',
      name: `Anthropic Compatible (${process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'})`,
      category: 'MODEL_PROVIDER',
      configured: hasEnv('ANTHROPIC_AUTH_TOKEN'),
      mode: hasEnv('ANTHROPIC_AUTH_TOKEN') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: `Endpoint: ${process.env.ANTHROPIC_BASE_URL || 'https://api.b.ai'} (server-side token redacted).`,
    },
    {
      key: 'gemini',
      name: 'Google Gemini API',
      category: 'MODEL_PROVIDER',
      configured: hasEnv('GEMINI_API_KEY'),
      mode: hasEnv('GEMINI_API_KEY') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: 'Server-only Gemini API adapter for SEO specialists and orchestrator synthesis.',
    },
    {
      key: 'openai',
      name: 'OpenAI API',
      category: 'MODEL_PROVIDER',
      configured: hasEnv('OPENAI_API_KEY'),
      mode: hasEnv('OPENAI_API_KEY') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: 'Server-only OpenAI provider adapter for coworker chat and structured briefs.',
    },
    {
      key: 'huggingface',
      name: 'HuggingFace Inference',
      category: 'MODEL_PROVIDER',
      configured: hasEnv('HUGGINGFACE_API_KEY'),
      mode: hasEnv('HUGGINGFACE_API_KEY') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: 'Open-model embeddings and classification endpoints via HuggingFace.',
    },
    {
      key: 'dataforseo',
      name: 'DataForSEO (SERP, Keywords & Backlinks)',
      category: 'SEO_DATA',
      configured: hasEnv('DATAFORSEO_EMAIL') && hasEnv('DATAFORSEO_PASSWORD'),
      mode: hasEnv('DATAFORSEO_EMAIL') && hasEnv('DATAFORSEO_PASSWORD') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: 'Live SERP, keyword demand, and technical SEO metrics adapter (Basic Auth server-only).',
    },
    {
      key: 'crawler-dev',
      name: 'Crawler.dev Site Crawler',
      category: 'CRAWL_SCRAPE',
      configured: hasEnv('CRAWLER_DEV_API_KEY'),
      mode: hasEnv('CRAWLER_DEV_API_KEY') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: 'Automated site crawl and HTML/canonical inspection adapter.',
    },
    {
      key: 'apify',
      name: 'Apify Web Automation & Actors',
      category: 'CRAWL_SCRAPE',
      configured: hasEnv('APIFY_API_KEY'),
      mode: hasEnv('APIFY_API_KEY') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: 'Competitor extraction and structured web scraping actor bridge.',
    },
    {
      key: 'google-maps',
      name: 'Google Maps / Places API',
      category: 'SEO_DATA',
      configured: hasEnv('GOOGLE_MAPS_API_KEY'),
      mode: hasEnv('GOOGLE_MAPS_API_KEY') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: 'Local SEO NAP verification and Google Business Profile place lookup.',
    },
    {
      key: 'intentgpt',
      name: 'IntentGPT Search Intent Engine',
      category: 'SEO_DATA',
      configured: hasEnv('INTENTGPT_API_KEY'),
      mode: hasEnv('INTENTGPT_API_KEY') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: false,
      detail: 'Commercial search intent clustering and GEO answer-engine opportunity scoring.',
    },
    {
      key: 'longcat-avatar',
      name: 'LongCat Video & Avatar API',
      category: 'VOICE_AVATAR',
      configured: hasEnv('LONGCAT_API_KEY'),
      mode: hasEnv('LONGCAT_API_KEY') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: true,
      detail: 'AI coworker video avatar generation (approval-gated before rendering/publishing).',
    },
    {
      key: 'openhome-voice',
      name: 'OpenHome Voice Clone API',
      category: 'VOICE_AVATAR',
      configured: hasEnv('OPENHOME_API_KEY'),
      mode: hasEnv('OPENHOME_API_KEY') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: true,
      detail: 'Open-source voice cloning for future voice coworker channels (approval-gated).',
    },
    {
      key: 'zernio-social',
      name: 'Zernio Social Poster for AI Agents',
      category: 'SOCIAL_AGENT',
      configured: hasEnv('ZERNIO_API_KEY'),
      mode: hasEnv('ZERNIO_API_KEY') ? 'LIVE_ENV_CONFIGURED' : 'MOCK_ADAPTER',
      approvalRequired: true,
      detail: 'Outbound social publishing adapter — ALWAYS paused behind explicit human approval.',
    },
  ];
}
