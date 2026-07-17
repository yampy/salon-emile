/**
 * E2E scenario 2: submitting an essay shows the five-criterion evaluation.
 */
import { expect, test } from "@playwright/test";

const ESSAY =
  "自己は直接に感じられるがゆえに自明に知られると思える。しかし知は対象化と検証を要する営みであり、自己への近さはむしろ距離の欠如として認識の障害となる。ゆえに自己認識は内省ではなく、行為や他者のまなざしを経由した迂回によって可能になると再定式化できる。";

const CRITERIA = [
  "problematisation",
  "concepts",
  "argumentation",
  "culture",
  "expression",
] as const;

test("論述を提出すると5観点の採点が表示される", async ({ page }) => {
  await page.goto("/practice?session=1&kind=mini_essay");
  await expect(page.getByTestId("exercise-question")).toContainText(
    "人は自分自身を知ることができるか"
  );

  await page.getByTestId("exercise-answer").fill(ESSAY);
  await page.getByTestId("exercise-submit").click();

  await expect(page.getByTestId("evaluation")).toBeVisible();
  for (const criterion of CRITERIA) {
    const row = page.getByTestId(`score-${criterion}`);
    await expect(row).toBeVisible();
    const score = Number(await row.getAttribute("data-score"));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(4);
  }
  await expect(page.getByTestId("feedback")).not.toBeEmpty();

  // The attempt lands in the session history.
  await page.reload();
  await expect(page.getByTestId("attempt-history")).toContainText("平均");
});
