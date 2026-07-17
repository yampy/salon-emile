/**
 * Model answers for the textbook page: generated once per
 * (session, question) with the grader-model slot, cached in the DB, and
 * constrained by prompt to reference only canon theses (by ID).
 */
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { modelAnswers } from "@/db/schema";
import { getModelSetting } from "@/db/settings";
import { ModelAnswerSchema, type ModelAnswer } from "@/domain/evaluation.schema";
import { getLlmClient } from "@/llm";
import {
  buildModelAnswerPrompt,
  buildModelAnswerSystem,
} from "@/llm/prompts/modelAnswer";
import type { SessionPlanData } from "@/server/canon";
import { recordUsage } from "@/server/usage";

export type CachedModelAnswer = ModelAnswer & { cached: boolean };

/** Fetch the cached model answer, generating and storing it on first ask. */
export async function getOrCreateModelAnswer(
  db: Db,
  plan: SessionPlanData,
  question: string
): Promise<CachedModelAnswer> {
  const existing = db
    .select()
    .from(modelAnswers)
    .where(
      and(
        eq(modelAnswers.sessionN, plan.session.n),
        eq(modelAnswers.question, question)
      )
    )
    .get();
  if (existing) {
    return {
      problematique: existing.problematique,
      these: existing.these,
      antithese: existing.antithese,
      depassement: existing.depassement,
      cached: true,
    };
  }

  const model = getModelSetting(db, "graderModel");
  const { object, usage } = await getLlmClient().generateObject({
    model,
    system: buildModelAnswerSystem({
      session: plan.session,
      theses: plan.theses,
      reperes: plan.reperes,
    }),
    prompt: buildModelAnswerPrompt(question),
    schema: ModelAnswerSchema,
    schemaName: "modelAnswer",
  });
  recordUsage(db, "modelAnswer", model, usage);

  db.insert(modelAnswers)
    .values({ sessionN: plan.session.n, question, ...object })
    .onConflictDoNothing()
    .run();

  return { ...object, cached: false };
}
