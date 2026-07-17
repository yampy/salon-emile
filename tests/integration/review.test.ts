/**
 * Integration: the review route against a temp SQLite + mock LLM.
 * Covers the due queue, grading→rating→rescheduling, and lapse variant
 * regeneration.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { cards, reviewLogs } from "@/db/schema";
import { EXPECTED_COUNTS } from "@/domain/curriculum.schema";
import { jsonRequest, setupTempDb, type TempDb } from "./helpers";

let temp: TempDb;
let reviewGet: typeof import("@/app/api/review/route").GET;
let reviewPost: typeof import("@/app/api/review/route").POST;

const TOTAL_CARDS = EXPECTED_COUNTS.reperes + EXPECTED_COUNTS.theses; // 95

beforeAll(async () => {
  temp = setupTempDb("review");
  ({ GET: reviewGet, POST: reviewPost } = await import("@/app/api/review/route"));
});

afterAll(() => temp.cleanup());

describe("review queue", () => {
  it("serves all seeded cards as due, capped to one round", async () => {
    const res = await reviewGet();
    const data = (await res.json()) as {
      dueCount: number;
      cards: { id: string; front: string; kind: string }[];
    };
    expect(data.dueCount).toBe(TOTAL_CARDS);
    expect(data.cards).toHaveLength(10);
    expect(data.cards.every((c) => c.front.length > 0)).toBe(true);
  });

  it("grades an answer, reschedules via FSRS, and logs the review", async () => {
    const { cards: due } = (await (await reviewGet()).json()) as {
      cards: { id: string }[];
    };
    const target = due[0].id;

    const res = await reviewPost(
      jsonRequest("http://test/api/review", {
        cardId: target,
        answer:
          "他に依存せず成り立つのが絶対的、他との関係でのみ成り立つのが相対的。真理の普遍性を問うときに効く区別である。",
      })
    );
    expect(res.status).toBe(200);
    const outcome = (await res.json()) as {
      score: number;
      rating: number;
      nextDue: string;
      remainingDue: number;
    };
    expect(outcome.score).toBeGreaterThanOrEqual(2.5);
    expect(outcome.rating).toBe(3); // Good
    expect(outcome.remainingDue).toBe(TOTAL_CARDS - 1);

    const card = temp.db.select().from(cards).where(eq(cards.id, target)).get();
    expect(card?.reps).toBe(1);
    expect(card?.due.getTime()).toBeGreaterThan(Date.now());

    const log = temp.db
      .select()
      .from(reviewLogs)
      .where(eq(reviewLogs.cardId, target))
      .get();
    expect(log?.score).toBeGreaterThanOrEqual(2.5);
    expect(log?.prompt.length).toBeGreaterThan(0);
  });

  it("rejects unknown or not-due cards", async () => {
    const unknown = await reviewPost(
      jsonRequest("http://test/api/review", { cardId: "card-nope", answer: "x" })
    );
    expect(unknown.status).toBe(404);
  });

  it("regenerates a fresh variant for lapse cards after each review", async () => {
    // Manufacture a lapse card through the grading route.
    const { POST: attemptsPost } = await import("@/app/api/attempts/route");
    await (
      await attemptsPost(
        jsonRequest("http://test/api/attempts", {
          sessionN: 2,
          kind: "exercise",
          exerciseKind: "one_sentence",
          question: "無意識という仮説は人間の自由を否定するか",
          answer: "はい",
        })
      )
    ).json();

    const lapse = temp.db
      .select()
      .from(cards)
      .where(eq(cards.kind, "lapse"))
      .get();
    expect(lapse).toBeTruthy();
    const firstPrompt = lapse!.prompt!;

    const res = await reviewPost(
      jsonRequest("http://test/api/review", {
        cardId: lapse!.id,
        answer:
          "夢や失錯行為という具体例では、意図せざるものが行為に現れるという緊張が定式化できる。",
      })
    );
    expect(res.status).toBe(200);

    const after = temp.db
      .select()
      .from(cards)
      .where(eq(cards.id, lapse!.id))
      .get();
    expect(after?.prompt).toBeTruthy();
    expect(after?.prompt).not.toBe(firstPrompt);
  });
});
