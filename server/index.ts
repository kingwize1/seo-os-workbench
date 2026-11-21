import { createApp } from './app';

const port = Number(process.env.PORT || 4000);
const dbPath = process.env.DATABASE_PATH || './data/seo-os-workbench.sqlite';

const bundle = createApp({ dbPath });

const server = bundle.app.listen(port, () => {
  console.log(`[SEO OS AI Workbench] API listening on http://localhost:${port}`);
  console.log(`[SEO OS AI Workbench] SQLite DB: ${bundle.db.path}`);
  console.log(`[SEO OS AI Workbench] Payment Provider: ${bundle.paymentProvider.name}`);
});

function handleShutdown() {
  server.close(() => {
    bundle.close();
    process.exit(0);
  });
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
