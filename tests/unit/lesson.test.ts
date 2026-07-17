import { describe, expect, it } from "vitest";
import {
  advanceStep,
  INITIAL_STEP,
  isLessonStep,
  isSubstantiveProduction,
  isTerminalStep,
  LESSON_STEPS,
  nextStep,
  type LessonStep,
} from "@/domain/lesson";

const SUBSTANTIVE = "労働は自由の条件でもあり妨げでもある。";

describe("lesson step sequence", () => {
  it("starts at intuition and ends at bridge", () => {
    expect(INITIAL_STEP).toBe("intuition");
    expect(LESSON_STEPS).toEqual([
      "intuition",
      "definition_reperes",
      "theses",
      "question",
      "essay",
      "bridge",
    ]);
  });

  it("walks the steps strictly in order", () => {
    const walked: LessonStep[] = [INITIAL_STEP];
    let step: LessonStep | null = INITIAL_STEP;
    while ((step = nextStep(step)) !== null) {
      walked.push(step);
    }
    expect(walked).toEqual([...LESSON_STEPS]);
  });

  it("identifies the terminal step", () => {
    expect(isTerminalStep("bridge")).toBe(true);
    expect(isTerminalStep("essay")).toBe(false);
    expect(nextStep("bridge")).toBeNull();
  });

  it("recognizes step names", () => {
    expect(isLessonStep("theses")).toBe(true);
    expect(isLessonStep("confetti")).toBe(false);
  });
});

describe("substantive production", () => {
  it("accepts a genuine short answer", () => {
    expect(isSubstantiveProduction(SUBSTANTIVE)).toBe(true);
  });

  it("rejects bare acknowledgements and whitespace", () => {
    expect(isSubstantiveProduction("はい")).toBe(false);
    expect(isSubstantiveProduction("ok")).toBe(false);
    expect(isSubstantiveProduction("   \n\t  ")).toBe(false);
    expect(isSubstantiveProduction("")).toBe(false);
  });
});

describe("server-side advance judgment", () => {
  it("advances when the learner produced something substantive", () => {
    expect(advanceStep("intuition", [SUBSTANTIVE])).toEqual({
      ok: true,
      next: "definition_reperes",
    });
  });

  it("does not advance on LLM utterances alone (no learner production)", () => {
    expect(advanceStep("intuition", [])).toEqual({
      ok: false,
      reason: "no_production",
    });
  });

  it("does not advance on trivial productions", () => {
    expect(advanceStep("question", ["はい", "ok", " "])).toEqual({
      ok: false,
      reason: "no_production",
    });
  });

  it("advances when at least one of several productions is substantive", () => {
    expect(advanceStep("theses", ["はい", SUBSTANTIVE])).toEqual({
      ok: true,
      next: "question",
    });
  });

  it("refuses to advance past the terminal step", () => {
    expect(advanceStep("bridge", [SUBSTANTIVE])).toEqual({
      ok: false,
      reason: "terminal",
    });
  });

  it("walks a full lesson only through substantive productions", () => {
    let step: LessonStep = INITIAL_STEP;
    let advances = 0;
    for (;;) {
      const result = advanceStep(step, [SUBSTANTIVE]);
      if (!result.ok) break;
      step = result.next;
      advances += 1;
    }
    expect(step).toBe("bridge");
    expect(advances).toBe(LESSON_STEPS.length - 1);
  });
});
