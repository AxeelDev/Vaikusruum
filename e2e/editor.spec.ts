import { expect, test } from "@playwright/test";

test("editor route requires login and does not use an iframe", async ({ page }) => {
  await page.goto("/admin/editor");
  await expect(page.getByRole("button", { name: "Logi sisse" }).or(page.getByRole("button", { name: "Loo esimene administraator" }))).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
});
