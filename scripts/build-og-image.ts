/**
 * Renders the default share image (src/app/opengraph-image.png, 1200x630): the vector logo on the site's warm background.
 *
 *   pnpm tsx scripts/build-og-image.ts
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

async function main() {
  const svg = await readFile(resolve("public/brand/logo-vaikusruum.svg"), "utf8");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(`<!doctype html>
    <body style="margin:0;width:1200px;height:630px;display:grid;place-items:center;background:#EEE3D4">
      <div style="width:420px;height:425px">${svg.replace("<svg ", '<svg width="420" height="425" ')}</div>
    </body>`);
  await page.screenshot({ path: resolve("src/app/opengraph-image.png") });
  await browser.close();
  console.log("Wrote src/app/opengraph-image.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
