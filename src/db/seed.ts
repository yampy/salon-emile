/**
 * Idempotent seed: loads `src/data/curriculum.json` (the canon), upserts the
 * canon tables, creates the initial FSRS review cards (repere + thesis) and
 * the default settings.
 *
 * Re-running never touches learning state: cards keep their FSRS schedule,
 * settings keep user-chosen values; only canon rows are refreshed.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { newCard } from "@/domain/fsrs";
import {
  parseCurriculum,
  thesisId,
  type Curriculum,
} from "@/domain/curriculum.schema";
import { createDb, databasePath, type Db } from "./client";
import {
  cards,
  curriculumMeta,
  finalEssayQuestions,
  notions,
  reperes,
  rubricEntries,
  sessions,
  theses,
} from "./schema";
import { DEFAULT_SETTINGS, getSetting, setSetting } from "./settings";

const CANON_PATH = path.join("src", "data", "curriculum.json");

/** Load and validate the canon file. */
export function loadCurriculum(
  filePath: string = path.join(process.cwd(), CANON_PATH)
): Curriculum {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return parseCurriculum(raw);
}

/** Deterministic card id for a canon-backed review card. */
export function cardId(kind: "repere" | "thesis" | "lapse", sourceId: string | number): string {
  return `card-${kind}-${sourceId}`;
}

/** Seed the database from the canon. Safe to run any number of times. */
export function seedDb(db: Db, curriculum: Curriculum, now: Date = new Date()): void {
  db.transaction((tx) => {
    tx.insert(curriculumMeta)
      .values(curriculum.meta)
      .onConflictDoUpdate({
        target: curriculumMeta.id,
        set: {
          version: curriculum.meta.version,
          locale: curriculum.meta.locale,
          title: curriculum.meta.title,
          description: curriculum.meta.description,
          generatedAt: curriculum.meta.generatedAt,
        },
      })
      .run();

    curriculum.rubric.forEach((entry, position) => {
      tx.insert(rubricEntries)
        .values({ ...entry, position })
        .onConflictDoUpdate({
          target: rubricEntries.id,
          set: { name: entry.name, focus: entry.focus, position },
        })
        .run();
    });

    for (const notion of curriculum.notions) {
      tx.insert(notions)
        .values(notion)
        .onConflictDoUpdate({
          target: notions.id,
          set: { ja: notion.ja, fr: notion.fr, session: notion.session },
        })
        .run();
    }

    for (const repere of curriculum.reperes) {
      tx.insert(reperes)
        .values(repere)
        .onConflictDoUpdate({
          target: reperes.id,
          set: { fr: repere.fr, ja: repere.ja, sessions: repere.sessions },
        })
        .run();
    }

    for (const session of curriculum.sessions) {
      const row = {
        n: session.n,
        title: session.title,
        fr: session.fr,
        phase: session.phase,
        goal: session.goal,
        intro: session.intro,
        notes: session.notes,
        notionIds: session.notionIds,
        questions: session.questions,
        core: session.core ?? null,
        method: session.method ?? null,
        exercise: session.exercise ?? null,
        reperesNote: session.reperesNote ?? null,
        bridge: session.bridge ?? null,
      };
      tx.insert(sessions)
        .values(row)
        .onConflictDoUpdate({ target: sessions.n, set: row })
        .run();

      session.theses.forEach((thesis, position) => {
        const id = thesisId(session.n, position);
        tx.insert(theses)
          .values({
            id,
            sessionN: session.n,
            position,
            philosopher: thesis.philosopher,
            claim: thesis.claim,
          })
          .onConflictDoUpdate({
            target: theses.id,
            set: {
              sessionN: session.n,
              position,
              philosopher: thesis.philosopher,
              claim: thesis.claim,
            },
          })
          .run();
      });
    }

    curriculum.finalEssayQuestions.forEach((question, position) => {
      const id = `fe-${position + 1}`;
      tx.insert(finalEssayQuestions)
        .values({ id, position, question: question.question, notionId: question.notion })
        .onConflictDoUpdate({
          target: finalEssayQuestions.id,
          set: { position, question: question.question, notionId: question.notion },
        })
        .run();
    });

    // Canon-backed review cards: insert-if-absent only, so reseeding never
    // resets the learner's FSRS schedule.
    const fsrsInit = newCard(now);
    const fsrsColumns = {
      due: fsrsInit.due,
      stability: fsrsInit.stability,
      difficulty: fsrsInit.difficulty,
      elapsedDays: fsrsInit.elapsed_days,
      scheduledDays: fsrsInit.scheduled_days,
      reps: fsrsInit.reps,
      lapses: fsrsInit.lapses,
      learningSteps: fsrsInit.learning_steps,
      state: fsrsInit.state,
      lastReview: null,
    };
    for (const repere of curriculum.reperes) {
      tx.insert(cards)
        .values({
          id: cardId("repere", repere.id),
          kind: "repere",
          sourceId: repere.id,
          prompt: null,
          ...fsrsColumns,
        })
        .onConflictDoNothing()
        .run();
    }
    for (const session of curriculum.sessions) {
      session.theses.forEach((_, position) => {
        const sourceId = thesisId(session.n, position);
        tx.insert(cards)
          .values({
            id: cardId("thesis", sourceId),
            kind: "thesis",
            sourceId,
            prompt: null,
            ...fsrsColumns,
          })
          .onConflictDoNothing()
          .run();
      });
    }
  });

  // Settings: only fill gaps; never overwrite user choices.
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (getSetting(db, key) === null) {
      setSetting(db, key, value);
    }
  }
}

function main(): void {
  const db = createDb();
  const curriculum = loadCurriculum();
  seedDb(db, curriculum);
  console.log(`seeded ${databasePath()} from ${CANON_PATH}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
