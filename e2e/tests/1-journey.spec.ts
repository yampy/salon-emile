/**
 * E2E scenario 1: the session journey — textbook → practice, formats
 * revisitable in any order with a checklist, completion when the mini-essay
 * is graded, progress visible on the roadmap.
 */
import { expect, test } from "@playwright/test";

const SHORT_ANSWER =
  "無意識は自由を否定すると思う。自分で選んだつもりの行動にも、気づかない動機があるからだ。";
const ESSAY =
  "無意識という仮説は、一見すると人間の自由を否定するように見える。自分で選んだと思っている行動の背後に、気づかない動機が働いているなら、選択は錯覚かもしれない。しかし無意識を知ることは、むしろ自分の動機を吟味し直す手がかりにもなる。ゆえに無意識の発見は自由の否定ではなく、自由の条件の再定義として読み直せる。";

test("教科書→演習の一本道で、回を完了できる", async ({ page }) => {
  // the textbook is the entry; practice is the single working surface
  await page.goto("/lessons/2");
  await expect(page.getByTestId("textbook")).toBeVisible();
  await page.getByTestId("to-practice").first().click();
  await expect(page).toHaveURL(/\/practice\?session=2/);
  await expect(page.getByTestId("practice-progress")).toContainText("0 / 6");

  // do one format (one-sentence); the checklist marks it
  await page.getByTestId("kind-tab-one_sentence").click();
  await expect(page).toHaveURL(/kind=one_sentence/);
  await page.getByTestId("exercise-answer").fill(SHORT_ANSWER);
  await page.getByTestId("exercise-submit").click();
  await expect(page.getByTestId("evaluation")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("practice-progress")).toContainText("1 / 6");
  await expect(page.getByTestId("kind-tab-one_sentence")).toHaveAttribute(
    "data-done",
    "true"
  );

  // formats are freely revisitable — jump straight to the capstone
  await page.getByTestId("kind-tab-mini_essay").click();
  await expect(page).toHaveURL(/kind=mini_essay/);
  await page.getByTestId("exercise-answer").fill(ESSAY);
  await page.getByTestId("exercise-submit").click();
  await expect(page.getByTestId("evaluation")).toBeVisible();

  // a graded mini-essay completes the session
  await page.reload();
  await expect(page.getByTestId("session-complete")).toBeVisible();
  await expect(page.getByTestId("practice-progress")).toContainText("2 / 6");

  // the textbook CTA and the roadmap reflect it
  await page.goto("/lessons/2");
  await expect(page.getByTestId("to-practice").first()).toContainText("2/6");
  await page.goto("/");
  await expect(page.getByTestId("session-node-2")).toContainText("完了");
});
