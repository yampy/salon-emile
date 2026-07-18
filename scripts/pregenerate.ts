/**
 * Pre-generate the derived study content for every session so first visits
 * are instant: the friendly reading (読み物) and the model answers for all
 * canonical questions. Idempotent — cached items are skipped, so the script
 * can be re-run after interruptions (rate limits, quota windows).
 *
 * Provider comes from the environment (`LLM_PROVIDER`); a `.env` file in
 * the project root is honored. Run: `pnpm pregenerate`
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createDb } from "@/db/client";
import { getSessionPlan } from "@/server/canon";
import { getOrCreateModelAnswer } from "@/server/model-answer";
import { getOrCreateReading } from "@/server/reading";

/** Minimal .env loader (KEY=VALUE lines; existing env wins). */
function loadDotEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  const db = createDb();
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let n = 0; n <= 16; n++) {
    const plan = getSessionPlan(db, n);
    if (!plan) continue;
    const started = Date.now();
    try {
      const { cached } = await getOrCreateReading(db, plan);
      if (cached) {
        skipped++;
        console.log(`reading  第${n}回: cached`);
      } else {
        generated++;
        console.log(
          `reading  第${n}回: generated in ${Math.round((Date.now() - started) / 1000)}s`
        );
      }
    } catch (error) {
      failed++;
      console.error(`reading  第${n}回: FAILED — ${(error as Error).message}`);
    }
  }

  for (let n = 0; n <= 16; n++) {
    const plan = getSessionPlan(db, n);
    if (!plan) continue;
    const questions =
      plan.session.questions.length > 0
        ? plan.session.questions
        : plan.session.exercise
          ? [plan.session.exercise]
          : [];
    for (const question of questions) {
      const started = Date.now();
      try {
        const { cached } = await getOrCreateModelAnswer(db, plan, question);
        if (cached) {
          skipped++;
          console.log(`answer   第${n}回「${question.slice(0, 18)}…」: cached`);
        } else {
          generated++;
          console.log(
            `answer   第${n}回「${question.slice(0, 18)}…」: generated in ${Math.round((Date.now() - started) / 1000)}s`
          );
        }
      } catch (error) {
        failed++;
        console.error(
          `answer   第${n}回「${question.slice(0, 18)}…」: FAILED — ${(error as Error).message}`
        );
      }
    }
  }

  console.log(
    `done: ${generated} generated, ${skipped} cached, ${failed} failed${failed > 0 ? " (re-run to retry)" : ""}`
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}
