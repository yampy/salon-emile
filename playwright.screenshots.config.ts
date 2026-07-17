import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * Screenshot generation (`pnpm screenshots`): drives the app with the mock
 * LLM, populates believable learning state, and captures the five main
 * screens into docs/screenshots/.
 */
const DB_PATH = path.join(process.cwd(), ".e2e-screenshots", "app.sqlite");

export default defineConfig({
  testDir: "./e2e/screenshots",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3200",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  },
  webServer: {
    command:
      "rm -rf .e2e-screenshots && pnpm db:migrate && pnpm db:seed && pnpm exec next dev --hostname 127.0.0.1 --port 3200",
    url: "http://127.0.0.1:3200",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      LLM_PROVIDER: "mock",
      DATABASE_PATH: DB_PATH,
    },
  },
});
