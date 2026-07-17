/**
 * Integration: textbook model answers — canonical questions only, generated
 * once via the mock LLM, then cached.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { llmUsage, modelAnswers } from "@/db/schema";
import { jsonRequest, setupTempDb, type TempDb } from "./helpers";

let temp: TempDb;
let post: typeof import("@/app/api/model-answers/route").POST;

const CANON_QUESTION = "人は自分自身を知ることができるか";

beforeAll(async () => {
  temp = setupTempDb("model-answer");
  ({ POST: post } = await import("@/app/api/model-answers/route"));
});

afterAll(() => temp.cleanup());

describe("POST /api/model-answers", () => {
  it("generates a three-part model answer for a canonical question", async () => {
    const res = await post(
      jsonRequest("http://test/api/model-answers", {
        sessionN: 1,
        question: CANON_QUESTION,
      })
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, string | boolean>;
    expect(data.cached).toBe(false);
    for (const part of ["problematique", "these", "antithese", "depassement"]) {
      expect(typeof data[part]).toBe("string");
      expect((data[part] as string).length).toBeGreaterThan(0);
    }
    expect(temp.db.select().from(modelAnswers).all()).toHaveLength(1);
    const usage = temp.db
      .select()
      .from(llmUsage)
      .where(eq(llmUsage.role, "modelAnswer"))
      .all();
    expect(usage).toHaveLength(1);
  });

  it("serves the cached answer on the second ask without a new LLM call", async () => {
    const res = await post(
      jsonRequest("http://test/api/model-answers", {
        sessionN: 1,
        question: CANON_QUESTION,
      })
    );
    const data = (await res.json()) as { cached: boolean };
    expect(data.cached).toBe(true);
    expect(
      temp.db.select().from(llmUsage).where(eq(llmUsage.role, "modelAnswer")).all()
    ).toHaveLength(1);
  });

  it("rejects non-canonical questions and unknown sessions", async () => {
    const offCanon = await post(
      jsonRequest("http://test/api/model-answers", {
        sessionN: 1,
        question: "勝手な問い",
      })
    );
    expect(offCanon.status).toBe(422);

    const missing = await post(
      jsonRequest("http://test/api/model-answers", {
        sessionN: 99,
        question: CANON_QUESTION,
      })
    );
    expect(missing.status).toBe(404);
  });

  it("accepts session 0's exercise text as its question", async () => {
    const { getSessionPlan } = await import("@/server/canon");
    const exercise = getSessionPlan(temp.db, 0)!.session.exercise!;
    const res = await post(
      jsonRequest("http://test/api/model-answers", {
        sessionN: 0,
        question: exercise,
      })
    );
    expect(res.status).toBe(200);
  });
});
