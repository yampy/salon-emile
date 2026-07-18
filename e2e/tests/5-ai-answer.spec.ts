/**
 * E2E: the「AIに回答させる」flow — the AI's worked answer appears, the
 * original question stays visible, and the learner answers a clearly
 * presented variant question that gets graded.
 */
import { expect, test } from "@playwright/test";

const VARIANT_ANSWER =
  "他者の意図は直接には観察できないが、対話と行為の積み重ねが解釈を修正し続ける。到達不能性と接近可能性の緊張として定式化できる。";

test("AIに回答させると、回答例と変形問題が明確に表示される", async ({ page }) => {
  await page.goto("/practice?session=3&kind=intuitions");

  const originalQuestion = await page
    .getByTestId("exercise-question")
    .innerText();

  await page.getByTestId("ai-answer-button").click();

  // the AI's worked answer, clearly labeled
  await expect(page.getByTestId("ai-answer")).toBeVisible();
  await expect(page.getByTestId("ai-answer")).toContainText("AIの回答例");

  // the original question is still on screen
  await expect(page.getByTestId("exercise-question")).toHaveText(
    originalQuestion
  );

  // the learner's new task is a clean one-line variant, not JSON
  const variant = page.getByTestId("variant-question");
  await expect(variant).toBeVisible();
  const variantText = (await variant.innerText()).trim();
  expect(variantText.startsWith("{")).toBe(false);
  expect(variantText.length).toBeGreaterThan(0);
  await expect(page.getByTestId("variant-turn")).toContainText(
    "今度はあなたの番"
  );

  // answering the variant gets graded as usual
  await page.getByTestId("exercise-answer").fill(VARIANT_ANSWER);
  await page.getByTestId("exercise-submit").click();
  await expect(page.getByTestId("evaluation")).toBeVisible();
});
