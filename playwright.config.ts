import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * E2E config: mock LLM only (no API key), fresh SQLite under .e2e/, single
 * worker so the three scenarios share one deterministic database.
 *
 * The database is wiped and reseeded inside the webServer command — before
 * the dev server ever opens the file — so no connection can outlive a reset.
 */
const E2E_DB_PATH = path.join(process.cwd(), ".e2e", "app.sqlite");

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "rm -rf .e2e && pnpm db:migrate && pnpm db:seed && pnpm exec next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      LLM_PROVIDER: "mock",
      DATABASE_PATH: E2E_DB_PATH,
    },
  },
});
