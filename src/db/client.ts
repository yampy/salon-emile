/**
 * SQLite client factory. The default database lives at `data/app.sqlite`
 * (gitignored); tests point `DATABASE_PATH` at a temporary file.
 *
 * Opening a database applies pending migrations automatically so the app is
 * usable straight after `pnpm install`; seeding stays an explicit step
 * (`pnpm db:seed`) but is also run lazily when the canon tables are empty.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

const DEFAULT_DB_PATH = path.join("data", "app.sqlite");
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/** Resolve the database file path (env override first, for tests). */
export function databasePath(): string {
  return process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
}

/** Open (and migrate) a database at `filePath`. Callers own the handle. */
export function createDb(filePath: string = databasePath()): Db {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

let singleton: Db | null = null;
let singletonPath: string | null = null;

/** Shared app-wide handle (route handlers, server components). */
export function getDb(): Db {
  const wanted = databasePath();
  if (singleton === null || singletonPath !== wanted) {
    singleton = createDb(wanted);
    singletonPath = wanted;
  }
  return singleton;
}
