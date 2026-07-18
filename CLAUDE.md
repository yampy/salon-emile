# CLAUDE.md — Le Salon d'Émile プロジェクト憲法

このファイルは全セッションで常に有効な制約である。GOAL_PROMPT.md(実装ゴール)と矛盾する判断はしない。

## プロジェクト概要

**Le Salon d'Émile**(エミールのサロン、slug: `salon-emile`)—
フランス・リセ哲学カリキュラム(Terminale・全17回)を自律学習するローカルWebアプリ。
教科書(生成読み物)と演習を軸に、ルーブリック採点、FSRS間隔反復、全体質問チャット、ロードマップ管理を提供する。
利用者は1人(ローカル実行)。リポジトリはpublic GitHubとして公開品質を保つ。
名称はルソー『エミール』(答えを与えず発見を配置する消極教育=ガードレール思想)と
啓蒙期のサロン(対話で哲学をする場=レッスンエンジン)に由来し、設計の二本柱を要約する。

## 不変の制約(ADR確定事項)

- **スタック**: Next.js(App Router・最新安定)+ TypeScript strict / Tailwind CSS + shadcn/ui / Vercel AI SDK + @ai-sdk/anthropic / Drizzle ORM + better-sqlite3 / ts-fsrs / Zod。パッケージマネージャは pnpm。
- **ローカル専用**: dev/startは 127.0.0.1 にバインド。認証・マルチテナント・クラウド依存を追加しない。
- **教材の唯一の正典**: `src/data/curriculum.json`。概念・テーゼ・問い・ルーブリック等の教材内容をコード・プロンプトにハードコードしない。表示も生成もこのファイル(をシードしたDB)経由。
- **LLM抽象化**: `LlmClient` インターフェースの背後に `AnthropicClient` と `MockLlmClient`。`LLM_PROVIDER=mock|anthropic` で切替。**テスト・CI・E2EはmockのみでAPIキー不要**。
- **ロール分離**: grader(5観点採点)/ cardGrader(軽量採点)/ variantGenerator(変形問題)/ reading(読み物)/ modelAnswer(解答例)/ advisor(質問)のプロンプトモジュールを分離。採点系は構造化出力(Zod)のみ。
- **ガードレール**: (1) 採点・対話で学習者の試行前に模範解答を押しつけない(教科書の解答例・「AIに回答させる」は学習者の明示的な操作) (2)「AIに回答させる」はイベント記録+直後に変形問題を1問 (3) テーゼ・引用は curriculum.json 由来に限定(正典外の引用生成禁止)。
- **スケジューリング**: 復習間隔の決定は ts-fsrs のみ。独自SRSアルゴリズムを書かない。
- **DB**: `data/app.sqlite`(gitignore)。マイグレーションは `drizzle/` にコミット。シードは冪等。
- **秘密**: APIキーは `.env` のみ。`.env.example` を維持。データ・鍵・個人学習履歴をコミットしない。

## コマンド(package.jsonで維持)

```
pnpm dev          # 127.0.0.1:3000
pnpm build / start
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm test         # unit + integration (vitest, mock LLM)
pnpm e2e          # Playwright (LLM_PROVIDER=mock)
pnpm db:migrate / db:seed / db:verify
```

## スタイル規範

- UI文言は日本語(哲学用語は仏語併記)。コード・コメント・コミットは英語。
- Conventional Commits。小さくコミット。
- 公開関数・モジュール先頭にJSDoc。モジュール境界を尊重(ui / server / db / llm / domain)。
- `any` 禁止。エラーは握りつぶさない。
- ビジュアルは「紙とインク」: 温白/墨+群青1色、本文サンセリフ体(システムフォント: Helvetica・Hiragino Sans・Meiryo系)、ロゴタイプの Émile のみセリフ・イタリック、紙吹雪等のゲーミフィケーション演出禁止。

## 判断の記録

仕様の曖昧さは本ファイルとGOAL_PROMPT.mdの原則で自律裁定し、`docs/decisions.md` に1行追記する(日付・判断・理由)。人間への質問はしない。
