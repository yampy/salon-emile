/**
 * Deterministic mock LLM. Tests, CI and E2E run exclusively against this
 * client — no API key, no network, and identical output for identical input.
 *
 * Dispatch rules (all derived from the prompt text itself):
 * - chat: a fixed advisor answer (when the advisor marker is present) or a
 *   generic fallback.
 * - evaluation: strong scores for answers >= 40 chars, weak (lapse-worthy)
 *   scores below that.
 * - cardGrade: 3.0 for answers >= 10 chars, 1.0 below.
 * - variant: transforms the <question> tag, numbered by prior variants.
 */
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

const FALLBACK_REPLY =
  "続けましょう。いまの考えを、もう一歩だけ言葉にしてみてください。";

const ADVISOR_REPLY =
  "よい質問です。それは「知ること」と「感じること」の区別に関わる主題ですね。あなた自身の経験から出発して考えると理解が深まります。\n\n参考になる回: 第0回(問いの立て方そのものを学べます)・第1回(意識と自己認識を扱います。テーゼ [s1-t1] が出発点になります)。";

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
    const isAdvisor = systemText.includes("役割: 案内人(advisor)");
    const reply = isAdvisor ? ADVISOR_REPLY : FALLBACK_REPLY;
    return {
      textStream: chunked(reply),
      final: async () => ({ text: reply, usage: MOCK_USAGE }),
    };
  }

  async generateObject<T>(
    params: GenerateObjectParams<T>
  ): Promise<GenerateObjectResult<T>> {
    const systemText = params.system.map((b) => b.text).join("\n");
    const raw = this.fixtureFor(params.schemaName, params.prompt, systemText);
    return { object: params.schema.parse(raw), usage: MOCK_USAGE };
  }

  private fixtureFor(
    schemaName: GenerateObjectParams<unknown>["schemaName"],
    prompt: string,
    systemText: string
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
      case "reading": {
        // Thesis ids live in the injected session plan (system blocks).
        const thesisIds = [
          ...`${systemText}\n${prompt}`.matchAll(/\[(s\d+-t\d+)\]/g),
        ].map((m) => m[1]);
        const uniqueIds = [...new Set(thesisIds)];
        return {
          catchphrase: "あたりまえを、問いに変える回。",
          hook: "あなたにも「考えれば考えるほど分からなくなった」経験はありませんか。この回では、その分からなさこそが哲学の入口であることを確かめます。",
          steps: [
            {
              title: "まず、直観で答えてみる",
              body: "難しく考える前に、いまの自分の感覚で答えてみましょう。哲学は正解当てではなく、直観を言葉にするところから始まります。",
              example: "部活の練習がきつい日、「なんのためにやってるんだろう」とふと思う。あの瞬間があなたの直観です。",
            },
            {
              title: "逆の直観も、実はある",
              body: "最初の答えの逆を考えてみると、そちらにも理があることに気づきます。両方に理があるとき、そこに問いが生まれます。",
              example: "SNSをやめたいのにやめられない。自由の妨げにも、つながりの条件にも見える——どちらも本当です。",
            },
            {
              title: "緊張を一文にする",
              body: "対立する二つの直観を一つの文に束ねたものが問題化(problématisation)です。これができれば、論述の骨格は完成しています。",
              example: "試合で「勝ちたい」と「楽しみたい」がぶつかるとき、その緊張を言葉にできる選手は強い。",
            },
          ],
          thesesGuide: uniqueIds.map((id) => ({
            id,
            friendly: `このテーゼ [${id}] は、要するに問いの一方の直観を最も強い形で言い切ったものです。`,
          })),
          recap: "直観には必ず逆の直観がある。\n両方に理があるとき、問いが生まれる。\nこれであなたは、意見の対立を「問い」に変えられる。",
        };
      }
      case "aiAnswer": {
        const exercise = extractTag(prompt, "exercise");
        return {
          answer: `たとえばこう考えられます — ${exercise.slice(0, 24)}…に対して、直観A(肯定)と直観B(否定)をそれぞれ一文で立て、両方に理がある緊張として結びます。`,
        };
      }
      case "modelAnswer": {
        const question = extractTag(prompt, "question");
        return {
          problematique: `「${question}」は、両立しがたい二つの直観の緊張として定式化できる。`,
          these: "第一の立場を最強の形で擁護する。直観Aには確かな根拠がある。",
          antithese:
            "しかしテーゼ自身の前提に内在的な限界がある。外部からの反論ではなく、その前提を掘り下げる。",
          depassement:
            "ゆえに問いの前提そのものを再検討し、問いを再定式化することで緊張を乗り越える。",
        };
      }
    }
  }
}
