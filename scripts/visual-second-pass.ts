import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, webkit, type Browser, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
const OUT = join(process.cwd(), "tmp", "second-pass-audit");

const PAGES = [
  { name: "home", path: "/" },
  { name: "kontakt", path: "/kontakt" },
  { name: "eratunnid", path: "/eratunnid" },
  { name: "gong", path: "/pehme-jooga-ja-gong" },
  { name: "kundalini", path: "/kundalini-jooga" },
  { name: "minust", path: "/minust" },
  { name: "kkk", path: "/joogatunni-kkk" },
  { name: "hea-teada", path: "/hea-teada" },
] as const;

async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(600);
  await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
  await page.waitForTimeout(250);
  await page.evaluate("window.scrollTo(0, 0)");
}

async function styles(page: Page) {
  return page.evaluate(`(() => {
    const pick = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        selector,
        family: s.fontFamily,
        size: s.fontSize,
        weight: s.fontWeight,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        transform: s.textTransform,
        color: s.color,
      };
    };
    return {
      body: pick("body"),
      site: pick(".vr-site"),
      nav: pick(".vr-nav a, .vr-nav-sheet a"),
      wordmark: pick(".vr-wordmark--hero, .vr-wordmark--header"),
      heading: pick("h1, h2.vr-heading, .vr-page-title"),
      bodyText: pick(".vr-body, .vr-rich p, .vr-body p"),
      field: pick(".vr-field"),
      input: pick(".vr-field input"),
      button: pick(".vr-cta"),
      details: pick(".vr-contact-details"),
      footer: pick(".vr-footer"),
      h1Count: document.querySelectorAll("h1").length,
    };
  })()`);
}

async function capture(browser: Browser, engine: string) {
  const shots = join(OUT, "screenshots");
  mkdirSync(shots, { recursive: true });
  const records: unknown[] = [];
  const widths = engine === "chromium" ? [360, 390, 768, 1024, 1440] : [390, 1024];

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const subset =
      engine === "webkit"
        ? PAGES.filter((item) => item.name === "home" || item.name === "kontakt")
        : width === 390 || width === 1440
          ? PAGES
          : PAGES.filter((item) => item.name === "home" || item.name === "kontakt" || item.name === "eratunnid" || item.name === "gong");
    for (const item of subset) {
      await page.goto(`${BASE}${item.path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle(page);
      const file = `${item.name}-${width}${engine === "webkit" ? "-webkit" : ""}.png`;
      await page.screenshot({ path: join(shots, file), fullPage: true, animations: "disabled" });
      if ((item.name === "home" || item.name === "kontakt") && (width === 390 || width === 1440)) {
        records.push({ engine, page: item.path, width, styles: await styles(page) });
      }
    }
    if (width === 390) {
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await settle(page);
      const toggle = page.getByRole("button", { name: "Ava menüü" });
      if (await toggle.isVisible()) {
        await toggle.click();
        await page.screenshot({ path: join(shots, `menu-390${engine === "webkit" ? "-webkit" : ""}.png`), animations: "disabled" });
      }
    }
    await context.close();
  }
  return records;
}

async function main() {
  mkdirSync(join(OUT, "screenshots"), { recursive: true });
  const chrome = await chromium.launch();
  const chromeStyles = await capture(chrome, "chromium");
  await chrome.close();

  let webkitStyles: unknown[] = [];
  try {
    const safari = await webkit.launch();
    webkitStyles = await capture(safari, "webkit");
    await safari.close();
  } catch (error) {
    webkitStyles = [{ error: error instanceof Error ? error.message : "webkit failed" }];
  }

  writeFileSync(join(OUT, "typography-audit.json"), JSON.stringify({ capturedAt: new Date().toISOString(), base: BASE, chromeStyles, webkitStyles }, null, 2));
  console.log(`Wrote screenshots and typography-audit.json for ${BASE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Visual capture failed");
  process.exit(1);
});
