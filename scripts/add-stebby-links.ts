/**
 * Puts a Stebby link element in the three spots the client marked. Run it only after the code with the
 * "stebby" element is deployed: an older build does not know the element.
 *
 *   pnpm tsx --env-file=.env scripts/add-stebby-links.ts           # dry run, writes tmp/stebby-links/
 *   pnpm tsx --env-file=.env scripts/add-stebby-links.ts --apply   # writes to the database
 *
 * - Avaleht, the classes list: between Kundalini jooga and Pehme jooga.
 * - Kundalini jooga and Pehme jooga ja gong, practical info: right after the price and payment text.
 *
 * The link itself is set in Seaded (Sotsiaalmeedia → Stebby); until then the logos stay hidden from visitors.
 * Every run writes a backup of the touched rows and a before/after manifest. Sections that already have one are skipped.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getSectionLayoutTree, insertLayoutElement } from "@/lib/editor/layout-tree";
import type { LayoutNode, SectionRow } from "@/types/content";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const APPLY = process.argv.includes("--apply");

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Change = { table: string; id: string; field: string; before: unknown; after: unknown; reason: string };

const changes: Change[] = [];
const backup: Record<string, unknown> = {};

function must<T>(result: { data: T; error: { message: string } | null }, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function section(slug: string, key: string): Promise<SectionRow> {
  const page = must(await supabase.from("pages").select("id").eq("slug", slug).maybeSingle(), `page ${slug}`);
  if (!page) throw new Error(`Missing page ${slug}`);
  const row = must(await supabase.from("sections").select("*").eq("page_id", page.id).eq("section_key", key).maybeSingle(), `section ${slug}/${key}`);
  if (!row) throw new Error(`Missing section ${slug}/${key}`);
  backup[`sections:${slug}/${key}`] = JSON.parse(JSON.stringify(row));
  return row as SectionRow;
}

/** Adds the element right after the top-level element whose id ends with `afterSuffix`. */
async function addAfter(slug: string, key: string, afterSuffix: string, reason: string) {
  const row = await section(slug, key);
  if (Object.keys(row.content).some((field) => field.startsWith("custom.stebby."))) {
    console.log(`  = ${slug}/${key}: already has a Stebby link`);
    return;
  }
  const root = getSectionLayoutTree(row).root;
  const children: LayoutNode[] = root.type === "group" ? root.children : [];
  const anchor = children.findIndex((child) => child.id.endsWith(afterSuffix));
  if (anchor < 0) throw new Error(`${slug}/${key}: no element ending with ${afterSuffix}`);
  const { section: next } = insertLayoutElement(row, "stebby", { parentId: root.id, index: anchor + 1, placement: "inside" });

  changes.push({ table: "sections", id: row.id, field: "content + style.layoutTree", before: { content: row.content, style: row.style }, after: { content: next.content, style: next.style }, reason });
  console.log(`  ~ ${slug}/${key}: Stebby link after ${afterSuffix}`);
  if (!APPLY) return;
  must(await supabase.from("sections").update({ content: next.content, style: next.style }).eq("id", row.id), `update ${slug}/${key}`);
}

async function main() {
  const outDir = resolve(process.cwd(), "tmp/stebby-links");
  mkdirSync(outDir, { recursive: true });
  console.log(APPLY ? "Adding Stebby links" : "Dry run (add --apply to write)");

  await addAfter("avaleht", "offerings", ".offering.b1000000-0000-4000-8000-000000000001", "Client: Stebby logo under Kundalini jooga on the homepage");
  await addAfter("kundalini-jooga", "practical", ".tasakaalLabel", "Client: Stebby logo after the payment line");
  await addAfter("pehme-jooga-ja-gong", "practical", ".tasakaalLabel", "Client: Stebby logo after the price and payment line");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(join(outDir, `backup-${stamp}.json`), JSON.stringify(backup, null, 2));
  writeFileSync(join(outDir, `manifest-${stamp}.json`), JSON.stringify({ applied: APPLY, at: new Date().toISOString(), changes }, null, 2));
  console.log(`${changes.length} change(s). Backup and manifest in tmp/stebby-links/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
