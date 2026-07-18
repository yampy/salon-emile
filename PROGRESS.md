# PROGRESS — Definition of Done checklist

GOAL_PROMPT.md §2 のチェックリスト(常に最新化)。

- [x] `pnpm install` → `pnpm build` が成功する
- [x] `pnpm typecheck` / `pnpm lint` がエラー0
- [x] `pnpm test`(unit+integration)が全green。APIキー不要(MockLlmのみ)で通る
- [x] `pnpm e2e`(Playwright, `LLM_PROVIDER=mock`)が全green(現行5本: 教科書・回の完了(教科書→演習)・論述採点・復習1周・質問チャット。当初の①レッスン通しは製品判断で演習一本化に置換 — docs/decisions.md 2026-07-18)
- [x] `pnpm db:seed` 後、`pnpm db:verify` が sessions=17 / notions=17 / reperes=31 / rubric=5 / theses=64 / finalEssayQuestions=10 を確認して成功
- [x] `README.md`(英語)と `README.ja.md`(日本語): 紹介、名称の由来、機能一覧、スクリーンショット、mermaidアーキテクチャ図、Quickstart、テスト実行、設計思想(docs/adr)、ライセンスバッジ
- [x] `docs/adr/` にADR 7本(§5の各決定を1ファイル1決定)
- [x] `LICENSE`(MIT)、`.env.example`、`.gitignore`(`data/`・`.env`・`*.sqlite` を含む)
- [x] GitHub Actions CI(`.github/workflows/ci.yml`): lint / typecheck / test / build / e2e(mock)
- [x] `docs/screenshots/` に主要5画面(`pnpm screenshots` で自動生成)
- [x] 秘密情報の混入ゼロ(全コミット走査済み: キー・秘密鍵・トークンなし、`data/`・`.env`・`*.sqlite` は未追跡)。`/tmp` へのfresh cloneでREADMEのQuickstart手順のみから install / db:migrate+seed+verify / typecheck / lint / test / e2e / build がすべて再現・全green

## マイルストーン

- [x] M0: スキャフォールド / curriculumスキーマ+シード+verify / レッスン対話(第0回通し・ストリーミング・DB保存)
- [x] M1: 演習6形式 / grader採点と履歴 / mastery EMA / revealガードレール
- [x] M2: FSRSカードと復習キュー / ロードマップ(17ノード+repères星座+ソフトゲート) / ダッシュボード(レーダー・ヒートマップ・答えを見た率) / 設定(モデル3スロット・トークン使用量)
- [ ] M3(ストレッチ・DoD対象外): バカロレア・シミュレータ / 口述練習
