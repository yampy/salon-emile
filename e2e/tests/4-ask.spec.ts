/**
 * E2E: the global 質問 chat — ask from the top nav, get an answer that
 * links to relevant sessions, history survives reload, thread clears.
 */
import { expect, test } from "@playwright/test";

test("質問チャットで講座全体から答えが返り、参考回へのリンクがつく", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "質問" }).click();
  await expect(page).toHaveURL(/\/ask/);

  await page.getByTestId("ask-input").fill("自分のことは自分が一番わかっている、は本当ですか?");
  await page.getByTestId("ask-send").click();

  const assistant = page.locator('[data-role="assistant"]').first();
  await expect(assistant).toContainText("参考になる回");
  // 第N回 mentions become links to the session textbook
  const ref = page.getByTestId("session-ref-1").first();
  await expect(ref).toBeVisible();
  await expect(ref).toHaveAttribute("href", "/lessons/1");

  // the thread survives a reload
  await page.reload();
  await expect(page.locator('[data-role="assistant"]').first()).toContainText(
    "参考になる回"
  );

  // and can be cleared
  await page.getByTestId("ask-clear").click();
  await expect(page.getByTestId("ask-suggestion").first()).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("ask-suggestion").first()).toBeVisible();
});
