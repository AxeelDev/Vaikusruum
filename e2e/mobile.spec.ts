import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile homepage stacks and menu works", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Menüü" })).toBeVisible();
  await page.getByRole("button", { name: "Menüü" }).click();
  const menu = page.getByRole("navigation", { name: "Mobiilimenüü" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Kundalini jooga" }).click();
  await expect(page).toHaveURL(/kundalini-jooga/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("mobile contact form remains usable", async ({ page }) => {
  await page.goto("/kontakt");
  await expect(page.getByLabel("Nimi")).toBeVisible();
  await expect(page.getByLabel("E-post")).toBeVisible();
  await expect(page.getByRole("button", { name: "Saada" })).toBeVisible();
});
