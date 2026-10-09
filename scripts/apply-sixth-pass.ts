/**
 * Sixth pass. Content changes applied to the database.
 *
 *   pnpm tsx --env-file=.env scripts/apply-sixth-pass.ts           # dry run, writes tmp/sixth-pass/
 *   pnpm tsx --env-file=.env scripts/apply-sixth-pass.ts --apply   # writes to the database
 *
 * - Contact headings: "VÕTA KONTAKTI" becomes "VÕTA ÜHENDUST" (Kontakt page and homepage).
 * - One size for long body text: drop the saved size / role overrides on avaleht/yoga and
 *   kundalini-jooga/what (field "body"). The role "h1" also turned a paragraph into a main heading.
 *
 * Every run writes a backup of the touched rows and a before/after manifest. Steps that already match are skipped.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const APPLY = process.argv.includes("--apply");

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Json = Record<string, unknown>;
type Section = { id: string; page_id: string; section_key: string; section_type: string; content: Json; style: Json };
type Change = { table: string; id: string; field: string; before: unknown; after: unknown; reason: string };

const changes: Change[] = [];
const backup: Record<string, unknown> = {};

function must<T>(result: { data: T; error: { message: string } | null }, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// jsonb does not keep key order, so compare with sorted keys.
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value as Json).sort().map((key) => [key, stable((value as Json)[key])]));
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

async function section(slug: string, key: string): Promise<Section> {
  const page = must(await supabase.from("pages").select("id").eq("slug", slug).maybeSingle(), `page ${slug}`);
  if (!page) throw new Error(`Missing page ${slug}`);
  const row = must(
    await supabase.from("sections").select("id, page_id, section_key, section_type, content, style").eq("page_id", page.id).eq("section_key", key).maybeSingle(),
    `section ${slug}/${key}`,
  );
  if (!row) throw new Error(`Missing section ${slug}/${key}`);
  backup[`sections:${slug}/${key}`] = clone(row);
  return row as Section;
}

async function saveSection(row: Section, slug: string, next: Pick<Section, "content" | "style">, field: string, reason: string) {
  const before = { content: row.content, style: row.style };
  if (same(before, next)) {
    console.log(`  = ${slug}/${row.section_key}: ${field} already done`);
    return;
  }
  changes.push({ table: "sections", id: row.id, field, before, after: next, reason });
  console.log(`  ~ ${slug}/${row.section_key}: ${field}`);
  if (!APPLY) return;
  must(await supabase.from("sections").update({ content: next.content, style: next.style }).eq("id", row.id), `update ${slug}/${row.section_key}`);
}

const OLD_HEADING = "VÕTA KONTAKTI";
const NEW_HEADING = "VÕTA ÜHENDUST";

async function contactHeadings() {
  console.log("Contact headings");
  for (const slug of ["kontakt", "avaleht"]) {
    const row = await section(slug, "contact");
    const content = clone(row.content);
    const heading = typeof content.heading === "string" ? content.heading : "";
    if (heading.trim().toLowerCase() === OLD_HEADING.toLowerCase()) content.heading = NEW_HEADING;
    await saveSection(row, slug, { content, style: row.style }, "heading", `Client: "${OLD_HEADING}" reads as "${NEW_HEADING}"`);
  }
}

// Long text is one size. These two sections saved a pixel size (and the first a heading role) for their body.
const BODY_OVERRIDES = [
  { slug: "avaleht", key: "yoga" },
  { slug: "kundalini-jooga", key: "what" },
];
const SIZE_KEYS = ["size", "fontSize", "role"];

async function bodySizes() {
  console.log("Body text sizes");
  for (const { slug, key } of BODY_OVERRIDES) {
    const row = await section(slug, key);
    const style = clone(row.style);
    const fieldStyles = (style.fieldStyles ?? {}) as Record<string, Json>;
    const body = fieldStyles.body;
    if (body && typeof body === "object") {
      const kept = Object.fromEntries(Object.entries(body).filter(([name]) => !SIZE_KEYS.includes(name)));
      if (Object.keys(kept).length) fieldStyles.body = kept;
      else delete fieldStyles.body;
      style.fieldStyles = fieldStyles;
    }
    await saveSection(row, slug, { content: row.content, style }, "fieldStyles.body size / role", "Same size for all long body text; a paragraph is not a heading");
  }
}

async function main() {
  const outDir = resolve(process.cwd(), "tmp/sixth-pass");
  mkdirSync(outDir, { recursive: true });
  console.log(APPLY ? "Applying sixth pass" : "Dry run (add --apply to write)");

  await contactHeadings();
  await bodySizes();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(join(outDir, `backup-${stamp}.json`), JSON.stringify(backup, null, 2));
  writeFileSync(join(outDir, `manifest-${stamp}.json`), JSON.stringify({ applied: APPLY, at: new Date().toISOString(), changes }, null, 2));
  console.log(`${changes.length} change(s). Backup and manifest in tmp/sixth-pass/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
