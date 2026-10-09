import { expect, test } from "@playwright/test";

async function noHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("public site", () => {
  test("homepage loads without lorem ipsum", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Vaikus/i }).first()).toBeVisible();
    await expect(page.getByText("Eratunnid kokkuleppel.")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Lorem ipsum");
    await noHorizontalOverflow(page);
  });

  test("kundalini page has seeded copy", async ({ page }) => {
    await page.goto("/kundalini-jooga");
    await expect(page.getByRole("heading", { name: "Kundalini jooga" }).first()).toBeVisible();
    await expect(page.getByText("Kundalini jooga on terviklik joogapraktika")).toBeVisible();
    await expect(page.getByText(/Lauliku lasteaia saal/)).toBeVisible();
    await expect(page.locator("main")).not.toContainText("Kuupäevad");
    await noHorizontalOverflow(page);
  });

  test("gong page has seeded copy", async ({ page }) => {
    await page.goto("/pehme-jooga-ja-gong");
    await expect(page.getByRole("heading", { name: /Pehme jooga/ }).first()).toBeVisible();
    await expect(page.getByText("Veenuse gong on üks sümfooniliste gongide liikidest")).toBeVisible();
    // Registration happens on Üksmaja's page; past dates are not listed.
    await expect(page.getByRole("link", { name: "Registreeri" })).toHaveAttribute("href", /yksmaja\.ee\/events\//);
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("28.09.2026");
    await noHorizontalOverflow(page);
  });

  test("contact page has no placeholder copy", async ({ page }) => {
    await page.goto("/kontakt");
    await expect(page.getByText(/VÕTA KONTAKTI|VÕTA ÜHENDUST/)).toBeVisible();
    await expect(page.getByText("Miina Laanesaar")).toBeVisible();
    await expect(page.getByRole("link", { name: "miina.laanesaar@gmail.com" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Lorem ipsum");
    await expect(page.getByLabel("Nimi")).toBeVisible();
  });

  test("menu uses the requested page names", async ({ page }) => {
    const labels = [
      "Kundalini jooga",
      "Pehme jooga ja gong",
      "Eratunnid",
      "Minust",
      "Joogatunni KKK",
      "Hea teada",
      "Kontakt",
    ];
    await page.goto("/");
    const width = page.viewportSize()?.width ?? 1440;
    const nav =
      width < 1100
        ? await (async () => {
            await page.getByRole("button", { name: "Ava menüü" }).click();
            return page.getByRole("navigation", { name: "Mobiilimenüü" });
          })()
        : page.getByRole("navigation", { name: "Peamenüü" });
    for (const label of labels) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Tagasiside" })).toHaveCount(0);
  });

  test("eratunnid page shows the supplied lesson options", async ({ page }) => {
    await page.goto("/eratunnid");
    await expect(page.getByRole("heading", { name: "Eratunnid" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Kundalini jooga/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Pehme jooga ja gongilõdvestus/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Individuaaltund rasedale/ })).toBeVisible();
    await expect(page.getByText("80 €")).toBeVisible();
    await expect(page.getByText("Tule koos sõbraga!")).toBeVisible();
  });

  test("tagasiside is not a public empty page", async ({ page }) => {
    const response = await page.goto("/tagasiside");
    expect(response?.status()).toBe(404);
  });
});

test.describe("privacy and forms", () => {
  test("privacy page is public but not in the menu", async ({ page }) => {
    const response = await page.goto("/privaatsus");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Privaatsus" }).first()).toBeVisible();
    await expect(page.locator("main")).toContainText("12 kuu");
    await expect(page.getByRole("navigation", { name: "Peamenüü" }).getByRole("link", { name: "Privaatsus" })).toHaveCount(0);
  });

  test("contact form asks for consent and links the privacy notice", async ({ page }) => {
    await page.goto("/kontakt");
    const consent = page.locator('main input[name="consent"]');
    await expect(consent).toHaveAttribute("required", "");
    await expect(page.locator("main form").getByRole("link", { name: "Privaatsusteave" })).toHaveAttribute("href", "/privaatsus");
    // The honeypot is clipped to 1px and hidden from assistive tech: people never see or reach it.
    const honeypot = page.locator("main .vr-hp");
    await expect(honeypot).toHaveAttribute("aria-hidden", "true");
    const box = await honeypot.boundingBox();
    expect((box?.width ?? 0) <= 1 && (box?.height ?? 0) <= 1).toBe(true);
  });

  test("?teema=eratund preselects the private lesson topic", async ({ page }) => {
    await page.goto("/kontakt?teema=eratund");
    await expect(page.locator('main select[name="kind"]')).toHaveValue("private_lesson");
  });

  test("pages send the security headers", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("daily maintenance needs the cron secret", async ({ request }) => {
    expect((await request.get("/api/cron/daily")).status()).toBe(401);
  });
});

test.describe("admin entry", () => {
  test("admin shows bootstrap or login, never public signup extras", async ({ page }) => {
    await page.goto("/admin");
    const bootstrap = page.getByRole("button", { name: "Loo konto" });
    const login = page.getByRole("button", { name: "Logi sisse" });
    await expect(bootstrap.or(login)).toBeVisible();
    await expect(page.locator("body")).not.toContainText("MFA");
  });
});
