/**
 * Drizzle schema for the local SQLite database (`data/app.sqlite`).
 *
 * Two groups of tables:
 * - canon tables, seeded (idempotently) from `src/data/curriculum.json` —
 *   the app reads teaching material only from here;
 * - learning tables, holding the single user's dialogue history, attempts,
 *   evaluations, mastery EMAs, FSRS cards and settings. Never committed.
 */
import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { RubricCriterion } from "@/domain/curriculum.schema";
import type { ExerciseKind } from "@/domain/exercise";
import type { LessonStep } from "@/domain/lesson";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

// ---------------------------------------------------------------------------
// Canon tables (seeded from curriculum.json)
// ---------------------------------------------------------------------------

export const curriculumMeta = sqliteTable("curriculum_meta", {
  id: text("id").primaryKey(),
  version: text("version").notNull(),
  locale: text("locale").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  generatedAt: text("generated_at").notNull(),
});

export const rubricEntries = sqliteTable("rubric_entries", {
  id: text("id").$type<RubricCriterion>().primaryKey(),
  name: text("name").notNull(),
  focus: text("focus").notNull(),
  position: integer("position").notNull(),
});

export const notions = sqliteTable("notions", {
  id: text("id").primaryKey(),
  ja: text("ja").notNull(),
  fr: text("fr").notNull(),
  session: integer("session").notNull(),
});

export const reperes = sqliteTable("reperes", {
  id: text("id").primaryKey(),
  fr: text("fr").notNull(),
  ja: text("ja").notNull(),
  sessions: text("sessions", { mode: "json" }).$type<number[]>().notNull(),
});

export const sessions = sqliteTable("sessions", {
  n: integer("n").primaryKey(),
  title: text("title").notNull(),
  fr: text("fr").notNull(),
  phase: text("phase").notNull(),
  goal: text("goal").notNull(),
  intro: text("intro").notNull(),
  notes: text("notes").notNull(),
  notionIds: text("notion_ids", { mode: "json" }).$type<string[]>().notNull(),
  questions: text("questions", { mode: "json" }).$type<string[]>().notNull(),
  core: text("core"),
  method: text("method"),
  exercise: text("exercise"),
  reperesNote: text("reperes_note"),
  bridge: text("bridge"),
});

export const theses = sqliteTable("theses", {
  /** Deterministic id `s{n}-t{position+1}` (see domain/curriculum.schema). */
  id: text("id").primaryKey(),
  sessionN: integer("session_n")
    .notNull()
    .references(() => sessions.n),
  position: integer("position").notNull(),
  philosopher: text("philosopher").notNull(),
  claim: text("claim").notNull(),
});

export const finalEssayQuestions = sqliteTable("final_essay_questions", {
  /** Deterministic id `fe-{position+1}`. */
  id: text("id").primaryKey(),
  position: integer("position").notNull(),
  question: text("question").notNull(),
  notionId: text("notion_id")
    .notNull()
    .references(() => notions.id),
});

// ---------------------------------------------------------------------------
// Learning tables (single local user; gitignored via data/)
// ---------------------------------------------------------------------------

export const lessonRuns = sqliteTable("lesson_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionN: integer("session_n")
    .notNull()
    .references(() => sessions.n),
  step: text("step").$type<LessonStep>().notNull().default("intuition"),
  status: text("status").$type<"active" | "completed">().notNull().default("active"),
  createdAt: createdAt(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonRunId: integer("lesson_run_id")
    .notNull()
    .references(() => lessonRuns.id),
  role: text("role").$type<"user" | "assistant">().notNull(),
  /** Lesson step during which the message was uttered. */
  step: text("step").$type<LessonStep>().notNull(),
  content: text("content").notNull(),
  createdAt: createdAt(),
});

export type AttemptKind = "exercise" | "essay" | "reveal" | "variant";

export const attempts = sqliteTable("attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").$type<AttemptKind>().notNull(),
  /** Exercise format for kind=exercise attempts. */
  exerciseKind: text("exercise_kind").$type<ExerciseKind>(),
  sessionN: integer("session_n")
    .notNull()
    .references(() => sessions.n),
  notionId: text("notion_id").references(() => notions.id),
  lessonRunId: integer("lesson_run_id").references(() => lessonRuns.id),
  question: text("question").notNull(),
  /** Learner production; empty string for reveal events. */
  answer: text("answer").notNull(),
  createdAt: createdAt(),
});

export const evaluations = sqliteTable("evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => attempts.id),
  scores: text("scores", { mode: "json" })
    .$type<Record<RubricCriterion, number>>()
    .notNull(),
  evidence: text("evidence", { mode: "json" })
    .$type<{ criterion: string; quote: string; comment: string }[]>()
    .notNull(),
  feedback: text("feedback").notNull(),
  missingReperes: text("missing_reperes", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  missingTheses: text("missing_theses", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  averageScore: real("average_score").notNull(),
  createdAt: createdAt(),
});

export const mastery = sqliteTable(
  "mastery",
  {
    notionId: text("notion_id")
      .notNull()
      .references(() => notions.id),
    criterion: text("criterion").$type<RubricCriterion>().notNull(),
    value: real("value").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.notionId, table.criterion] })]
);

export type CardKind = "repere" | "thesis" | "lapse";

export const cards = sqliteTable("cards", {
  /** `card-repere-{id}` / `card-thesis-{thesisId}` / `card-lapse-{attemptId}`. */
  id: text("id").primaryKey(),
  kind: text("kind").$type<CardKind>().notNull(),
  /** repere id, thesis id, or originating attempt id (lapse). */
  sourceId: text("source_id").notNull(),
  /**
   * Current variant question for lapse cards (regenerated on each re-show,
   * never repeating the same wording). Null for canon-backed cards.
   */
  prompt: text("prompt"),
  // FSRS state (owned by ts-fsrs; we only persist it)
  due: integer("due", { mode: "timestamp_ms" }).notNull(),
  stability: real("stability").notNull(),
  difficulty: real("difficulty").notNull(),
  elapsedDays: real("elapsed_days").notNull(),
  scheduledDays: real("scheduled_days").notNull(),
  reps: integer("reps").notNull(),
  lapses: integer("lapses").notNull(),
  learningSteps: integer("learning_steps").notNull(),
  state: integer("state").notNull(),
  lastReview: integer("last_review", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

export const reviewLogs = sqliteTable("review_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id),
  /** What was asked (for lapse cards: the variant shown this round). */
  prompt: text("prompt").notNull(),
  answer: text("answer").notNull(),
  score: real("score").notNull(),
  comment: text("comment").notNull(),
  rating: integer("rating").notNull(),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }).notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type LlmRole = "tutor" | "grader" | "cardGrader" | "variantGenerator";

export const llmUsage = sqliteTable("llm_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  role: text("role").$type<LlmRole>().notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  createdAt: createdAt(),
});
