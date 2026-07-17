import { describe, expect, it } from "vitest";
import rawCurriculum from "@/data/curriculum.json";
import {
  assertExpectedCounts,
  countTheses,
  CurriculumSchema,
  EXPECTED_COUNTS,
  parseCurriculum,
  RUBRIC_CRITERIA,
  thesisId,
} from "@/domain/curriculum.schema";

describe("curriculum.json canon", () => {
  const curriculum = parseCurriculum(rawCurriculum);

  it("conforms to the Zod schema", () => {
    expect(CurriculumSchema.safeParse(rawCurriculum).success).toBe(true);
  });

  it("carries the expected cardinalities", () => {
    expect(assertExpectedCounts(curriculum)).toEqual(EXPECTED_COUNTS);
    expect(curriculum.sessions).toHaveLength(17);
    expect(curriculum.notions).toHaveLength(17);
    expect(curriculum.reperes).toHaveLength(31);
    expect(curriculum.rubric).toHaveLength(5);
    expect(countTheses(curriculum)).toBe(64);
    expect(curriculum.finalEssayQuestions).toHaveLength(10);
  });

  it("numbers sessions 0..16 exactly once each", () => {
    const ns = curriculum.sessions.map((s) => s.n).sort((a, b) => a - b);
    expect(ns).toEqual(Array.from({ length: 17 }, (_, i) => i));
  });

  it("uses exactly the five grader criteria as rubric ids", () => {
    expect(curriculum.rubric.map((r) => r.id)).toEqual([...RUBRIC_CRITERIA]);
  });

  it("references only known notions from sessions and final essay questions", () => {
    const notionIds = new Set(curriculum.notions.map((n) => n.id));
    for (const session of curriculum.sessions) {
      for (const id of session.notionIds) {
        expect(notionIds.has(id)).toBe(true);
      }
    }
    for (const q of curriculum.finalEssayQuestions) {
      expect(notionIds.has(q.notion)).toBe(true);
    }
  });

  it("gives session 0 the methodology fields and later sessions theses", () => {
    const session0 = curriculum.sessions.find((s) => s.n === 0);
    expect(session0?.method).toBeTruthy();
    expect(session0?.exercise).toBeTruthy();
    for (const session of curriculum.sessions.filter((s) => s.n > 0)) {
      expect(session.theses.length).toBeGreaterThan(0);
      expect(session.questions.length).toBeGreaterThan(0);
    }
  });

  it("rejects a canon with an unknown notion reference", () => {
    const broken = structuredClone(rawCurriculum) as typeof rawCurriculum & {
      finalEssayQuestions: { question: string; notion: string }[];
    };
    broken.finalEssayQuestions[0].notion = "no-such-notion";
    expect(CurriculumSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a canon with duplicate session numbers", () => {
    const broken = structuredClone(rawCurriculum) as {
      sessions: { n: number }[];
    };
    broken.sessions[1].n = broken.sessions[2].n;
    expect(CurriculumSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects structurally invalid input", () => {
    expect(CurriculumSchema.safeParse({}).success).toBe(false);
    expect(() => parseCurriculum(null)).toThrow();
  });

  it("derives stable thesis ids from position", () => {
    expect(thesisId(1, 0)).toBe("s1-t1");
    expect(thesisId(16, 3)).toBe("s16-t4");
  });

  it("assertExpectedCounts throws on a mismatched canon", () => {
    const broken = structuredClone(curriculum);
    broken.notions.pop();
    // bypass schema re-parse: counts check is independent of Zod validation
    expect(() => assertExpectedCounts(broken)).toThrow(/notions/);
  });
});
