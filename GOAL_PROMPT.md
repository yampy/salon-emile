# GOAL_PROMPT.md — Le Salon d'Émile 実装ゴール

> 使い方: このリポジトリで `claude` を起動し、
> `/goal GOAL_PROMPT.md の Definition of Done を全項目満たす。検証コマンド: pnpm typecheck && pnpm lint && pnpm test && pnpm e2e && pnpm build`
> を実行する。以後この文書が唯一の仕様である。

## 1. ミッション

フランス・リセ哲学カリキュラム(全17回)を自律学習するローカルWebアプリ **Le Salon d'Émile**(エミールのサロン)を、public GitHubとして公開できる品質でゼロから完成させる。設計は確定済みであり、あなたの仕事は解釈ではなく完遂である。制約は `CLAUDE.md` に従う。

**名称規約**: 表示名 **Le Salon d'Émile**(短縮形: le Salon)/ リポジトリ名・package.jsonのnameは `salon-emile`(Musée d'Orsay → musee-orsay と同じく、スラッグではd'を落とす)/ UIヘッダのロゴタイプは Émile をセリフ・イタリックで組む。名称の由来 — ルソー『エミール』の消極教育(教師は答えを与えず、発見が起きるよう経験を配置する=本アプリのガードレール思想)×啓蒙期パリのサロン(講義ではなく対話で哲学をする場=レッスンエンジン)。この由来はREADMEに1段落で記載する。

## 2. Definition of Done(すべてコマンドで検証可能であること)

- [ ] `pnpm install` → `pnpm build` が成功する
- [ ] `pnpm typecheck` / `pnpm lint` がエラー0
- [ ] `pnpm test`(unit+integration)が全green。**APIキー不要(MockLlmのみ)で通る**
- [ ] `pnpm e2e`(Playwright, `LLM_PROVIDER=mock`)が全green: ①第0回レッスン通し ②論述提出→5観点採点表示 ③復習キュー1周
- [ ] `pnpm db:seed` 後、`pnpm db:verify` が **sessions=17 / notions=17 / reperes=31 / rubric=5 / theses=64 / finalEssayQuestions=10** を確認して成功
- [ ] `README.md`(英語)と `README.ja.md`(日本語)が完成: プロジェクト紹介、名称の由来(Émile×salon・1段落)、機能一覧、スクリーンショット、mermaidアーキテクチャ図、Quickstart、テスト実行、設計思想(docs/adrへのリンク)、ライセンスバッジ
- [ ] `docs/adr/` にADR 7本(§5の各決定を1ファイル1決定で文書化)
- [ ] `LICENSE`(MIT)、`.env.example`、`.gitignore`(`data/`・`.env`・`*.sqlite` を含む)
- [ ] GitHub Actions CI(`.github/workflows/ci.yml`): lint / typecheck / test / build / e2e(mock)をpushで実行
- [ ] `docs/screenshots/` に主要5画面のスクリーンショット(Playwrightで自動生成するスクリプト `pnpm screenshots` を用意)
- [ ] 秘密情報の混入ゼロ(最終パスで全コミット走査)。`/tmp` へのfresh cloneでREADMEのQuickstart手順のみから起動・テストが再現する

## 3. 入力(リポジトリに配置済み)

- `CLAUDE.md` — プロジェクト憲法
- `src/data/curriculum.json` — 教材の唯一の正典(上記件数)

**最初のタスク**: 両ファイルの存在を確認し、curriculum.jsonをZodスキーマ(`src/domain/curriculum.schema.ts`)で検証するテストを書いてから実装に入る。

## 4. 技術制約

CLAUDE.mdの通り。Node 22 LTS / pnpm / Next.js App Router / TS strict / Tailwind + shadcn/ui / Vercel AI SDK + @ai-sdk/anthropic / Drizzle + better-sqlite3 / ts-fsrs / Zod / vitest / Playwright。これ以外の重量フレームワーク(LangChain等)・クラウドサービス・認証基盤は導入禁止。

## 5. アーキテクチャ指定

### 5.1 ディレクトリ(提案。合理的逸脱は `docs/decisions.md` に記録)

```
src/
  app/            # 画面とRoute Handlers
  domain/         # 純粋ロジック: 状態機械, EMA, FSRS写像, スキーマ
  llm/            # LlmClient, AnthropicClient, MockLlmClient, prompts/(4ロール)
  db/             # drizzleスキーマ, migrations適用, seed, verify
  data/           # curriculum.json
  components/
```

### 5.2 LLM層

- `LlmClient` インターフェース: `chatStream()`(tutor用)と `generateObject()`(grader/variant用)。
- `AnthropicClient` は Vercel AI SDK 経由。カリキュラム定型部+当該セッション指導案には **prompt caching(cache_control)** を適用。
- モデルは settings(DB)から解決: `tutorModel` / `graderModel` / `lightModel` の3スロット。コードに直書きしない(既定値は設定シードで投入)。
- `MockLlmClient` は決定的: ロール×状態ごとの定型応答、graderは固定の妥当なEvaluation JSONを返す。

### 5.3 レッスン状態機械(`src/domain/lesson.ts`)

状態: `intuition → definition_reperes → theses → question → essay → bridge`(第0回は curriculum の method/exercise を用いた同型フロー)。
遷移は**サーバ判定**: tutorがツールコール `advance_step` を要求し、サーバは「当該ステップに学習者の産出(実質的な回答)が1件以上あるか」を検証して初めて遷移させる。LLMの発話だけでは進まない。

### 5.4 採点(grader)

Zodスキーマ(この形を維持):

```ts
const Evaluation = z.object({
  scores: z.object({
    problematisation: z.number().int().min(0).max(4),
    concepts: z.number().int().min(0).max(4),
    argumentation: z.number().int().min(0).max(4),
    culture: z.number().int().min(0).max(4),
    expression: z.number().int().min(0).max(4),
  }),
  evidence: z.array(z.object({ criterion: z.string(), quote: z.string(), comment: z.string() })),
  feedback: z.string(),              // 次の一手を1〜3個
  missingReperes: z.array(z.string()),
  missingTheses: z.array(z.string()),
});
```

graderプロンプトにはルーブリック全文+当該セッションの指導案を注入。tutorとは完全に別モジュール。

### 5.5 習熟度

`mastery(notionId, criterion)` = EMA(α=0.3、score/4を入力)。ロードマップのゲートは**ソフト**: 当該回の平均mastery ≥ 0.6 で次回を「推奨」(ロックはしない)。

### 5.6 復習(FSRS)

- カード3種: `repere`(31枚: 仏語対→日本語の意味と適用一文)/ `thesis`(64枚: 哲学者→主張の要旨)/ `lapse`(評価平均<2.0の試行から自動生成される変形問題)。
- 回答は cardGrader が0〜4で軽量採点 → rating写像: `<1.5→Again / <2.5→Hard / <3.5→Good / それ以外→Easy` → ts-fsrsが次回日時を決定。
- `lapse` カードの再出題時は variantGenerator が**同型変形問題**を生成(同一問題の反復禁止)。

### 5.7 ガードレール(実装必須)

1. tutor/graderのシステム指示で、学習者の試行前の模範解答提示を禁止。
2. 「答えを見る」ボタン: `reveal` イベントをattemptsに記録し、直後に変形問題1問を必須挿入。ダッシュボードに「答えを見た率」を表示。
3. テーゼ・引用の生成は curriculum.json の正典に限定(プロンプトで明示+表示時にID照合)。

## 6. 機能スコープ

**M0**: スキャフォールド / curriculumスキーマ+シード+verify / レッスン対話(第0回が通しで動く、ストリーミング、対話のDB保存)
**M1**: 演習6形式(二直観抽出・repère適用・一文論述・problématique構築・プラン設計・ミニ論述)/ grader採点と履歴 / mastery EMA
**M2**: FSRSカード生成と復習キュー / ロードマップ画面(3部17ノード+31 repères星座) / ダッシュボード(5観点レーダー・概念×観点ヒートマップ) / 設定画面(モデル3スロット・トークン使用量表示)
**M3(ストレッチ、DoD対象外)**: バカロレア・シミュレータ(2h/4hタイマー通し論述)/ Web Speech APIによる口述練習

画面は6: ロードマップ / レッスン / 演習 / 復習 / ダッシュボード / 設定。ビジュアルは「紙とインク」(CLAUDE.md)。View Transitions・popover/dialog等のネイティブ機能を優先し、対応外ブラウザでは静かに劣化させる。

## 7. テスト要件(最低ライン)

- **unit**: curriculum.jsonスキーマ適合と件数 / 状態機械の遷移(産出なしで進まないこと含む) / EMA / FSRS rating写像 / Evaluationスキーマのparse / シード冪等性
- **integration**: 主要Route Handler(チャット・採点・復習)を一時SQLite+MockLlmで
- **e2e**: §2の3シナリオ。`LLM_PROVIDER=mock` で実行
- カバレッジ目標: `src/domain/` はstatement 90%以上

## 8. 公開品質(public GitHub)

- READMEは外部の初見者が「何のためのものか」を30秒で理解できる書き出しにする(哲学教育×学習科学×LLMという構図、ガードレール思想の1段落を含む)。
- コード可読性: モジュール境界の維持、公開関数へのJSDoc、マジックナンバーの定数化。
- フランス国民教育省とは無関係である旨のdisclaimerをREADME末尾に。

## 9. 作業プロトコル

1. `PROGRESS.md` に§2のチェックリストを写し、常に最新化する。
2. M0→M1→M2 の順。各マイルストーン末に検証コマンド一式を実行し、緑になるまで先へ進まない。
3. Conventional Commitsで小さくコミット。
4. 質問はしない。曖昧さはCLAUDE.mdの原則で裁定し `docs/decisions.md` に1行記録。
5. 15分ルール: 同一障害に15分以上詰まったら、同カテゴリのデファクト代替へ切替えて記録する。
6. 最終パス: `/tmp` にfresh cloneし、READMEのQuickstartのみで起動・全テスト通過を確認 → スクリーンショット再生成 → README記載のコマンド・件数・図の整合を点検 → 秘密情報の全コミット走査。

## 10. 禁止事項

クラウド依存の追加 / 認証の追加 / テスト・CIでの実API呼び出し / 教材内容のハードコード / LangChain等の導入 / `data/`・`.env`・`*.sqlite` のコミット / `0.0.0.0` バインド / 紙吹雪。
