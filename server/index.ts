import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './app';
import { getServerProviderStatuses } from './providerRegistry';

// Load local gitignored .env cleanly via Node 22 built-in loader (never commits or exposes secrets)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

const port = Number(process.env.PORT || 4000);
const dbPath = process.env.DATABASE_PATH || './data/seo-os-workbench.sqlite';

const bundle = createApp({ dbPath });
const providers = getServerProviderStatuses();
const configuredCount = providers.filter((p) => p.configured).length;

const server = bundle.app.listen(port, () => {
  console.log(`[SEO OS AI Workbench] API listening on http://localhost:${port}`);
  console.log(`[SEO OS AI Workbench] SQLite DB: ${bundle.db.path}`);
  console.log(`[SEO OS AI Workbench] Payment Provider: ${bundle.paymentProvider.name}`);
  console.log(`[SEO OS AI Workbench] Server-Only Providers Configured: ${configuredCount}/${providers.length}`);
});

function handleShutdown() {
  server.close(() => {
    bundle.close();
    process.exit(0);
  });
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
