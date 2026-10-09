/**
 * Builds the favicon from the spiral in public/brand/logo-vaikusruum.svg.
 * The tab icon is an SVG of those dots, so it stays sharp at any size.
 * Apple home-screen icons cannot be SVG, so apple-icon.png is the same spiral drawn at 180px.
 *
 *   pnpm tsx scripts/build-favicon.ts
 */
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const SOURCE = resolve("public/brand/logo-vaikusruum.svg");
const ICON = resolve("src/app/icon.svg");
const APPLE = resolve("src/app/apple-icon.png");
const OLD_PNG = resolve("src/app/icon.png");
const BG = "#fcfaee";

type Stop = { t: number; r: number; g: number; b: number };

function num(n: number) {
  const rounded = Math.round(n * 100) / 100;
  return rounded === 0 ? "0" : String(rounded);
}

function offset(t: number) {
  const rounded = Math.round(t * 1e6) / 1e6;
  return rounded === 0 ? "0" : String(rounded);
}

function roundPath(d: string) {
  return d.replace(/-?\d*\.?\d+/g, (raw) => num(Number(raw)));
}

function commands(d: string) {
  return [...d.matchAll(/[MLHVCSQTAZ]/gi)].map((match) => match[0]);
}

function boundsOf(d: string) {
  const nums = [...d.matchAll(/-?\d*\.?\d+/g)].map((match) => Number(match[0]));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]);
    maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]);
    maxY = Math.max(maxY, nums[i + 1]);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function hex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function parseStops(gradient: string): Stop[] {
  return [...gradient.matchAll(/stop-color="rgb\(([^)]+)\)" offset="([^"]+)"/g)].map((match) => {
    const [r, g, b] = match[1].split(",").map((part) => Math.round((parseFloat(part) / 100) * 255));
    return { t: Number(match[2]), r, g, b };
  });
}

/** Drops stops that sit on the straight line between their neighbors. */
function simplifyStops(stops: Stop[], maxErr = 1) {
  const keep = new Set([0, stops.length - 1]);
  for (;;) {
    let worst = -1;
    let worstErr = 0;
    const kept = [...keep].sort((a, b) => a - b);
    for (let k = 0; k < kept.length - 1; k++) {
      const left = stops[kept[k]];
      const right = stops[kept[k + 1]];
      const span = right.t - left.t;
      for (let i = kept[k] + 1; i < kept[k + 1]; i++) {
        const u = span === 0 ? 0 : (stops[i].t - left.t) / span;
        const err = Math.max(
          Math.abs(stops[i].r - (left.r + (right.r - left.r) * u)),
          Math.abs(stops[i].g - (left.g + (right.g - left.g) * u)),
          Math.abs(stops[i].b - (left.b + (right.b - left.b) * u)),
        );
        if (err > worstErr) {
          worstErr = err;
          worst = i;
        }
      }
    }
    if (worst < 0 || worstErr <= maxErr) break;
    keep.add(worst);
  }
  return [...keep].sort((a, b) => a - b).map((index) => stops[index]);
}

function spiralSvg(source: string) {
  const clip = source.match(/id="aa164c3d74"><path d="([^"]+)"/);
  const gradient = source.match(/<linearGradient\b[^>]*>[\s\S]*?<\/linearGradient>/);
  if (!clip || !gradient) throw new Error("Could not find the spiral in the logo SVG.");

  const shapes: string[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let circles = 0;
  let ellipses = 0;
  let paths = 0;

  for (const part of clip[1].split(/(?=M\s)/).map((piece) => piece.trim()).filter(Boolean)) {
    const box = boundsOf(part);
    if (!(box.w > 0.05 && box.h > 0.05)) continue;
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);

    const curves = commands(part).filter((command) => command.toUpperCase() === "C").length;
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    const rx = box.w / 2;
    const ry = box.h / 2;
    if (curves === 4 && Math.abs(rx - ry) / Math.max(rx, ry) <= 0.08) {
      shapes.push(`<circle cx="${num(cx)}" cy="${num(cy)}" r="${num((rx + ry) / 2)}"/>`);
      circles += 1;
    } else if (curves === 4) {
      shapes.push(`<ellipse cx="${num(cx)}" cy="${num(cy)}" rx="${num(rx)}" ry="${num(ry)}"/>`);
      ellipses += 1;
    } else {
      shapes.push(`<path d="${roundPath(part)}"/>`);
      paths += 1;
    }
  }

  if (circles < 1000) throw new Error(`Expected the spiral dots, found ${circles} circles.`);

  const pad = Math.max(maxX - minX, maxY - minY) * 0.1;
  let x = minX - pad;
  let y = minY - pad;
  let width = maxX - minX + pad * 2;
  let height = maxY - minY + pad * 2;
  const side = Math.max(width, height);
  x -= (side - width) / 2;
  y -= (side - height) / 2;
  width = side;
  height = side;

  const stops = simplifyStops(parseStops(gradient[0]));
  const gradientTag = gradient[0]
    .replace(/id="[^"]+"/, 'id="g"')
    .replace(/<stop\b[^>]*\/>/g, "")
    .replace("</linearGradient>", `${stops
      .map((stop) => `<stop offset="${offset(stop.t)}" stop-color="${hex(stop.r, stop.g, stop.b)}"/>`)
      .join("")}</linearGradient>`);

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${num(x)} ${num(y)} ${num(width)} ${num(height)}">`,
    `<rect x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}" fill="${BG}"/>`,
    "<defs>",
    gradientTag,
    `<clipPath id="c"><rect x="113.9375" y="112.5" width="147" height="150"/></clipPath>`,
    "</defs>",
    `<g fill="url(#g)" clip-path="url(#c)" shape-rendering="geometricPrecision">`,
    ...shapes,
    "</g>",
    "</svg>",
    "",
  ].join("\n");

  return { svg, circles, ellipses, paths, stops: stops.length };
}

async function appleIcon(svg: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><body style="margin:0">${svg.replace("<svg ", '<svg width="180" height="180" ')}</body>`,
  );
  const png = await page.locator("svg").screenshot({ omitBackground: true });
  await browser.close();
  return png;
}

async function main() {
  const source = await readFile(SOURCE, "utf8");
  const built = spiralSvg(source);
  await writeFile(ICON, built.svg);
  await writeFile(APPLE, await appleIcon(built.svg));
  await unlink(OLD_PNG).catch(() => {});
  console.log(
    `Wrote ${ICON} (${built.circles} circles, ${built.ellipses} ellipses, ${built.paths} paths, ${built.stops} gradient stops, ${built.svg.length} bytes) and ${APPLE}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
