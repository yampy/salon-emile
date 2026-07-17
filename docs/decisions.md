# Decisions log

Ambiguities resolved autonomously per CLAUDE.md / GOAL_PROMPT.md. One line each: date, decision, reason.

- 2026-07-17: Use Node 24 locally with `engines: ">=22"` and Node 22 in CI — the `ai` v7 package requires Node >= 22; nvm had 24 installed.
- 2026-07-17: Pin TypeScript 5.9 (create-next-app default) instead of the brand-new TS 7 — ecosystem compatibility over novelty; strict mode is what the spec requires.
- 2026-07-17: `createDb()` auto-applies migrations on open; seeding stays an explicit command — a fresh clone works right after install without hidden data writes.
- 2026-07-17: Session 0 runs the same six-step lesson flow as regular sessions, with step content mapped onto the canon's method/exercise fields — one state machine, isomorphic flow per GOAL §5.3.
- 2026-07-17: Theses get deterministic ids `s{n}-t{index+1}` generated at parse/seed time — curriculum.json carries none, and the canon-only guardrail needs id-addressable theses.
- 2026-07-17: All 95 canon-backed review cards (31 repères + 64 theses) are created due-immediately at seed time — the spec fixes the card counts; activation-on-lesson would add state for no tested benefit.
- 2026-07-17: Review rounds are capped at 10 cards (`REVIEW_ROUND_LIMIT`) — makes "one round of the queue" a bounded, testable unit; FSRS ordering decides which ten.
- 2026-07-17: The reveal button shows canon material only (core/method/reperesNote/theses of the session) — no generated model answer can leak past the guardrail.
- 2026-07-17: The mock grader keys on answer length (>= 40 chars strong, < 40 lapse-worthy; cards >= 10 chars pass) — deterministic fixtures that let tests exercise both the strong and lapse paths.
- 2026-07-17: Default model slots seeded as tutor/grader=claude-opus-4-8, light=claude-haiku-4-5 — current Anthropic guidance (most capable Opus tier by default, fast tier for light roles); changeable in settings.
- 2026-07-17: E2E resets its SQLite inside the Playwright webServer command (not globalSetup) — the dev server must never hold a connection to a database file deleted from under it.
- 2026-07-17: Streamed chat returns plain text; the client refetches lesson state after each exchange — the server stays the single authority on step transitions with no custom wire protocol.
- 2026-07-17: Repository lives at the repo root created with the canon commit; the working-directory parent (which held stray copies of CLAUDE.md/GOAL_PROMPT.md) is not part of the project.
- 2026-07-17: OAuth support added alongside API keys — credentials resolve as ANTHROPIC_API_KEY → ANTHROPIC_AUTH_TOKEN → `ant auth login` profile (short-lived tokens minted via `ant auth print-credentials`, cached 5 min); OAuth requests carry the `oauth-2025-04-20` beta header, and exactly one auth mechanism is ever sent.
