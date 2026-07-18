/**
 * E2E scenario 1: the session-0 lesson end to end — textbook → dialogue,
 * per-step clean chats (banner on advance, reset button restarts the gate),
 * progress on the roadmap, completion with the full transcript.
 */
import { expect, test } from "@playwright/test";

const SUBSTANTIVE =
  "労働は強制であると同時に、人間を自然の必然性から解放する営みでもある。この緊張こそが問いを成立させると考える。";

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

  // manual advance is refused while the step has no learner production
  await page.getByTestId("advance-step").click();
  await expect(page.getByTestId("advance-note")).toContainText("1文以上");

  // the reset button wipes the step's dialogue and brings the start back
  await page.getByTestId("reset-step").click();
  await expect(page.locator("[data-role]")).toHaveCount(0);
  await page.getByTestId("start-lesson").click();
  await expect(page.locator('[data-role="assistant"]').first()).not.toBeEmpty();

  // a substantive production advances; the banner offers the clean start
  await page.getByTestId("chat-input").fill(SUBSTANTIVE);
  await page.getByTestId("chat-send").click();
  await expect(page.getByTestId("step-transition")).toBeVisible();
  await expect(page.getByTestId("step-indicator")).toHaveAttribute(
    "data-current-step",
    "definition_reperes"
  );

  // an in-progress lesson is visible on the roadmap
  await page.goto("/");
  await expect(page.getByTestId("in-progress-0")).toBeVisible();

  // returning mid-lesson lands on the current step with a clean chat
  await page.goto("/lessons/0/dialogue");
  await expect(page.locator("[data-role]")).toHaveCount(0);

  // walk the remaining steps: each advance enters a fresh chat
  for (const step of ["theses", "question", "essay", "bridge"] as const) {
    await page.getByTestId("chat-input").fill(SUBSTANTIVE);
    await page.getByTestId("chat-send").click();
    await expect(page.getByTestId("step-transition")).toBeVisible();
    await expect(page.getByTestId("step-indicator")).toHaveAttribute(
      "data-current-step",
      step
    );
    await page.getByTestId("enter-step").click();
    await expect(page.locator("[data-role]")).toHaveCount(0);
  }

  // a substantive production at the terminal step completes the lesson;
  // the completed view shows the full transcript
  await page.getByTestId("chat-input").fill(SUBSTANTIVE);
  await page.getByTestId("chat-send").click();
  await expect(page.getByTestId("lesson-completed")).toBeVisible();
  expect(await page.locator('[data-role="user"]').count()).toBeGreaterThan(3);

  // the roadmap now marks session 0 as done
  await page.goto("/");
  await expect(page.getByTestId("session-node-0")).toContainText("完了");
});
