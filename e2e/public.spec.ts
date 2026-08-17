import { expect, test } from "@playwright/test";

async function noHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("public site", () => {
  test("homepage loads without lorem ipsum", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "VAIKUSRUUM" }).first()).toBeVisible();
    await expect(page.getByText("Vaikusruum on kutse aeglustuda")).toBeVisible();
    await expect(page.getByText("Eratunnid kokkuleppel")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Lorem ipsum");
    await noHorizontalOverflow(page);
  });

  test("kundalini page has seeded copy", async ({ page }) => {
    await page.goto("/kundalini-jooga");
    await expect(page.getByRole("heading", { name: "Kundalini jooga" }).first()).toBeVisible();
    await expect(page.getByText("Kundalini jooga on terviklik joogapraktika")).toBeVisible();
    await expect(page.getByText("Asikoht: Lauliku lasteaia saal")).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test("gong page has seeded copy", async ({ page }) => {
    await page.goto("/pehme-jooga-ja-gong");
    await expect(page.getByRole("heading", { name: "Pehme jooga ja gong" }).first()).toBeVisible();
    await expect(page.getByText("Veenuse gong on üks sümfooniliste gongide liikidest")).toBeVisible();
    await expect(page.getByText("28.09")).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test("contact page has no placeholder copy", async ({ page }) => {
    await page.goto("/kontakt");
    await expect(page.getByText("VÕTA KONTAKTI")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Lorem ipsum");
    await expect(page.getByLabel("Nimi")).toBeVisible();
  });

  test("menu uses the requested page names", async ({ page }) => {
    const labels = [
      "Kundalini jooga",
      "Pehme jooga ja gong",
      "Minust",
      "Joogatunni KKK",
      "Hea teada",
      "Kontakt",
    ];
    await page.goto("/");
    const width = page.viewportSize()?.width ?? 1440;
    const nav =
      width < 960
        ? await (async () => {
            await page.getByRole("button", { name: "Menüü" }).click();
            return page.getByRole("navigation", { name: "Mobiilimenüü" });
          })()
        : page.getByRole("navigation", { name: "Peamenüü" });
    for (const label of labels) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Tagasiside" })).toHaveCount(0);
  });

  test("tagasiside is not a public empty page", async ({ page }) => {
    const response = await page.goto("/tagasiside");
    expect(response?.status()).toBe(404);
  });
});

test.describe("admin entry", () => {
  test("admin shows bootstrap or login, never public signup extras", async ({ page }) => {
    await page.goto("/admin");
    const bootstrap = page.getByRole("button", { name: "Loo esimene administraator" });
    const login = page.getByRole("button", { name: "Logi sisse" });
    await expect(bootstrap.or(login)).toBeVisible();
    await expect(page.locator("body")).not.toContainText("MFA");
  });
});
