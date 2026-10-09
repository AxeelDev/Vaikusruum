import { expect, test } from "@playwright/test";

/**
 * Logged-in checks. Apart from the testimonials test (which creates and removes its own "E2E ..." entries),
 * they only read and undo, never save, so they are safe to point at any environment,
 * but prefer a separate test project. Provide credentials through the environment:
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... pnpm test:e2e e2e/admin.spec.ts
 */
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe("admin (logged in)", () => {
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the logged-in checks.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("E-post").fill(email!);
    await page.getByLabel("Parool").fill(password!);
    await page.getByRole("button", { name: "Logi sisse" }).click();
    await expect(page.getByRole("heading", { name: "Ülevaade" })).toBeVisible();
  });

  test("admin sections open", async ({ page }) => {
    for (const [link, heading] of [
      ["Registreerumised", "Registreerumised"],
      ["Tagasiside", "Tagasiside"],
      ["Pildid", "Pildid"],
      ["Seaded", "Seaded"],
    ]) {
      const nav = page.getByRole("navigation", { name: "Haldus" });
      if (!(await nav.isVisible())) await page.getByRole("button", { name: "Ava menüü" }).click();
      await nav.getByRole("link", { name: link }).click();
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    }
  });

  test("editor selects exactly the clicked class-card line, edits live and undoes", async ({ page }) => {
    await page.goto("/admin/editor");
    const address = page.locator('[data-vr-edit-id$=".address"]').last();
    await address.scrollIntoViewIfNeeded();
    const original = (await address.textContent())?.trim() ?? "";
    await address.click();
    await expect(address).toHaveAttribute("data-vr-selected", "");
    const field = page.locator(".vr-inspector textarea").first();
    await expect(field).toHaveValue(original);
    await field.fill(`${original} TEST`);
    await expect(address).toContainText("TEST");
    await page.locator(".vr-editor-canvas").click({ position: { x: 5, y: 5 } }).catch(() => {});
    await page.getByRole("button", { name: "Võta tagasi" }).click();
    await expect(address).toHaveText(original);
    await expect(page.locator(".vr-editor-save-top")).toBeDisabled();
  });

  test("Valmis closes the whole panel and Paneel brings it back on the page list", async ({ page }) => {
    await page.goto("/admin/editor");
    const root = page.locator(".vr-editor-root");
    await expect(root).toHaveAttribute("data-inspector-open", "true");
    await page.locator('[data-vr-edit-id$=".address"]').last().click();
    await expect(page.locator(".vr-inspector-contextbar > span")).toHaveText(/tekst/i);
    await page.getByRole("button", { name: "Valmis" }).click();
    await expect(root).toHaveAttribute("data-inspector-open", "false");
    await page.getByRole("button", { name: "Paneel" }).click();
    await expect(root).toHaveAttribute("data-inspector-open", "true");
    await expect(page.locator(".vr-inspector-contextbar > span")).toHaveText("");
    await expect(page.getByRole("button", { name: "Paneel" })).toHaveCount(0);
  });

  test("clicking any text on any page opens a text panel, never a container", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/admin/editor");
    const names = (await page.locator(".vr-inspector .vr-ed-pages button").allTextContents()).map((text) => text.replace(/peidetud$/, "").trim());
    expect(names.length).toBeGreaterThan(5);
    const wrong: string[] = [];
    for (const name of names) {
      await page.goto("/admin/editor");
      await page.locator(".vr-inspector .vr-ed-pages button", { hasText: name }).first().click();
      await expect(page.locator(".vr-editor-canvas main")).toBeVisible();
      // Leaf text only: editable, with a field, and nothing editable inside.
      const ids = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".vr-editor-canvas main [data-vr-editable][data-vr-selection-field]")]
          .filter((el) => !el.querySelector("[data-vr-edit-id]") && el.dataset.vrSelectionType === "text")
          .map((el) => el.dataset.vrEditId as string),
      );
      for (const id of ids) {
        const element = page.locator(`.vr-editor-canvas [data-vr-edit-id="${id}"]`).first();
        await element.scrollIntoViewIfNeeded();
        const box = await element.boundingBox();
        if (!box) continue;
        await element.click({ position: { x: Math.min(12, box.width / 2), y: Math.min(8, box.height / 2) } });
        const header = (await page.locator(".vr-inspector-contextbar > span").textContent())?.trim() ?? "";
        // A rich paragraph is labelled "Lõik" and a form "Vorm"; what must never appear is a container.
        if (!/^(tekst|lõik|vorm)$/i.test(header)) wrong.push(`${name} · ${id} → "${header}"`);
      }
    }
    expect(wrong).toEqual([]);
  });

  test("testimonials: add, edit, reorder, hide name and photo, delete", async ({ page }) => {
    test.setTimeout(120_000);
    const marker = `E2E ${Date.now()}`;
    const cards = page.locator(".vr-testi-item");

    async function removeMine() {
      await page.goto("/admin/tagasiside");
      for (let guard = 0; guard < 10; guard += 1) {
        // The text is a field value, so look at the values rather than the markup.
        const index = await cards.locator("textarea").evaluateAll((fields) =>
          fields.findIndex((field) => (field as HTMLTextAreaElement).value.startsWith("E2E ")),
        );
        if (index < 0) break;
        const leftover = cards.nth(index);
        await leftover.getByRole("button", { name: "Kustuta" }).click();
        await leftover.getByRole("button", { name: "Kustuta" }).last().click();
        await expect(page.getByRole("status")).toContainText("kustutatud");
      }
    }

    await page.goto("/admin/tagasiside");
    const before = await cards.count();
    try {
      // Add one: the stand-ins show in the preview until a name and photo are given.
      await page.getByRole("button", { name: "Lisa tagasiside" }).click();
      const first = cards.nth(before);
      await first.getByRole("textbox", { name: "Tagasiside" }).fill(`${marker} üks`);
      await expect(first.locator(".vr-testi-preview")).toContainText("Joogakäija");
      await expect(first.locator(".vr-testi-preview img")).toHaveAttribute("src", /avatar-placeholder\.svg/);
      await first.getByRole("textbox", { name: "Nimi" }).fill("Mari");
      await first.getByRole("button", { name: "Lisa", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Salvestatud");

      // Add a second one and move it up.
      await page.getByRole("button", { name: "Lisa tagasiside" }).click();
      const second = cards.nth(before + 1);
      await second.getByRole("textbox", { name: "Tagasiside" }).fill(`${marker} kaks`);
      await second.getByRole("button", { name: "Lisa", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Salvestatud");
      await second.getByRole("button", { name: "Liiguta ülespoole" }).click();
      await expect(page.getByRole("status")).toContainText("Järjekord salvestatud");

      // Hide the name and the photo, edit the text, save.
      await page.reload();
      const kaks = cards.nth(before);
      await expect(kaks.getByRole("textbox", { name: "Tagasiside" })).toHaveValue(`${marker} kaks`);
      await expect(cards.nth(before + 1).getByRole("textbox", { name: "Tagasiside" })).toHaveValue(`${marker} üks`);
      const üks = cards.nth(before + 1);
      await üks.getByLabel("Näita nime").uncheck();
      await üks.getByLabel("Näita pilti").uncheck();
      await expect(üks.locator(".vr-testi-preview .vr-testimonial-by")).toHaveCount(0);
      await üks.getByRole("textbox", { name: "Tagasiside" }).fill(`${marker} üks muudetud`);
      await üks.getByRole("button", { name: "Salvesta" }).click();
      await expect(page.getByRole("status")).toContainText("Salvestatud");

      await page.reload();
      const reloaded = cards.nth(before + 1);
      await expect(reloaded.getByRole("textbox", { name: "Tagasiside" })).toHaveValue(`${marker} üks muudetud`);
      await expect(reloaded.getByLabel("Näita nime")).not.toBeChecked();
      await expect(reloaded.getByLabel("Näita pilti")).not.toBeChecked();
    } finally {
      await removeMine();
    }
    await expect(cards).toHaveCount(before);
  });
});
