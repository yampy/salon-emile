/**
 * E2E scenario 1: the session-0 lesson runs end to end — textbook → dialogue,
 * progress visible on the roadmap, manual advance gated by production, and
 * substantive answers advance every step to completion.
 */
import { expect, test } from "@playwright/test";

const SUBSTANTIVE =
  "労働は強制であると同時に、人間を自然の必然性から解放する営みでもある。この緊張こそが問いを成立させると考える。";

const STEPS_AFTER_INTUITION = [
  "definition_reperes",
  "theses",
  "question",
  "essay",
  "bridge",
] as const;

test("第0回レッスンが通しで完了する", async ({ page }) => {
  // the textbook is the entry; dialogue is one click deeper
  await page.goto("/lessons/0");
  await expect(page.getByTestId("textbook")).toBeVisible();
  await page.getByTestId("to-dialogue").first().click();
  await expect(page).toHaveURL(/\/lessons\/0\/dialogue/);

  await page.getByTestId("start-lesson").click();
  await expect(page.locator('[data-role="assistant"]').first()).not.toBeEmpty();
  await expect(page.getByTestId("step-indicator")).toHaveAttribute(
    "data-current-step",
    "intuition"
  );
  await expect(page.getByTestId("step-goal")).toBeVisible();

  // manual advance is refused while the step has no learner production
  await page.getByTestId("advance-step").click();
  await expect(page.getByTestId("advance-note")).toContainText("1文以上");

  // an in-progress lesson is visible on the roadmap
  await page.goto("/");
  await expect(page.getByTestId("in-progress-0")).toBeVisible();
  await page.goto("/lessons/0/dialogue");

  for (const step of STEPS_AFTER_INTUITION) {
    await page.getByTestId("chat-input").fill(SUBSTANTIVE);
    await page.getByTestId("chat-send").click();
    await expect(page.getByTestId("step-indicator")).toHaveAttribute(
      "data-current-step",
      step
    );
  }

  // A substantive production at the terminal step completes the lesson.
  await page.getByTestId("chat-input").fill(SUBSTANTIVE);
  await page.getByTestId("chat-send").click();
  await expect(page.getByTestId("lesson-completed")).toBeVisible();

  // The roadmap now marks session 0 as done.
  await page.goto("/");
  await expect(page.getByTestId("session-node-0")).toContainText("完了");
});
