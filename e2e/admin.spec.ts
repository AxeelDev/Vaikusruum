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

  test("every visible text on every page is clickable and opens a field that edits it", async ({ page }) => {
    test.setTimeout(480_000);
    await page.goto("/admin/editor");
    const names = (await page.locator(".vr-inspector .vr-ed-pages button").allTextContents()).map((text) => text.replace(/peidetud$/, "").trim());
    expect(names.length).toBeGreaterThan(5);
    const problems: string[] = [];
    const norm = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

    for (const name of names) {
      await page.goto("/admin/editor");
      await page.locator(".vr-inspector .vr-ed-pages button", { hasText: name }).first().click();
      await expect(page.locator(".vr-editor-canvas main")).toBeVisible();

      // 1. Every visible text sits inside an editable text, link or menu label. The only exception is the editor's
      //    own hint for an empty testimonials section.
      const { unowned, owners } = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.querySelector(".vr-editor-canvas")!, NodeFilter.SHOW_TEXT);
        const unowned: string[] = [];
        const owners = new Map<string, string>();
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
          const element = node.parentElement!;
          if (!text || element.closest("script,style,.vr-sr-only,.vr-hp,[aria-hidden='true']")) continue;
          const box = element.getBoundingClientRect();
          if (!box.width || !box.height) continue;
          const owner = element.closest<HTMLElement>("[data-vr-editable]");
          const type = owner?.dataset.vrSelectionType ?? "";
          const field = owner?.dataset.vrSelectionField ?? "";
          if (owner && field && ["text", "link", "nav"].includes(type) && !["form", "formButtons"].includes(field)) {
            if (!owners.has(owner.dataset.vrEditId!)) owners.set(owner.dataset.vrEditId!, text);
          } else if (!/^Tagasisidet ei ole veel lisatud/.test(text)) {
            unowned.push(text.slice(0, 50));
          }
        }
        return { unowned, owners: [...owners.entries()] };
      });
      for (const text of unowned) problems.push(`${name}: not editable: "${text}"`);

      // 2. A real click on each one selects it and shows a field holding that text (or the list that edits it).
      for (const [id, text] of owners) {
        const element = page.locator(`.vr-editor-canvas [data-vr-edit-id="${id}"]`).first();
        // The menu and the site name open the page on a plain click; they are edited with Shift-click.
        if (await element.evaluate((node) => Boolean(node.closest(".vr-header")))) continue;
        await element.scrollIntoViewIfNeeded();
        const box = await element.boundingBox();
        if (!box) continue;
        await element.click({ position: { x: Math.min(12, box.width / 2), y: Math.min(6, box.height / 2) } });
        const content = page.locator(".vr-inspector-modes button").first();
        if ((await content.getAttribute("data-active")) !== "true") await content.click();
        const header = ((await page.locator(".vr-inspector-contextbar > span").textContent()) ?? "").trim();
        const field = (await element.getAttribute("data-vr-selection-field")) ?? "";
        const values = await page
          .locator(".vr-inspector-scroll")
          .evaluate((scope) =>
            [...scope.querySelectorAll<HTMLInputElement>("textarea, input:not([type=checkbox]):not([type=file])")]
              .map((input) => input.value)
              .concat([...scope.querySelectorAll(".tiptap")].map((editor) => editor.textContent ?? "")),
          );
        const lists = ["dates", "lessons", "prices"].includes(field);
        const holdsText = values.some((value) => norm(value).includes(norm(text)) || (norm(value).length > 2 && norm(text).includes(norm(value))));
        // A field saved blank shows its standard wording on the page, so an empty box is fine for those.
        const blankDefault = values.some((value) => value === "");
        if (/konteiner|element/i.test(header) || (lists ? values.length === 0 : !holdsText && !blankDefault)) {
          problems.push(`${name}: "${text.slice(0, 30)}" (${field}) opened "${header}" with ${JSON.stringify(values.slice(0, 2))}`);
        }
      }
    }
    expect(problems).toEqual([]);
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
