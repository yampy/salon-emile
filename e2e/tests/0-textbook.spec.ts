/**
 * E2E: the textbook page — canon sections readable, model answer generated
 * on demand (mock), dialogue reachable from it.
 */
import { expect, test } from "@playwright/test";

test("教科書ページで全体を読み、解答例を開ける", async ({ page }) => {
  await page.goto("/lessons/1");
  await expect(page.getByTestId("textbook")).toBeVisible();

  // canon sections are rendered as a reading (ASCII/JP substrings only —
  // accented words differ in Unicode normalization between files)
  for (const heading of ["この回の到達目標", "導入", "概念対", "正典テーゼ", "問い", "学びの視点"]) {
    await expect(
      page.getByRole("heading", { name: new RegExp(heading) })
    ).toBeVisible();
  }
  // theses carry their canon ids
  await expect(page.getByText("[s1-t1]")).toBeVisible();

  // model answer: generated on first open, three-part form
  await page.getByTestId("model-answer-toggle").first().click();
  const answer = page.getByTestId("model-answer").first();
  await expect(answer).toBeVisible();
  await expect(answer).toContainText("problématique");
  await expect(answer).toContainText("dépassement");

  // the dialogue lesson is one click away
  await page.getByTestId("to-dialogue").first().click();
  await expect(page).toHaveURL(/\/lessons\/1\/dialogue/);
  await expect(page.getByTestId("start-lesson")).toBeVisible();
});
