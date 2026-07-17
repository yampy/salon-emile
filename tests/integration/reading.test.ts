/**
 * Integration: session readings — generated once from the canon (mock),
 * cached, and canon-checked (thesesGuide ids must resolve).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { llmUsage, sessionReadings } from "@/db/schema";
import { jsonRequest, setupTempDb, type TempDb } from "./helpers";

let temp: TempDb;
let post: typeof import("@/app/api/readings/route").POST;

beforeAll(async () => {
  temp = setupTempDb("reading");
  ({ POST: post } = await import("@/app/api/readings/route"));
});

afterAll(() => temp.cleanup());

describe("POST /api/readings", () => {
  it("generates a structured reading for a session", async () => {
    const res = await post(jsonRequest("http://test/api/readings", { sessionN: 1 }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      cached: boolean;
      reading: {
        catchphrase: string;
        hook: string;
        steps: { title: string; body: string; example: string }[];
        thesesGuide: { id: string }[];
        recap: string;
      };
    };
    expect(data.cached).toBe(false);
    expect(data.reading.catchphrase.length).toBeGreaterThan(0);
    expect(data.reading.steps.length).toBeGreaterThanOrEqual(3);
    for (const step of data.reading.steps) {
      expect(step.example.length).toBeGreaterThan(0);
    }
    // canon guardrail: every thesesGuide id resolves against session 1
    for (const guide of data.reading.thesesGuide) {
      expect(guide.id).toMatch(/^s1-t[1-4]$/);
    }
    expect(
      temp.db.select().from(llmUsage).where(eq(llmUsage.role, "reading")).all()
    ).toHaveLength(1);
  });

  it("serves the cached reading without a new LLM call", async () => {
    const res = await post(jsonRequest("http://test/api/readings", { sessionN: 1 }));
    const data = (await res.json()) as { cached: boolean };
    expect(data.cached).toBe(true);
    expect(temp.db.select().from(sessionReadings).all()).toHaveLength(1);
    expect(
      temp.db.select().from(llmUsage).where(eq(llmUsage.role, "reading")).all()
    ).toHaveLength(1);
  });

  it("rejects unknown sessions and bad bodies", async () => {
    expect(
      (await post(jsonRequest("http://test/api/readings", { sessionN: 99 }))).status
    ).toBe(404);
    expect(
      (await post(jsonRequest("http://test/api/readings", {}))).status
    ).toBe(400);
  });
});
