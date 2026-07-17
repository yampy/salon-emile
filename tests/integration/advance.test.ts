/**
 * Integration: learner-initiated advance — same production gate as the
 * tutor's tool, judged by the server.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordMessage } from "@/server/lesson";
import {
  jsonRequest,
  paramsContext,
  setupTempDb,
  SUBSTANTIVE_ANSWER,
  type TempDb,
} from "./helpers";

let temp: TempDb;
let chatPost: typeof import("@/app/api/lessons/[n]/chat/route").POST;
let advancePost: typeof import("@/app/api/lessons/[n]/advance/route").POST;

beforeAll(async () => {
  temp = setupTempDb("advance");
  ({ POST: chatPost } = await import("@/app/api/lessons/[n]/chat/route"));
  ({ POST: advancePost } = await import("@/app/api/lessons/[n]/advance/route"));
});

afterAll(() => temp.cleanup());

describe("POST /api/lessons/[n]/advance", () => {
  it("404s without an active run", async () => {
    const res = await advancePost(
      new Request("http://test/api/lessons/2/advance", { method: "POST" }),
      paramsContext({ n: "2" })
    );
    expect(res.status).toBe(404);
  });

  it("409s when the current step has no substantive production", async () => {
    // start the lesson (assistant opener only — no learner production)
    await (
      await chatPost(
        jsonRequest("http://test/api/lessons/2/chat", { start: true }),
        paramsContext({ n: "2" })
      )
    ).text();

    const res = await advancePost(
      new Request("http://test/api/lessons/2/advance", { method: "POST" }),
      paramsContext({ n: "2" })
    );
    expect(res.status).toBe(409);
    const data = (await res.json()) as { error: string; message: string };
    expect(data.error).toBe("no_production");
    expect(data.message.length).toBeGreaterThan(0);
  });

  it("advances once a substantive production exists in the step", async () => {
    // record the learner production directly (bypassing the tutor's own
    // advance request) — the manual button path
    const { getActiveRun } = await import("@/server/lesson");
    const run = getActiveRun(temp.db, 2)!;
    recordMessage(temp.db, run.id, "user", run.step, SUBSTANTIVE_ANSWER);

    const res = await advancePost(
      new Request("http://test/api/lessons/2/advance", { method: "POST" }),
      paramsContext({ n: "2" })
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { advanced: boolean; step: string };
    expect(data.advanced).toBe(true);
    expect(data.step).toBe("definition_reperes");
  });

  it("completes the lesson from the terminal step", async () => {
    const { getActiveRun } = await import("@/server/lesson");
    // walk to bridge via direct productions + advances
    for (let i = 0; i < 4; i++) {
      const run = getActiveRun(temp.db, 2)!;
      recordMessage(temp.db, run.id, "user", run.step, SUBSTANTIVE_ANSWER);
      await advancePost(
        new Request("http://test/api/lessons/2/advance", { method: "POST" }),
        paramsContext({ n: "2" })
      );
    }
    const run = getActiveRun(temp.db, 2)!;
    expect(run.step).toBe("bridge");
    recordMessage(temp.db, run.id, "user", run.step, SUBSTANTIVE_ANSWER);
    const res = await advancePost(
      new Request("http://test/api/lessons/2/advance", { method: "POST" }),
      paramsContext({ n: "2" })
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { completed: boolean };
    expect(data.completed).toBe(true);
  });
});
