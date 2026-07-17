/**
 * Verify the seeded canon against the expected cardinalities:
 * sessions=17 / notions=17 / reperes=31 / rubric=5 / theses=64 /
 * finalEssayQuestions=10. Exits non-zero on any mismatch.
 */
import { pathToFileURL } from "node:url";
import { count } from "drizzle-orm";
import { EXPECTED_COUNTS } from "@/domain/curriculum.schema";
import { createDb, databasePath, type Db } from "./client";
import {
  finalEssayQuestions,
  notions,
  reperes,
  rubricEntries,
  sessions,
  theses,
} from "./schema";

export type VerifyResult = {
  counts: Record<keyof typeof EXPECTED_COUNTS, number>;
  ok: boolean;
};

/** Tally the canon tables and compare against EXPECTED_COUNTS. */
export function verifyDb(db: Db): VerifyResult {
  const counts = {
    sessions: db.select({ n: count() }).from(sessions).get()?.n ?? 0,
    notions: db.select({ n: count() }).from(notions).get()?.n ?? 0,
    reperes: db.select({ n: count() }).from(reperes).get()?.n ?? 0,
    rubric: db.select({ n: count() }).from(rubricEntries).get()?.n ?? 0,
    theses: db.select({ n: count() }).from(theses).get()?.n ?? 0,
    finalEssayQuestions:
      db.select({ n: count() }).from(finalEssayQuestions).get()?.n ?? 0,
  };
  const ok = (
    Object.keys(EXPECTED_COUNTS) as (keyof typeof EXPECTED_COUNTS)[]
  ).every((key) => counts[key] === EXPECTED_COUNTS[key]);
  return { counts, ok };
}

function main(): void {
  const db = createDb();
  const { counts, ok } = verifyDb(db);
  for (const key of Object.keys(EXPECTED_COUNTS) as (keyof typeof EXPECTED_COUNTS)[]) {
    const mark = counts[key] === EXPECTED_COUNTS[key] ? "ok" : "MISMATCH";
    console.log(
      `${key.padEnd(20)} expected=${EXPECTED_COUNTS[key]} actual=${counts[key]} ${mark}`
    );
  }
  if (!ok) {
    console.error(`verification FAILED for ${databasePath()}`);
    process.exit(1);
  }
  console.log(`verification passed for ${databasePath()}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
