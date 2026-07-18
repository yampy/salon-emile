/**
 * Integration: the chat route against a temp SQLite + mock LLM.
 * Covers streaming, persistence, and the server-side advance judgment.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { lessonRuns } from "@/db/schema";
import {
  jsonRequest,
  paramsContext,
  setupTempDb,
  SUBSTANTIVE_ANSWER,
  type TempDb,
} from "./helpers";

let temp: TempDb;
let chatPost: typeof import("@/app/api/lessons/[n]/chat/route").POST;
let stateGet: typeof import("@/app/api/lessons/[n]/route").GET;

beforeAll(async () => {
  temp = setupTempDb("chat");
  ({ POST: chatPost } = await import("@/app/api/lessons/[n]/chat/route"));
  ({ GET: stateGet } = await import("@/app/api/lessons/[n]/route"));
});

afterAll(() => temp.cleanup());

async function getState(n: string) {
  const res = await stateGet(
    new Request(`http://test/api/lessons/${n}`),
    paramsContext({ n })
  );
  return (await res.json()) as {
    run: {
      step: string;
      status: string;
      messages: { role: string; content: string }[];
    } | null;
  };
}

describe("POST /api/lessons/[n]/chat", () => {
  it("streams the tutor opener on start and persists it", async () => {
    const res = await chatPost(
      jsonRequest("http://test/api/lessons/0/chat", { start: true }),
      paramsContext({ n: "0" })
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);

    const state = await getState("0");
    expect(state.run?.step).toBe("intuition");
    expect(state.run?.messages).toHaveLength(1);
    expect(state.run?.messages[0].role).toBe("assistant");
    expect(state.run?.messages[0].content).toBe(text);
  });

  it("does not advance on a trivial learner message", async () => {
    await (
      await chatPost(
        jsonRequest("http://test/api/lessons/0/chat", { message: "はい" }),
        paramsContext({ n: "0" })
      )
    ).text();
    const state = await getState("0");
    expect(state.run?.step).toBe("intuition");
  });

  it("advances after a substantive learner production", async () => {
    await (
      await chatPost(
        jsonRequest("http://test/api/lessons/0/chat", {
          message: SUBSTANTIVE_ANSWER,
        }),
        paramsContext({ n: "0" })
      )
    ).text();
    const state = await getState("0");
    expect(state.run?.step).toBe("definition_reperes");
  });

  it("starts the advanced step with a clean chat", async () => {
    const state = await getState("0");
    expect(state.run?.step).toBe("definition_reperes");
    // per-step chat: the new step carries none of the intuition dialogue
    expect(state.run?.messages).toHaveLength(0);
  });

  it("resets the current step's dialogue and its productions", async () => {
    const { getActiveRun, recordMessage } = await import("@/server/lesson");
    const run = getActiveRun(temp.db, 0)!;
    // a substantive production recorded directly (no tutor advance)
    recordMessage(temp.db, run.id, "user", run.step, SUBSTANTIVE_ANSWER);
    expect((await getState("0")).run?.messages).toHaveLength(1);

    const { DELETE: chatDelete } = await import("@/app/api/lessons/[n]/chat/route");
    const res = await chatDelete(
      new Request("http://test/api/lessons/0/chat", { method: "DELETE" }),
      paramsContext({ n: "0" })
    );
    expect(res.status).toBe(200);
    expect((await getState("0")).run?.messages).toHaveLength(0);

    // the advance gate starts over: the wiped production no longer counts
    const { POST: advancePost } = await import(
      "@/app/api/lessons/[n]/advance/route"
    );
    const blocked = await advancePost(
      new Request("http://test/api/lessons/0/advance", { method: "POST" }),
      paramsContext({ n: "0" })
    );
    expect(blocked.status).toBe(409);
  });

  it("completes the lesson at the terminal step", async () => {
    // definition_reperes -> theses -> question -> essay -> bridge -> completed
    for (let i = 0; i < 5; i++) {
      await (
        await chatPost(
          jsonRequest("http://test/api/lessons/0/chat", {
            message: SUBSTANTIVE_ANSWER,
          }),
          paramsContext({ n: "0" })
        )
      ).text();
    }
    const state = await getState("0");
    expect(state.run?.status).toBe("completed");

    const run = temp.db
      .select()
      .from(lessonRuns)
      .where(eq(lessonRuns.sessionN, 0))
      .get();
    expect(run?.completedAt).not.toBeNull();
  });

  it("rejects invalid bodies and unknown sessions", async () => {
    const bad = await chatPost(
      jsonRequest("http://test/api/lessons/1/chat", {}),
      paramsContext({ n: "1" })
    );
    expect(bad.status).toBe(400);

    const missing = await chatPost(
      jsonRequest("http://test/api/lessons/99/chat", { start: true }),
      paramsContext({ n: "99" })
    );
    expect(missing.status).toBe(404);
  });
});
