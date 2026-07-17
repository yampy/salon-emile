/**
 * Per-session readings (読み物): generated once from the canon with the
 * tutor-model slot, validated against the canon (thesesGuide ids must
 * resolve), cached in the DB, and regenerable by deleting the row.
 */
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { sessionReadings } from "@/db/schema";
import { getModelSetting } from "@/db/settings";
import {
  SessionReadingSchema,
  type SessionReading,
} from "@/domain/reading.schema";
import { getLlmClient } from "@/llm";
import { buildReadingPrompt, buildReadingSystem } from "@/llm/prompts/reading";
import type { SessionPlanData } from "@/server/canon";
import { recordUsage } from "@/server/usage";

export type CachedReading = { reading: SessionReading; cached: boolean };

/** The cached reading for a session, if it exists. */
export function getReading(db: Db, sessionN: number): SessionReading | null {
  const row = db
    .select()
    .from(sessionReadings)
    .where(eq(sessionReadings.sessionN, sessionN))
    .get();
  return row?.content ?? null;
}

/** Fetch the reading, generating and caching it on first ask. */
export async function getOrCreateReading(
  db: Db,
  plan: SessionPlanData
): Promise<CachedReading> {
  const existing = getReading(db, plan.session.n);
  if (existing) {
    return { reading: existing, cached: true };
  }

  const model = getModelSetting(db, "tutorModel");
  const { object, usage } = await getLlmClient().generateObject({
    model,
    system: buildReadingSystem({
      session: plan.session,
      theses: plan.theses,
      reperes: plan.reperes,
    }),
    prompt: buildReadingPrompt(),
    schema: SessionReadingSchema,
    schemaName: "reading",
  });
  recordUsage(db, "reading", model, usage);

  // Canon guardrail: drop thesesGuide entries whose id doesn't resolve.
  const canonIds = new Set(plan.theses.map((t) => t.id));
  const reading: SessionReading = {
    ...object,
    thesesGuide: object.thesesGuide.filter((t) => canonIds.has(t.id)),
  };

  db.insert(sessionReadings)
    .values({ sessionN: plan.session.n, content: reading })
    .onConflictDoNothing()
    .run();

  return { reading, cached: false };
}
