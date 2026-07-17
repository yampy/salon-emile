import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db/client";
import { cards, theses } from "@/db/schema";
import { cardId, loadCurriculum, seedDb } from "@/db/seed";
import { getSetting, setSetting } from "@/db/settings";
import { verifyDb } from "@/db/verify";
import { EXPECTED_COUNTS } from "@/domain/curriculum.schema";

describe("seed is idempotent", () => {
  let dir: string;
  let db: Db;
  const curriculum = loadCurriculum();
  const now = new Date("2026-01-01T00:00:00.000Z");

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "salon-emile-seed-"));
    db = createDb(path.join(dir, "test.sqlite"));
    seedDb(db, curriculum, now);
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("passes verification after the first seed", () => {
    const { counts, ok } = verifyDb(db);
    expect(ok).toBe(true);
    expect(counts).toEqual(EXPECTED_COUNTS);
  });

  it("creates one review card per repere and per thesis", () => {
    const all = db.select().from(cards).all();
    expect(all.filter((c) => c.kind === "repere")).toHaveLength(31);
    expect(all.filter((c) => c.kind === "thesis")).toHaveLength(64);
    expect(all.filter((c) => c.kind === "lapse")).toHaveLength(0);
  });

  it("keeps counts stable across reseeds", () => {
    seedDb(db, curriculum, new Date("2026-02-01T00:00:00.000Z"));
    seedDb(db, curriculum, new Date("2026-03-01T00:00:00.000Z"));
    const { counts, ok } = verifyDb(db);
    expect(ok).toBe(true);
    expect(counts).toEqual(EXPECTED_COUNTS);
    expect(db.select().from(cards).all()).toHaveLength(31 + 64);
  });

  it("preserves FSRS learning state on reseed", () => {
    const id = cardId("repere", curriculum.reperes[0].id);
    const reviewed = new Date("2026-06-01T00:00:00.000Z");
    db.update(cards)
      .set({ due: reviewed, reps: 3, stability: 12.5 })
      .where(eq(cards.id, id))
      .run();

    seedDb(db, curriculum, new Date("2026-06-15T00:00:00.000Z"));

    const card = db.select().from(cards).where(eq(cards.id, id)).get();
    expect(card?.reps).toBe(3);
    expect(card?.stability).toBe(12.5);
    expect(card?.due.getTime()).toBe(reviewed.getTime());
  });

  it("preserves user settings on reseed but fills missing defaults", () => {
    setSetting(db, "tutorModel", "user-chosen-model");
    seedDb(db, curriculum, now);
    expect(getSetting(db, "tutorModel")).toBe("user-chosen-model");
    expect(getSetting(db, "graderModel")).not.toBeNull();
    expect(getSetting(db, "lightModel")).not.toBeNull();
  });

  it("refreshes canon content on reseed", () => {
    const id = "s1-t1";
    db.update(theses).set({ claim: "tampered" }).where(eq(theses.id, id)).run();
    seedDb(db, curriculum, now);
    const thesis = db.select().from(theses).where(eq(theses.id, id)).get();
    expect(thesis?.claim).not.toBe("tampered");
  });
});
