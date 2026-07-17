/**
 * Review queue: FSRS-due cards of the three kinds (repere / thesis / lapse),
 * lightweight cardGrader scoring, rating mapping, and ts-fsrs rescheduling.
 * Lapse cards regenerate a fresh isomorphic variant after every review so
 * the same wording is never shown twice.
 */
import { asc, eq, lte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempts, cards, reperes, reviewLogs, sessions, theses } from "@/db/schema";
import { CardGradeSchema } from "@/domain/evaluation.schema";
import {
  isDue,
  newCard as fsrsNewCard,
  reviewCard,
  scoreToRating,
  type FsrsCard,
} from "@/domain/fsrs";
import { getModelSetting } from "@/db/settings";
import { getLlmClient } from "@/llm";
import {
  buildCardGraderPrompt,
  buildCardGraderSystem,
} from "@/llm/prompts/cardGrader";
import { generateVariant } from "@/server/grading";
import { recordUsage } from "@/server/usage";

/** Cards presented per review round (keeps one round tractable). */
export const REVIEW_ROUND_LIMIT = 10;

export type CardRow = typeof cards.$inferSelect;

export type PresentedCard = {
  id: string;
  kind: CardRow["kind"];
  /** What the learner sees. */
  front: string;
  /** Prompt actually asked (recorded in the review log). */
  prompt: string;
  due: Date;
};

/** Canonical front/back for a card; back is only used for grading. */
export function resolveCardContent(
  db: Db,
  card: CardRow
): { front: string; back: string } {
  switch (card.kind) {
    case "repere": {
      const repere = db
        .select()
        .from(reperes)
        .where(eq(reperes.id, card.sourceId))
        .get();
      if (!repere) throw new Error(`repere ${card.sourceId} not in canon`);
      return {
        front: `repère「${repere.fr}」の意味(日本語)と、適用の一文を書いてください。`,
        back: repere.ja,
      };
    }
    case "thesis": {
      const thesis = db
        .select()
        .from(theses)
        .where(eq(theses.id, card.sourceId))
        .get();
      if (!thesis) throw new Error(`thesis ${card.sourceId} not in canon`);
      const session = db
        .select()
        .from(sessions)
        .where(eq(sessions.n, thesis.sessionN))
        .get();
      return {
        front: `${thesis.philosopher}(第${thesis.sessionN}回「${session?.title ?? ""}」)の主張の要旨を書いてください。`,
        back: thesis.claim,
      };
    }
    case "lapse": {
      const attempt = db
        .select()
        .from(attempts)
        .where(eq(attempts.id, Number(card.sourceId)))
        .get();
      return {
        front: card.prompt ?? attempt?.question ?? "",
        back: attempt?.question ?? "",
      };
    }
  }
}

/** Due cards at `now`, oldest due first, capped to one round. */
export function listDueCards(
  db: Db,
  now: Date = new Date(),
  limit: number = REVIEW_ROUND_LIMIT
): PresentedCard[] {
  const due = db
    .select()
    .from(cards)
    .where(lte(cards.due, now))
    .orderBy(asc(cards.due), asc(cards.id))
    .limit(limit)
    .all();
  return due.map((card) => {
    const { front } = resolveCardContent(db, card);
    return { id: card.id, kind: card.kind, front, prompt: front, due: card.due };
  });
}

/** Total number of due cards (for the queue header). */
export function countDueCards(db: Db, now: Date = new Date()): number {
  return db.select().from(cards).where(lte(cards.due, now)).all().length;
}

function toFsrs(card: CardRow): FsrsCard {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learningSteps,
    state: card.state,
    last_review: card.lastReview ?? undefined,
  };
}

export type ReviewOutcome = {
  cardId: string;
  score: number;
  comment: string;
  rating: number;
  nextDue: Date;
  remainingDue: number;
};

/**
 * Grade one card answer and reschedule the card via ts-fsrs.
 * Returns the grade and the next due date.
 */
export async function answerCard(
  db: Db,
  cardId: string,
  answer: string,
  now: Date = new Date()
): Promise<ReviewOutcome | null> {
  const card = db.select().from(cards).where(eq(cards.id, cardId)).get();
  if (!card || !isDue(toFsrs(card), now)) {
    return null;
  }
  const { front, back } = resolveCardContent(db, card);

  const llm = getLlmClient();
  const lightModel = getModelSetting(db, "lightModel");
  const { object: grade, usage } = await llm.generateObject({
    model: lightModel,
    system: buildCardGraderSystem(),
    prompt: buildCardGraderPrompt(front, back, answer),
    schema: CardGradeSchema,
    schemaName: "cardGrade",
  });
  recordUsage(db, "cardGrader", lightModel, usage);

  const rating = scoreToRating(grade.score);
  const { card: next } = reviewCard(toFsrs(card), rating, now);

  db.update(cards)
    .set({
      due: next.due,
      stability: next.stability,
      difficulty: next.difficulty,
      elapsedDays: next.elapsed_days,
      scheduledDays: next.scheduled_days,
      reps: next.reps,
      lapses: next.lapses,
      learningSteps: next.learning_steps,
      state: next.state,
      lastReview: now,
    })
    .where(eq(cards.id, card.id))
    .run();

  db.insert(reviewLogs)
    .values({
      cardId: card.id,
      prompt: front,
      answer,
      score: grade.score,
      comment: grade.comment,
      rating,
      reviewedAt: now,
    })
    .run();

  // Never repeat a lapse variant: regenerate for the next appearance,
  // steering away from every previously shown wording.
  if (card.kind === "lapse") {
    const shownBefore = db
      .select({ prompt: reviewLogs.prompt })
      .from(reviewLogs)
      .where(eq(reviewLogs.cardId, card.id))
      .all()
      .map((r) => r.prompt);
    const original = back || front;
    const fresh = await generateVariant(db, original, shownBefore);
    db.update(cards).set({ prompt: fresh }).where(eq(cards.id, card.id)).run();
  }

  return {
    cardId: card.id,
    score: grade.score,
    comment: grade.comment,
    rating,
    nextDue: next.due,
    remainingDue: countDueCards(db, now),
  };
}

/** Count of reviewed (reps > 0) cards per kind, for roadmap/dashboard. */
export function reviewedCardStats(db: Db): { total: number; reviewed: number } {
  const all = db.select({ reps: cards.reps }).from(cards).all();
  return {
    total: all.length,
    reviewed: all.filter((c) => c.reps > 0).length,
  };
}

export type KindProgress = { reviewed: number; total: number };

/** Reviewed-at-least-once counts per canon card kind (roadmap progress). */
export function reviewedCountsByKind(
  db: Db
): Record<"repere" | "thesis", KindProgress> {
  const rows = db.select({ kind: cards.kind, reps: cards.reps }).from(cards).all();
  const tally = (kind: "repere" | "thesis"): KindProgress => {
    const ofKind = rows.filter((r) => r.kind === kind);
    return {
      reviewed: ofKind.filter((r) => r.reps > 0).length,
      total: ofKind.length,
    };
  };
  return { repere: tally("repere"), thesis: tally("thesis") };
}

/** A fresh FSRS state for external callers needing card creation. */
export function freshFsrsState(now: Date) {
  return fsrsNewCard(now);
}
