/**
 * E2E scenario 3: one full round of the review queue — answer every card of
 * the round, each graded and rescheduled by FSRS.
 */
import { expect, test } from "@playwright/test";

const RECALL_ANSWER =
  "他に依存せず成り立つのが絶対的、他との関係でのみ成り立つのが相対的である。適用: 真理は文化に相対的かと問える。";

test("復習キューを1周する", async ({ page }) => {
  await page.goto("/review");
  await expect(page.getByTestId("queue-progress")).toBeVisible();

  const progress = await page.getByTestId("queue-progress").innerText();
  const roundSize = Number(progress.match(/\/\s*(\d+)/)?.[1] ?? "0");
  expect(roundSize).toBeGreaterThan(0);

  for (let i = 0; i < roundSize; i++) {
    await expect(page.getByTestId("card-front")).not.toBeEmpty();
    await page.getByTestId("review-answer").fill(RECALL_ANSWER);
    await page.getByTestId("review-submit").click();

    const outcome = page.getByTestId("review-outcome");
    await expect(outcome).toBeVisible();
    const score = Number(await outcome.getAttribute("data-score"));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(4);

    await page.getByTestId("next-card").click();
  }

  await expect(page.getByTestId("round-complete")).toBeVisible();
});
