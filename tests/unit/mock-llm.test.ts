import { describe, expect, it } from "vitest";
import { CardGradeSchema, EvaluationSchema, VariantSchema } from "@/domain/evaluation.schema";
import { MockLlmClient } from "@/llm/mock";
import { buildCardGraderPrompt } from "@/llm/prompts/cardGrader";
import { buildGraderPrompt } from "@/llm/prompts/grader";
import { buildVariantPrompt } from "@/llm/prompts/variantGenerator";
import type { SystemBlock } from "@/llm/types";

const mock = new MockLlmClient();

const tutorSystem: SystemBlock[] = [
  { text: "constitution", cache: true },
  { text: "現在のステップ: intuition\n狙い: ..." },
];

const SUBSTANTIVE = "労働は自由の条件でもあり妨げでもあると思う。";

async function collect(stream: AsyncIterable<string>): Promise<string> {
  let out = "";
  for await (const chunk of stream) out += chunk;
  return out;
}

describe("MockLlmClient chatStream", () => {
  it("streams a deterministic step-specific reply", async () => {
    const a = await mock.chatStream({
      model: "m",
      system: tutorSystem,
      messages: [{ role: "user", content: "こんにちは" }],
      allowAdvance: true,
    });
    const b = await mock.chatStream({
      model: "m",
      system: tutorSystem,
      messages: [{ role: "user", content: "こんにちは" }],
      allowAdvance: true,
    });
    const [textA, textB] = [await collect(a.textStream), await collect(b.textStream)];
    expect(textA).toBe(textB);
    expect(textA).toBe((await b.final()).text);
    expect(textA.length).toBeGreaterThan(0);
  });

  it("requests advance only after substantive learner output", async () => {
    const withProduction = await mock.chatStream({
      model: "m",
      system: tutorSystem,
      messages: [{ role: "user", content: SUBSTANTIVE }],
      allowAdvance: true,
    });
    expect((await withProduction.final()).advanceRequested).toBe(true);

    const trivial = await mock.chatStream({
      model: "m",
      system: tutorSystem,
      messages: [{ role: "user", content: "はい" }],
      allowAdvance: true,
    });
    expect((await trivial.final()).advanceRequested).toBe(false);

    const disallowed = await mock.chatStream({
      model: "m",
      system: tutorSystem,
      messages: [{ role: "user", content: SUBSTANTIVE }],
      allowAdvance: false,
    });
    expect((await disallowed.final()).advanceRequested).toBe(false);
  });
});

describe("MockLlmClient generateObject", () => {
  it("returns a schema-valid strong evaluation for long answers", async () => {
    const answer =
      "労働は強制であると同時に、人間を自然の必然性から解放する営みでもある。この緊張こそが問いを成立させる。";
    const { object } = await mock.generateObject({
      model: "m",
      system: [],
      prompt: buildGraderPrompt("労働は自由の妨げか", answer),
      schema: EvaluationSchema,
      schemaName: "evaluation",
    });
    const avg =
      Object.values(object.scores).reduce((s, v) => s + v, 0) / 5;
    expect(avg).toBeGreaterThanOrEqual(2.0);
    expect(object.evidence[0].quote.length).toBeGreaterThan(0);
  });

  it("returns lapse-worthy scores for weak answers", async () => {
    const { object } = await mock.generateObject({
      model: "m",
      system: [],
      prompt: buildGraderPrompt("労働は自由の妨げか", "わからない"),
      schema: EvaluationSchema,
      schemaName: "evaluation",
    });
    const avg =
      Object.values(object.scores).reduce((s, v) => s + v, 0) / 5;
    expect(avg).toBeLessThan(2.0);
  });

  it("grades cards by recall substance", async () => {
    const pass = await mock.generateObject({
      model: "m",
      system: [],
      prompt: buildCardGraderPrompt("absolu / relatif", "絶対的/相対的", "他に依存せず成り立つ/他との関係でのみ成り立つ"),
      schema: CardGradeSchema,
      schemaName: "cardGrade",
    });
    expect(pass.object.score).toBeGreaterThanOrEqual(2.5);

    const fail = await mock.generateObject({
      model: "m",
      system: [],
      prompt: buildCardGraderPrompt("absolu / relatif", "絶対的/相対的", "?"),
      schema: CardGradeSchema,
      schemaName: "cardGrade",
    });
    expect(fail.object.score).toBeLessThan(1.5);
  });

  it("generates a fresh variant that differs from prior ones", async () => {
    const question = "人は自分自身を知ることができるか";
    const first = await mock.generateObject({
      model: "m",
      system: [],
      prompt: buildVariantPrompt(question, []),
      schema: VariantSchema,
      schemaName: "variant",
    });
    const second = await mock.generateObject({
      model: "m",
      system: [],
      prompt: buildVariantPrompt(question, [first.object.question]),
      schema: VariantSchema,
      schemaName: "variant",
    });
    expect(first.object.question).not.toBe(question);
    expect(second.object.question).not.toBe(first.object.question);
  });
});
