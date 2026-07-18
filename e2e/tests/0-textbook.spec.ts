/**
 * E2E: the textbook page — the friendly reading (5E structure) renders,
 * canon stays reachable as reference, model answers open on demand, and
 * the dialogue is one click away.
 */
import { expect, test } from "@playwright/test";

test("教科書ページで読み物を読み、解答例を開ける", async ({ page }) => {
  await page.goto("/lessons/1");
  await expect(page.getByTestId("textbook")).toBeVisible();

  // the generated reading: hook, 3+ steps with examples, theses guide, recap
  await expect(page.getByTestId("reading")).toBeVisible();
  await expect(page.getByTestId("reading-hook")).toBeVisible();
  expect(await page.getByTestId("reading-step").count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId("reading-step").first()).toContainText("たとえば");
  await expect(page.getByTestId("reading-thesis").first()).toContainText("[s1-t");
  await expect(page.getByTestId("reading-recap")).toBeVisible();

  // the raw canon remains available as reference
  await page.getByTestId("canon-source").locator("summary").click();
  await expect(page.getByTestId("canon-source")).toContainText("[s1-t1]");

  // model answer: generated on first open, three-part form
  await page.getByTestId("model-answer-toggle").first().click();
  const answer = page.getByTestId("model-answer").first();
  await expect(answer).toBeVisible();
  await expect(answer).toContainText("problématique");
  await expect(answer).toContainText("dépassement");

  // practice is one click away
  await page.getByTestId("to-practice").first().click();
  await expect(page).toHaveURL(/\/practice\?session=1/);
  await expect(page.getByTestId("practice-progress")).toBeVisible();
});
