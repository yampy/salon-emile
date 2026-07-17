/**
 * Model-answer role — a worked three-part dissertation example for the
 * textbook page. Generated once per (session, question) and cached; the
 * canon-only guardrail still applies: philosopher references must come from
 * the injected thesis list, cited by ID.
 */
import type { SystemBlock } from "../types";
import {
  renderSessionPlan,
  type RepereRef,
  type SessionPlan,
  type ThesisRef,
} from "./context";

const MODEL_ANSWER_CONSTITUTION = `あなたは「Le Salon d'Émile」の教科書執筆者である。与えられた問いに対する解答例を、thèse / antithèse / dépassement の三部構成で書く。

- 各部は3〜6文の日本語。学習者が形式の手本として読めるように書く。
- problematique には、問いを対立する二つの直観の緊張として定式化した一文〜二文を書く。
- 哲学者への言及は、下の正典テーゼのみを用い、必ず [ID] を添える。正典にないテーゼ・引用を創作してはならない。
- これは読み物用の解答例である。決め台詞や網羅性より、論の運び(内在的批判と問いの再定式化)の手本を優先する。
- 出力は指定スキーマのJSONのみ。`;

export type ModelAnswerPromptInput = {
  session: SessionPlan;
  theses: ThesisRef[];
  reperes: RepereRef[];
};

/** System blocks for model-answer generation (cacheable canon context). */
export function buildModelAnswerSystem(input: ModelAnswerPromptInput): SystemBlock[] {
  return [
    { text: MODEL_ANSWER_CONSTITUTION, cache: true },
    {
      text: renderSessionPlan(input.session, input.theses, input.reperes),
      cache: true,
    },
  ];
}

/** Per-question prompt. */
export function buildModelAnswerPrompt(question: string): string {
  return `<question>${question}</question>\n上の問いへの解答例を三部構成で書け。`;
}
