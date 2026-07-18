/**
 * aiAnswer role — a worked answer for one *exercise statement* (the
 * 「AIに回答させる」button on the practice screen). Unlike the textbook's
 * three-part model answers, this answers the specific format's instruction
 * (twin intuitions, repère application, plan, …) exactly as a strong
 * learner would.
 */
import type { SystemBlock } from "../types";
import {
  renderSessionPlan,
  type RepereRef,
  type SessionPlan,
  type ThesisRef,
} from "./context";

const AI_ANSWER_CONSTITUTION = `あなたは「Le Salon d'Émile」の模範解答者である。与えられた演習の指示に、優れた学習者が書くとおりの回答例を書く。

- 指示された形式に正確に従う(二直観なら二つの直観を、プランなら見出しと要旨を、一文論述なら一文を)。
- 長さは学習者が現実に書く分量(形式に応じて1〜10文程度)。論文にしない。
- 哲学者への言及は、下の正典テーゼの範囲でのみ行い、[ID] を添える。創作しない。
- answer フィールドには回答本文のみを入れる。前置き・解説・メタ情報を含めない。
- 出力は指定スキーマのJSONのみ。`;

export type AiAnswerPromptInput = {
  session: SessionPlan;
  theses: ThesisRef[];
  reperes: RepereRef[];
};

/** System blocks (canon context cacheable). */
export function buildAiAnswerSystem(input: AiAnswerPromptInput): SystemBlock[] {
  return [
    { text: AI_ANSWER_CONSTITUTION, cache: true },
    {
      text: renderSessionPlan(input.session, input.theses, input.reperes),
      cache: true,
    },
  ];
}

/** Per-exercise prompt. */
export function buildAiAnswerPrompt(exerciseStatement: string): string {
  return `<exercise>${exerciseStatement}</exercise>\n上の演習の回答例を書け。`;
}
