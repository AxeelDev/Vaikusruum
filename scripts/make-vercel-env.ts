import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(process.cwd(), ".env");
const target = resolve(process.cwd(), ".env.vercel");
const raw = readFileSync(source, "utf8");
writeFileSync(target, raw);
const keys = raw
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => line.slice(0, line.indexOf("=")));
console.log(`Wrote .env.vercel with ${keys.length} variables.`);
