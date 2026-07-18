/**
 * Integration: grading and reveal routes against a temp SQLite + mock LLM.
 * Covers evaluation persistence, mastery updates, lapse-card creation and
 * the reveal guardrail.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { attempts, cards, evaluations, mastery } from "@/db/schema";
import {
  jsonRequest,
  setupTempDb,
  SUBSTANTIVE_ANSWER,
  type TempDb,
} from "./helpers";

let temp: TempDb;
let attemptsPost: typeof import("@/app/api/attempts/route").POST;
let revealPost: typeof import("@/app/api/reveal/route").POST;

beforeAll(async () => {
  temp = setupTempDb("grade");
  ({ POST: attemptsPost } = await import("@/app/api/attempts/route"));
  ({ POST: revealPost } = await import("@/app/api/reveal/route"));
});

afterAll(() => temp.cleanup());

describe("POST /api/attempts", () => {
  it("grades a strong essay and updates mastery", async () => {
    const res = await attemptsPost(
      jsonRequest("http://test/api/attempts", {
        sessionN: 1,
        kind: "essay",
        exerciseKind: "mini_essay",
        question: "人は自分自身を知ることができるか",
        answer: SUBSTANTIVE_ANSWER,
      })
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      average: number;
      lapseCardCreated: boolean;
      evaluation: { scores: Record<string, number> };
    };
    expect(data.average).toBeGreaterThanOrEqual(2);
    expect(data.lapseCardCreated).toBe(false);
    expect(Object.keys(data.evaluation.scores)).toHaveLength(5);

    expect(temp.db.select().from(evaluations).all()).toHaveLength(1);
    // conscience x 5 criteria
    const masteryRows = temp.db
      .select()
      .from(mastery)
      .where(eq(mastery.notionId, "conscience"))
      .all();
    expect(masteryRows).toHaveLength(5);
    expect(masteryRows.every((r) => r.value > 0)).toBe(true);
  });

  it("creates a lapse card with a variant question for a weak attempt", async () => {
    const res = await attemptsPost(
      jsonRequest("http://test/api/attempts", {
        sessionN: 1,
        kind: "exercise",
        exerciseKind: "one_sentence",
        question: "人は自分自身を知ることができるか",
        answer: "わからない",
      })
    );
    const data = (await res.json()) as { lapseCardCreated: boolean };
    expect(data.lapseCardCreated).toBe(true);

    const lapse = temp.db
      .select()
      .from(cards)
      .where(eq(cards.kind, "lapse"))
      .all();
    expect(lapse).toHaveLength(1);
    expect(lapse[0].prompt).toBeTruthy();
    expect(lapse[0].prompt).not.toBe("人は自分自身を知ることができるか");
  });

  it("rejects invalid input", async () => {
    const bad = await attemptsPost(
      jsonRequest("http://test/api/attempts", { sessionN: 1, kind: "essay" })
    );
    expect(bad.status).toBe(400);

    const missing = await attemptsPost(
      jsonRequest("http://test/api/attempts", {
        sessionN: 42,
        kind: "essay",
        question: "q",
        answer: "a",
      })
    );
    expect(missing.status).toBe(404);
  });
});

describe("POST /api/reveal (AIに回答させる)", () => {
  it("records the event, returns the AI answer, and forces a variant question", async () => {
    const before = temp.db.select().from(attempts).all().length;
    const res = await revealPost(
      jsonRequest("http://test/api/reveal", {
        sessionN: 1,
        exerciseKind: "one_sentence",
        question: "人は自分自身を知ることができるか",
      })
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      aiAnswer: string;
      canon: { theses: { id: string }[] };
      variantQuestion: string;
    };
    expect(data.aiAnswer.length).toBeGreaterThan(0);
    expect(data.variantQuestion.length).toBeGreaterThan(0);
    expect(data.variantQuestion).not.toBe("人は自分自身を知ることができるか");
    // canon material is id-addressed theses from the seeded canon
    expect(data.canon.theses.map((t) => t.id)).toEqual([
      "s1-t1",
      "s1-t2",
      "s1-t3",
      "s1-t4",
    ]);

    const after = temp.db.select().from(attempts).all();
    expect(after).toHaveLength(before + 1);
    expect(after[after.length - 1].kind).toBe("reveal");
  });
});
