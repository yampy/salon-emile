/**
 * Mastery persistence: EMA per (notion, criterion), fed by grader scores.
 * The pure update rule lives in domain/mastery.ts.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { mastery, notions } from "@/db/schema";
import { RUBRIC_CRITERIA, type RubricCriterion } from "@/domain/curriculum.schema";
import type { Evaluation } from "@/domain/evaluation.schema";
import { averageMastery, isRecommended, updateMastery } from "@/domain/mastery";

/** Fold one evaluation into the mastery EMAs of the given notions. */
export function applyEvaluationToMastery(
  db: Db,
  notionIds: string[],
  evaluation: Evaluation,
  now: Date = new Date()
): void {
  for (const notionId of notionIds) {
    for (const criterion of RUBRIC_CRITERIA) {
      const existing = db
        .select()
        .from(mastery)
        .where(
          and(eq(mastery.notionId, notionId), eq(mastery.criterion, criterion))
        )
        .get();
      const value = updateMastery(
        existing?.value ?? null,
        evaluation.scores[criterion]
      );
      db.insert(mastery)
        .values({ notionId, criterion, value, updatedAt: now })
        .onConflictDoUpdate({
          target: [mastery.notionId, mastery.criterion],
          set: { value, updatedAt: now },
        })
        .run();
    }
  }
}

export type MasteryRow = {
  notionId: string;
  criterion: RubricCriterion;
  value: number;
};

/** Every stored mastery value (dashboard heatmap). */
export function listMastery(db: Db): MasteryRow[] {
  return db
    .select({
      notionId: mastery.notionId,
      criterion: mastery.criterion,
      value: mastery.value,
    })
    .from(mastery)
    .all();
}

/** Mean mastery per criterion across all notions (dashboard radar). */
export function masteryByCriterion(db: Db): Record<RubricCriterion, number | null> {
  const rows = listMastery(db);
  const result = {} as Record<RubricCriterion, number | null>;
  for (const criterion of RUBRIC_CRITERIA) {
    result[criterion] = averageMastery(
      rows.filter((r) => r.criterion === criterion).map((r) => r.value)
    );
  }
  return result;
}

/**
 * Soft roadmap gate: a session is "recommended done" when the average
 * mastery over its notions clears the threshold. Never locks anything.
 */
export function isSessionMasteryReached(db: Db, sessionN: number): boolean {
  const sessionNotions = db
    .select()
    .from(notions)
    .where(eq(notions.session, sessionN))
    .all();
  if (sessionNotions.length === 0) {
    return false;
  }
  const values = db
    .select()
    .from(mastery)
    .where(
      inArray(
        mastery.notionId,
        sessionNotions.map((n) => n.id)
      )
    )
    .all()
    .map((row) => row.value);
  return isRecommended(values);
}
