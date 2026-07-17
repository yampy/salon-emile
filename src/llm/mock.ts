/**
 * Deterministic mock LLM. Tests, CI and E2E run exclusively against this
 * client — no API key, no network, and identical output for identical input.
 *
 * Dispatch rules (all derived from the prompt text itself):
 * - tutor: canned reply per lesson step (parsed from the volatile system
 *   block); requests advance_step iff the last user message is substantive.
 * - evaluation: strong scores for answers >= 40 chars, weak (lapse-worthy)
 *   scores below that.
 * - cardGrade: 3.0 for answers >= 10 chars, 1.0 below.
 * - variant: transforms the <question> tag, numbered by prior variants.
 */
import { isSubstantiveProduction, type LessonStep } from "@/domain/lesson";
import type {
  ChatStream,
  ChatStreamParams,
  GenerateObjectParams,
  GenerateObjectResult,
  LlmClient,
  LlmUsage,
} from "./types";

/** Answer length (chars) at which the mock grader turns favorable. */
export const MOCK_STRONG_ANSWER_LENGTH = 40;
/** Answer length (chars) at which the mock card grader passes a recall. */
export const MOCK_CARD_PASS_LENGTH = 10;

const MOCK_USAGE: LlmUsage = { inputTokens: 0, outputTokens: 0 };

const TUTOR_REPLIES: Record<LessonStep, string> = {
  intuition:
    "ようこそ、サロンへ。まず即答でかまいません——この問いに、あなたの最初の直観はどう答えますか。そう考える理由も一文で添えてください。",
  definition_reperes:
    "よい出発点です。では、いま使った言葉を自分の言葉で定義してみましょう。この回のrepèresの対を使うと、どこに線が引けますか。",
  theses:
    "あなたの定義を、正典のテーゼと突き合わせてみましょう。このテーゼに、あなたは賛成しますか、反対しますか。理由を一文で。",
  question:
    "ここまでで、対立する二つの直観が見えてきました。両方に理があるとすれば、問いはどう定式化できますか。緊張を一文にしてください。",
  essay:
    "では小さな論述に挑戦しましょう。thèse→antithèse→dépassementの順で、数文ずつ書いてみてください。書き終えるまで私は評価しません。",
  bridge:
    "今日の議論で、あなたの最初の直観はどう変化しましたか。一文で要約してください。それが次回への橋になります。",
};

const FALLBACK_REPLY =
  "続けましょう。いまの考えを、もう一歩だけ言葉にしてみてください。";

function parseStep(systemText: string): LessonStep | null {
  const match = systemText.match(/現在のステップ: (\w+)/);
  return match ? (match[1] as LessonStep) : null;
}

function extractTag(text: string, tag: string): string {
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1] : "";
}

async function* chunked(text: string): AsyncIterable<string> {
  const CHUNK = 12;
  for (let i = 0; i < text.length; i += CHUNK) {
    yield text.slice(i, i + CHUNK);
  }
}

export class MockLlmClient implements LlmClient {
  async chatStream(params: ChatStreamParams): Promise<ChatStream> {
    const systemText = params.system.map((b) => b.text).join("\n");
    const step = parseStep(systemText);
    const reply = step ? TUTOR_REPLIES[step] : FALLBACK_REPLY;
    const lastUser = [...params.messages]
      .reverse()
      .find((m) => m.role === "user");
    const advanceRequested =
      params.allowAdvance &&
      lastUser !== undefined &&
      isSubstantiveProduction(lastUser.content);

    return {
      textStream: chunked(reply),
      final: async () => ({
        text: reply,
        advanceRequested,
        usage: MOCK_USAGE,
      }),
    };
  }

  async generateObject<T>(
    params: GenerateObjectParams<T>
  ): Promise<GenerateObjectResult<T>> {
    const raw = this.fixtureFor(params.schemaName, params.prompt);
    return { object: params.schema.parse(raw), usage: MOCK_USAGE };
  }

  private fixtureFor(
    schemaName: GenerateObjectParams<unknown>["schemaName"],
    prompt: string
  ): unknown {
    switch (schemaName) {
      case "evaluation": {
        const answer = extractTag(prompt, "answer");
        const strong = answer.length >= MOCK_STRONG_ANSWER_LENGTH;
        const scores = strong
          ? {
              problematisation: 3,
              concepts: 2,
              argumentation: 3,
              culture: 2,
              expression: 3,
            }
          : {
              problematisation: 1,
              concepts: 1,
              argumentation: 1,
              culture: 1,
              expression: 1,
            };
        return {
          scores,
          evidence: [
            {
              criterion: "problematisation",
              quote: answer.slice(0, 30),
              comment: strong
                ? "対立する直観への言及が見られる。"
                : "問いの緊張がまだ言語化されていない。",
            },
          ],
          feedback: strong
            ? "次の一手: antithèseを外部からの反論ではなく、テーゼ自身の前提の限界として書き直す。"
            : "次の一手: まず対立する二つの直観をそれぞれ一文で書き出す。",
          missingReperes: [],
          missingTheses: [],
        };
      }
      case "cardGrade": {
        const answer = extractTag(prompt, "answer");
        const pass = answer.length >= MOCK_CARD_PASS_LENGTH;
        return {
          score: pass ? 3 : 1,
          comment: pass
            ? "要点は想起できている。適用の一文をより具体的に。"
            : "想起が不十分。表の対概念から意味を再構成してみること。",
        };
      }
      case "variant": {
        const question = extractTag(prompt, "question");
        const priorCount = (prompt.match(/<previous>/g) ?? []).length;
        return {
          question: `【変形${priorCount + 1}】「${question}」と同じ緊張を、別の具体例に即して定式化せよ。`,
        };
      }
    }
  }
}
