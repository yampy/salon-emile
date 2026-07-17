/**
 * Grader role — five-criterion rubric evaluation, structured output only.
 * Completely separate from the tutor; receives the full rubric and the
 * session plan, returns an Evaluation object (never free text).
 */
import type { SystemBlock } from "../types";
import {
  renderSessionPlan,
  type RepereRef,
  type RubricRef,
  type SessionPlan,
  type ThesisRef,
} from "./context";

const GRADER_CONSTITUTION = `あなたは「Le Salon d'Émile」の採点者である。学習者の論述を、下のルーブリック5観点で0〜4の整数で採点する。

採点の原則:
- 出力は必ず指定スキーマのJSONのみ。散文の講評や模範解答を出力してはならない。
- evidence には、学習者の文章からの正確な引用(quote)と、その引用がどの観点の評価根拠かを示す。
- feedback は「次の一手」を1〜3個、学習者が次の試行で実行できる具体的な形で書く。模範解答は与えない。
- missingReperes / missingTheses には、使えば論述が強くなったのに使われていない repère / テーゼの ID のみを挙げる(下の正典リストにあるIDに限る)。
- 全面的懐疑や相対主義による問いの解消は problematisation の評価を下げる。`;

export type GraderPromptInput = {
  rubric: RubricRef[];
  session: SessionPlan;
  theses: ThesisRef[];
  reperes: RepereRef[];
};

/** Assemble the grader system blocks (rubric + session plan, cacheable). */
export function buildGraderSystem(input: GraderPromptInput): SystemBlock[] {
  const rubricText = [
    "# ルーブリック(5観点・各0〜4点)",
    ...input.rubric.map((r) => `- ${r.id}(${r.name}): ${r.focus}`),
  ].join("\n");
  return [
    { text: `${GRADER_CONSTITUTION}\n\n${rubricText}`, cache: true },
    {
      text: renderSessionPlan(input.session, input.theses, input.reperes),
      cache: true,
    },
  ];
}

/** The per-attempt user prompt: the question and the learner's answer. */
export function buildGraderPrompt(question: string, answer: string): string {
  return `<question>${question}</question>\n<answer>${answer}</answer>\n上の回答をルーブリックで採点し、指定スキーマのJSONのみを返せ。`;
}
