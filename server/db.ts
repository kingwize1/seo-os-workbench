import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppDatabase {
  sqlite: DatabaseSync;
  path: string;
  close(): void;
}

export function createDatabase(dbPath?: string): AppDatabase {
  const resolvedPath = dbPath ?? process.env.DATABASE_PATH ?? ':memory:';
  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new DatabaseSync(resolvedPath);
  sqlite.exec('PRAGMA foreign_keys = ON;');
  if (resolvedPath !== ':memory:') {
    sqlite.exec('PRAGMA journal_mode = WAL;');
  }

  runMigrations(sqlite);

  return {
    sqlite,
    path: resolvedPath,
    close() {
      sqlite.close();
    },
  };
}

export function runMigrations(sqlite: DatabaseSync): void {
  sqlite.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);'
  );

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const appliedStmt = sqlite.prepare('SELECT version FROM schema_migrations WHERE version = ?');
  const insertStmt = sqlite.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');

  for (const file of files) {
    const existing = appliedStmt.get(file);
    if (existing) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    sqlite.exec(sql);
    insertStmt.run(file, new Date().toISOString());
  }
}
