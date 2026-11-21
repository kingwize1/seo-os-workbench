import { createDatabase } from './db';

const dbPath = process.env.DATABASE_PATH || './data/seo-os-workbench.sqlite';
const db = createDatabase(dbPath);
console.log(`[SEO OS AI Workbench] Migrations applied cleanly to ${db.path}`);
db.close();
