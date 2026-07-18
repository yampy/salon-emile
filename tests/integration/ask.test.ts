/**
 * Integration: the global Q&A thread — streaming answers grounded in the
 * whole canon, persistent history, session references, clear.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { advisorMessages } from "@/db/schema";
import { buildCanonDigest } from "@/server/advisor";
import { jsonRequest, setupTempDb, type TempDb } from "./helpers";

let temp: TempDb;
let post: typeof import("@/app/api/ask/route").POST;
let del: typeof import("@/app/api/ask/route").DELETE;

beforeAll(async () => {
  temp = setupTempDb("ask");
  ({ POST: post, DELETE: del } = await import("@/app/api/ask/route"));
});

afterAll(() => temp.cleanup());

describe("canon digest", () => {
  it("covers every session, repère and thesis", () => {
    const digest = buildCanonDigest(temp.db);
    for (let n = 0; n <= 16; n++) {
      expect(digest).toContain(`第${n}回`);
    }
    expect(digest).toContain("[absolu-relatif]");
    expect(digest).toContain("[s1-t1]");
    expect(digest).toContain("[s16-t4]");
  });
});

describe("POST /api/ask", () => {
  it("streams an answer that cites relevant sessions, and persists both turns", async () => {
    const res = await post(
      jsonRequest("http://test/api/ask", {
        message: "自分のことは自分が一番わかっている、は本当ですか?",
      })
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/第\d+回/);

    const stored = temp.db.select().from(advisorMessages).all();
    expect(stored).toHaveLength(2);
    expect(stored[0].role).toBe("user");
    expect(stored[1].role).toBe("assistant");
    expect(stored[1].content).toBe(text);
  });

  it("keeps the thread growing across questions", async () => {
    await (
      await post(jsonRequest("http://test/api/ask", { message: "続きの質問です" }))
    ).text();
    expect(temp.db.select().from(advisorMessages).all()).toHaveLength(4);
  });

  it("rejects empty questions", async () => {
    expect(
      (await post(jsonRequest("http://test/api/ask", { message: "  " }))).status
    ).toBe(400);
  });
});

describe("DELETE /api/ask", () => {
  it("clears the thread", async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(temp.db.select().from(advisorMessages).all()).toHaveLength(0);
  });
});
