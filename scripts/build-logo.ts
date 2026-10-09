/**
 * Builds the transparent hero logo from the vector master (public/brand/emblem-source.svg):
 * drops the white background and the "Kooskõla Sinu sees" subtitle, crops to the title + spiral exactly
 * like the original logo-transparent.png, and writes a clean SVG plus a high-resolution PNG.
 *
 *   pnpm tsx scripts/build-logo.ts [--width 1200] [--reference public/brand/logo-transparent.png]
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const OUT_WIDTH = Number(arg("width", "1200"));
const REFERENCE = resolve(arg("reference", "public/brand/logo-transparent.png"));
const SOURCE = resolve("public/brand/emblem-source.svg");
const OUT_SVG = resolve("public/brand/logo-vaikusruum.svg");
const OUT_PNG = resolve("public/brand/logo-vaikusruum.png");

async function main() {
const source = await readFile(SOURCE, "utf8");
const reference = (await readFile(REFERENCE)).toString("base64");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<!doctype html><body style="margin:0">${source}</body>`);
// tsx keeps function names via an injected __name helper that the page does not have.
await page.evaluate("globalThis.__name = (fn) => fn");

const result = await page.evaluate(async (refB64) => {
  const svg = document.querySelector("svg")!;
  svg.setAttribute("width", "375");
  svg.setAttribute("height", "375");
  const box = svg.getBoundingClientRect();
  const local = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
  };
  // Background rects go; subtitle glyphs are the brown letter groups below the spiral.
  for (const el of [...svg.children]) {
    if (el.tagName === "rect") el.remove();
    else if (el.tagName === "g") {
      const b = local(el);
      if (b.w === 0 || (el.getAttribute("fill") === "#af4c0f" && b.y >= 240)) el.remove();
    }
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of [...svg.children]) {
    if (el.tagName !== "g") continue;
    const b = local(el);
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }

  // The reference PNG was cut from a 500px render (scale 500/375); find its exact offset by alpha matching.
  const ref = new Image();
  ref.src = `data:image/png;base64,${refB64}`;
  await ref.decode();
  const W = ref.naturalWidth, H = ref.naturalHeight;
  const refCanvas = document.createElement("canvas");
  refCanvas.width = W; refCanvas.height = H;
  const rc = refCanvas.getContext("2d")!;
  rc.drawImage(ref, 0, 0);
  const refAlpha = rc.getImageData(0, 0, W, H).data;
  const unit = 375 / 500;

  async function render(vx: number, vy: number) {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("viewBox", `${vx} ${vy} ${W * unit} ${H * unit}`);
    clone.setAttribute("width", String(W));
    clone.setAttribute("height", String(H));
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    await img.decode();
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const cx = c.getContext("2d")!;
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, W, H).data;
    let diff = 0;
    for (let i = 3; i < d.length; i += 4) diff += Math.abs(d[i] - refAlpha[i]);
    return diff / (W * H);
  }

  let best = { vx: x0, vy: y0, diff: Infinity };
  for (const step of [1, 0.25, 0.0625]) {
    const cx = best.vx, cy = best.vy;
    for (let dx = -4; dx <= 4; dx++) {
      for (let dy = -4; dy <= 4; dy++) {
        const vx = cx + dx * step, vy = cy + dy * step;
        const diff = await render(vx, vy);
        if (diff < best.diff) best = { vx, vy, diff };
      }
    }
  }

  svg.setAttribute("viewBox", `${best.vx.toFixed(3)} ${best.vy.toFixed(3)} ${(W * unit).toFixed(3)} ${(H * unit).toFixed(3)}`);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.removeAttribute("zoomAndPan");
  return { svg: new XMLSerializer().serializeToString(svg), best, content: { x0, y0, x1, y1 }, W, H };
}, reference);

await writeFile(OUT_SVG, result.svg);

const height = Math.round((OUT_WIDTH * result.H) / result.W);
await page.setViewportSize({ width: OUT_WIDTH, height });
await page.setContent(
  `<!doctype html><body style="margin:0;background:transparent">${result.svg.replace("<svg ", `<svg width="${OUT_WIDTH}" height="${height}" `)}</body>`,
);
await page.locator("svg").screenshot({ path: OUT_PNG, omitBackground: true });
await browser.close();

console.log(JSON.stringify({ match: result.best, content: result.content, png: `${OUT_WIDTH}x${height}` }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
