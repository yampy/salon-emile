/**
 * Integration-test scaffolding: a fresh migrated + seeded SQLite file per
 * test suite, wired through DATABASE_PATH so route handlers hit it.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDb, type Db } from "@/db/client";
import { loadCurriculum, seedDb } from "@/db/seed";

export type TempDb = {
  db: Db;
  dir: string;
  cleanup: () => void;
};

export function setupTempDb(prefix: string): TempDb {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `salon-emile-${prefix}-`));
  const filePath = path.join(dir, "app.sqlite");
  process.env.DATABASE_PATH = filePath;
  process.env.LLM_PROVIDER = "mock";
  const db = createDb(filePath);
  seedDb(db, loadCurriculum(), new Date("2026-01-01T00:00:00.000Z"));
  return {
    db,
    dir,
    cleanup: () => {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Build a JSON POST request for a route handler. */
export function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Route-handler params context (Next 16 async params). */
export function paramsContext<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

export const SUBSTANTIVE_ANSWER =
  "労働は強制であると同時に、人間を自然の必然性から解放する営みでもある。この緊張こそが問いを成立させると考える。";
