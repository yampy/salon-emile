/**
 * Token-usage accounting for the settings screen. Every LLM call is logged
 * with its role and model; aggregates are computed on read.
 */
import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { llmUsage, type LlmRole } from "@/db/schema";
import type { LlmUsage } from "@/llm/types";

/** Record one LLM call. */
export function recordUsage(
  db: Db,
  role: LlmRole,
  model: string,
  usage: LlmUsage
): void {
  db.insert(llmUsage)
    .values({
      role,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })
    .run();
}

export type UsageSummaryRow = {
  role: string;
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
};

/** Aggregate usage per (role, model). */
export function summarizeUsage(db: Db): UsageSummaryRow[] {
  return db
    .select({
      role: llmUsage.role,
      model: llmUsage.model,
      calls: sql<number>`count(*)`,
      inputTokens: sql<number>`coalesce(sum(${llmUsage.inputTokens}), 0)`,
      outputTokens: sql<number>`coalesce(sum(${llmUsage.outputTokens}), 0)`,
    })
    .from(llmUsage)
    .groupBy(llmUsage.role, llmUsage.model)
    .all();
}
