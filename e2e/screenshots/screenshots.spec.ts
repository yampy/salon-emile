/**
 * Generates docs/screenshots/*.png for the README: walks enough of the app
 * (mock LLM) to show believable state, then captures the five main screens.
 */
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const OUT_DIR = path.join(process.cwd(), "docs", "screenshots");

const SUBSTANTIVE =
  "労働は強制であると同時に、人間を自然の必然性から解放する営みでもある。この緊張こそが問いを成立させると考える。";
const ESSAY =
  "自己は直接に感じられるがゆえに自明に知られると思える。しかし知は対象化と検証を要する営みであり、自己への近さはむしろ距離の欠如として認識の障害となる。ゆえに自己認識は内省ではなく、行為や他者のまなざしを経由した迂回によって可能になると再定式化できる。";
const RECALL =
  "他に依存せず成り立つのが絶対的、他との関係でのみ成り立つのが相対的である。適用: 真理は文化に相対的かと問える。";

async function capture(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false });
}

test("五画面のスクリーンショットを生成する", async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // --- lesson: open session 0 and exchange a few turns
  await page.goto("/lessons/0/dialogue");
  await page.getByTestId("start-lesson").click();
  await expect(page.locator('[data-role="assistant"]').first()).not.toBeEmpty();
  for (const step of ["definition_reperes", "theses"]) {
    await page.getByTestId("chat-input").fill(SUBSTANTIVE);
    await page.getByTestId("chat-send").click();
    await expect(page.getByTestId("step-indicator")).toHaveAttribute(
      "data-current-step",
      step
    );
  }
  await capture(page, "lesson.png");

  // --- textbook: the reading page for session 1
  await page.goto("/lessons/1");
  await expect(page.getByTestId("reading")).toBeVisible();
  await capture(page, "textbook.png");

  // --- practice: grade an essay so the evaluation is visible
  await page.goto("/practice?session=1&kind=mini_essay");
  await page.getByTestId("exercise-answer").fill(ESSAY);
  await page.getByTestId("exercise-submit").click();
  await expect(page.getByTestId("evaluation")).toBeVisible();
  await capture(page, "practice.png");

  // --- review: answer a couple of cards, capture mid-round
  await page.goto("/review");
  for (let i = 0; i < 2; i++) {
    await page.getByTestId("review-answer").fill(RECALL);
    await page.getByTestId("review-submit").click();
    await expect(page.getByTestId("review-outcome")).toBeVisible();
    await page.getByTestId("next-card").click();
  }
  await expect(page.getByTestId("review-answer")).toBeVisible();
  await capture(page, "review.png");

  // --- dashboard: mastery from the graded essay is now visible
  await page.goto("/dashboard");
  await expect(page.getByTestId("mastery-radar")).toBeVisible();
  await capture(page, "dashboard.png");

  // --- roadmap: progress bars and in-progress badges visible
  await page.goto("/");
  await expect(page.getByTestId("progress-overview")).toBeVisible();
  await capture(page, "roadmap.png");
});
