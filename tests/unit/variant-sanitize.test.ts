import { describe, expect, it } from "vitest";
import { sanitizeVariantQuestion } from "@/server/grading";

describe("sanitizeVariantQuestion", () => {
  it("passes plain questions through", () => {
    expect(sanitizeVariantQuestion("他者の真の意図を知ることはできるか")).toBe(
      "他者の真の意図を知ることはできるか"
    );
  });

  it("extracts variant_question from an analysis JSON blob", () => {
    const blob = JSON.stringify({
      original_question: "人は自分自身を知ることができるか",
      underlying_intuitions: { affirmative: "…", skeptical: "…" },
      variant_question: "他者の真の意図を知ることはできるか",
      variant_rationale: { surface_changes: ["…"], preserved_depth: "…" },
    });
    expect(sanitizeVariantQuestion(blob)).toBe(
      "他者の真の意図を知ることはできるか"
    );
  });

  it("extracts a question field when present", () => {
    expect(
      sanitizeVariantQuestion('{ "question": "記憶は現在の自己を縛るか" }')
    ).toBe("記憶は現在の自己を縛るか");
  });

  it("returns malformed JSON-ish text unchanged", () => {
    expect(sanitizeVariantQuestion("{壊れたテキスト")).toBe("{壊れたテキスト");
  });
});
