import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

async function main() {
  mkdirSync("tmp/second-pass-audit/screenshots", { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:3001/kontakt", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(500);
  await page.addStyleTag({
    content: `
      .vr-public, .vr-site {
        --vr-bg-main: #2A1520;
        --vr-bg-warm: #3D1C2C;
        --vr-bg-soft: #351A28;
        --vr-text: #F7F1EA;
        --vr-text-muted: #D2C0C6;
        --vr-accent-gold: #E6C985;
        --vr-line: #5C3344;
        --vr-button-bg: #E6C985;
        --vr-button-text: #2A1520;
      }
      .vr-header { background: #2A1520; }
    `,
  });
  await page.screenshot({
    path: "tmp/second-pass-audit/screenshots/theme-b-kontakt-1440.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "tmp/second-pass-audit/screenshots/theme-b-kontakt-390.png",
    fullPage: true,
    animations: "disabled",
  });
  await browser.close();
  console.log("Theme B preview shots written");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Theme B capture failed");
  process.exit(1);
});
