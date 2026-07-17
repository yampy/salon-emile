/**
 * E2E scenario 1: the session-0 lesson runs end to end — the tutor opens,
 * substantive answers advance every step, and the lesson completes.
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
  await page.goto("/lessons/0");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("第0回");

  await page.getByTestId("start-lesson").click();
  await expect(page.locator('[data-role="assistant"]').first()).not.toBeEmpty();
  await expect(page.getByTestId("step-indicator")).toHaveAttribute(
    "data-current-step",
    "intuition"
  );

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
