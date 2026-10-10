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
    await expect(page.getByText("VÕTA ÜHENDUST")).toBeVisible();
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
      "Tagasiside",
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

  test("gong dates are grouped by month", async ({ page }) => {
    await page.goto("/pehme-jooga-ja-gong");
    const dates = page.locator(".vr-dates");
    // Dates are time-dependent; once the last one has passed the block disappears.
    test.skip((await dates.count()) === 0, "no upcoming dates to show");
    const months = await dates.locator(".vr-dates-month").allTextContents();
    expect(months.length).toBeGreaterThan(0);
    for (const month of months) expect(month).toMatch(/^(jaanuar|veebruar|märts|aprill|mai|juuni|juuli|august|september|oktoober|november|detsember)( \d{4})?$/);
    expect(new Set(months).size).toBe(months.length);
    // A time shows beside a date only when it differs from the others; with one shared time there are none.
    const times = await dates.locator(".vr-date-time").allTextContents();
    for (const time of times) expect(time).toMatch(/^\s*kell \d{2}:\d{2}/);
    // Two columns: every label sits left of its dates.
    const label = await dates.locator(".vr-dates-month").first().boundingBox();
    const days = await dates.locator(".vr-dates-days").first().boundingBox();
    expect(days!.x).toBeGreaterThan(label!.x + label!.width);
    await noHorizontalOverflow(page);
  });

  test("tagasiside is a public page that shows testimonials, never the editor's empty-state hint", async ({ page }) => {
    const response = await page.goto("/tagasiside");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Tagasiside" }).first()).toBeVisible();
    await expect(page.locator("main")).not.toContainText("Tagasisidet ei ole veel lisatud");
    // Decorative quotation marks are hidden from assistive technology.
    for (const mark of await page.locator(".vr-testimonial-mark").all()) await expect(mark).toHaveAttribute("aria-hidden", "true");
    await noHorizontalOverflow(page);
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

  // The wording of the choices is the owner's to change, so these find the form by its fields, not by its labels.
  const topicGroup = (page: import("@playwright/test").Page) => page.locator("main fieldset", { has: page.locator('input[name="kind"]') });
  const classGroup = (page: import("@playwright/test").Page) => page.locator("main fieldset", { has: page.locator('input[name="lesson"]') });

  test("the topic is two large choices, not a dropdown", async ({ page }) => {
    await page.goto("/kontakt");
    await expect(page.locator("main select")).toHaveCount(0);
    await expect(topicGroup(page).locator('input[name="kind"]')).toHaveCount(2);
    await expect(page.locator('input[name="kind"][value="contact"]')).toBeChecked();
    await expect(page.locator('input[name="kind"][value="private_lesson"]')).not.toBeChecked();
    await expect(classGroup(page)).toHaveCount(0);
    await page.locator('input[name="kind"][value="private_lesson"]').check();
    await expect(classGroup(page)).toBeVisible();
    const labels = await classGroup(page).locator("label").allTextContents();
    expect(new Set(labels).size).toBe(labels.length);
    for (const label of ["Kundalini jooga", "Pehme jooga ja gongilõdvestus", "Individuaaltund rasedale"]) {
      expect(labels).toContain(label);
    }
    // "Not sure yet" is always the last choice, and the one picked until a class is chosen.
    await expect(classGroup(page).locator("input").last()).toHaveAttribute("value", "pole-kindel");
    await expect(classGroup(page).locator("input").last()).toBeChecked();
  });

  test("a cleared label stays available to screen readers", async ({ page }) => {
    await page.goto("/kontakt");
    // Every field has a name, whether or not its label is shown.
    for (const field of ["name", "email", "message"]) {
      const name = await page.locator(`main [name="${field}"]`).evaluate((input) => (input.closest("label")?.textContent ?? "").trim());
      expect(name.length).toBeGreaterThan(0);
    }
    expect((await topicGroup(page).locator("legend").textContent())?.length ?? 0).toBeGreaterThan(0);
  });

  test("?teema=eratund preselects the private lesson topic", async ({ page }) => {
    await page.goto("/kontakt?teema=eratund");
    await expect(page.locator('input[name="kind"][value="private_lesson"]')).toBeChecked();
    await expect(classGroup(page)).toBeVisible();
  });

  test("&tund= preselects the class, and the Eratunnid page links to it", async ({ page }) => {
    await page.goto("/kontakt?teema=eratund&tund=individuaaltund-rasedale");
    await expect(page.getByRole("radio", { name: "Individuaaltund rasedale" })).toBeChecked();
    await page.goto("/eratunnid");
    const links = page.locator(".vr-private-lesson").getByRole("link", { name: "Võta ühendust" });
    await expect(links).toHaveCount(3);
    await links.nth(2).click();
    await expect(page).toHaveURL(/tund=individuaaltund-rasedale/);
    await expect(page.getByRole("radio", { name: "Individuaaltund rasedale" })).toBeChecked();
  });

  test("an unknown class is refused by the server", async ({ page }) => {
    await page.goto("/kontakt?teema=eratund");
    await page.locator('main input[name="name"]').fill("Test");
    await page.locator('main input[name="email"]').fill("test@example.com");
    await page.locator('main input[name="consent"]').check();
    await page.locator('main input[name="lesson"]:checked').evaluate((input: HTMLInputElement) => {
      input.value = "pole-selline-tund";
    });
    await page.waitForTimeout(2800);
    await page.locator('main form button[type="submit"]').click();
    await expect(page.locator(".vr-form-error")).toContainText("Valitud tundi ei leitud");
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

test.describe("typography", () => {
  const PAGES = ["/", "/kundalini-jooga", "/pehme-jooga-ja-gong", "/eratunnid", "/minust", "/joogatunni-kkk", "/hea-teada", "/kontakt", "/privaatsus"];

  for (const width of [1280, 390]) {
    test(`long body text is one size at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const odd: string[] = [];
      for (const path of PAGES) {
        await page.goto(path);
        const found = await page.evaluate(() => {
          const main = document.querySelector("main")!;
          // The default for running text: an untouched .vr-body in this page, at this width.
          const probe = document.createElement("div");
          probe.className = "vr-body";
          main.appendChild(probe);
          const base = getComputedStyle(probe).fontSize;
          probe.remove();
          return [...main.querySelectorAll("p")]
            .filter((p) => (p.textContent ?? "").trim().length > 80)
            // The hero intro and form chrome are larger or smaller on purpose.
            .filter((p) => !p.closest(".vr-hero-copy, .vr-hero-layout, .vr-form, .vr-contact-details, .vr-editor-hidden"))
            .map((p) => ({ size: getComputedStyle(p).fontSize, base, text: (p.textContent ?? "").trim().slice(0, 40) }))
            .filter((item) => item.size !== item.base);
        });
        for (const item of found) odd.push(`${path} (${item.size} not ${item.base}): ${item.text}`);
      }
      expect(odd).toEqual([]);
    });
  }

  test("a paragraph is never a main heading", async ({ page }) => {
    for (const path of ["/", "/kundalini-jooga"]) {
      await page.goto(path);
      const headings = await page.locator("main h1").allTextContents();
      for (const text of headings) expect(text.trim().length).toBeLessThanOrEqual(80);
      expect(headings.length).toBeLessThanOrEqual(1);
    }
  });

  test("the contact name leads and the details are smaller", async ({ page }) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/kontakt");
      const sizes = await page.evaluate(() => {
        const px = (selector: string) => parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize);
        return { name: px(".vr-contact-name"), email: px(".vr-contact-personal a"), company: px(".vr-contact-company p") };
      });
      expect(sizes.name).toBeGreaterThanOrEqual(24);
      expect(sizes.name).toBeGreaterThan(sizes.email * 1.4);
      expect(sizes.email).toBeLessThanOrEqual(16.5);
      expect(sizes.company).toBeLessThanOrEqual(16.5);
      await noHorizontalOverflow(page);
    }
  });
});
