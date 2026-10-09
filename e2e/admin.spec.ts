import { expect, test } from "@playwright/test";

/**
 * Logged-in checks. They only read and undo, never save, so they are safe to point at any environment,
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
});
