/**
 * Client feedback, third pass. Content-only changes, applied to the database.
 *
 *   pnpm tsx --env-file=.env scripts/apply-third-pass.ts           # dry run, writes tmp/third-pass/
 *   pnpm tsx --env-file=.env scripts/apply-third-pass.ts --apply   # writes to the database
 *   ... --hero-from tmp/third-pass/backup-<stamp>.json             # rebuild the hero from its original row
 *
 * Rows are found by page slug + section_key. Every run writes a backup of the
 * touched rows and a before/after manifest. Steps that already match are skipped.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const APPLY = process.argv.includes("--apply");
// Re-run the hero step from the original row in a backup file (e.g. after an earlier layout).
const HERO_FROM = process.argv.includes("--hero-from") ? process.argv[process.argv.indexOf("--hero-from") + 1] : null;

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const HEADING_COLOR = "#5C1836";
const BRAND_NAME = "Vaikusruum";
const LOGO = { local: "public/brand/logo-transparent.png", storage: "brand/logo-transparent.png", alt: "Vaikusruum logo" };
const PHOTO = { swing: "client/2026/miina-kiigel.jpg", bridge: "client/2026/miina-sillal.jpg" };
const PRIVATE_FROM = "sünnituseks ettevalmistav.";
const PRIVATE_TO = "sünnituseks ettevalmistava suunitlusega.";
const HEA_TEADA_ITEM = "Paar tundi enne joogat ei ole soovitav süüa tugevat toidukorda.";

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

function heroFromBackup(file: string): Section {
  const data = JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8")) as Record<string, Section>;
  const row = data["sections:avaleht/hero"];
  if (!row) throw new Error(`No hero row in ${file}`);
  return row;
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

async function mediaId(storagePath: string): Promise<string | null> {
  const row = must(await supabase.from("media").select("id").eq("storage_path", storagePath).maybeSingle(), `media ${storagePath}`);
  return row?.id ?? null;
}

async function saveSection(row: Section, next: Pick<Section, "content" | "style">, field: string, reason: string) {
  const before = { content: row.content, style: row.style };
  if (same(before, next)) {
    console.log(`  = ${row.section_key}: ${field} already done`);
    return;
  }
  changes.push({ table: "sections", id: row.id, field, before, after: next, reason });
  console.log(`  ~ ${row.section_key}: ${field}`);
  if (!APPLY) return;
  must(await supabase.from("sections").update({ content: next.content, style: next.style }).eq("id", row.id), `update ${row.section_key}`);
}

function removeNodes(node: Json, drop: (child: Json) => boolean): Json {
  const next = { ...node };
  if (Array.isArray(next.children)) next.children = (next.children as Json[]).filter((child) => !drop(child)).map((child) => removeNodes(child, drop));
  if (Array.isArray(next.columns)) next.columns = (next.columns as Json[]).map((child) => removeNodes(child, drop));
  return next;
}

function findNode(node: Json, match: (child: Json) => boolean): Json | null {
  if (match(node)) return node;
  for (const key of ["children", "columns"] as const) {
    const list = node[key];
    if (!Array.isArray(list)) continue;
    for (const child of list as Json[]) {
      const found = findNode(child, match);
      if (found) return found;
    }
  }
  return null;
}

function layoutRoot(row: Section): Json | null {
  const tree = row.style.layoutTree as { root?: Json } | undefined;
  return tree?.root ?? null;
}

async function ensureLogo(): Promise<string> {
  const existing = await mediaId(LOGO.storage);
  if (existing) return existing;
  changes.push({ table: "media", id: LOGO.storage, field: "insert", before: null, after: LOGO, reason: "Transparent logo for the home hero" });
  console.log(`  + media ${LOGO.storage}`);
  if (!APPLY) return "00000000-0000-4000-8000-dry-run-logo";
  const buffer = readFileSync(resolve(process.cwd(), LOGO.local));
  const { error } = await supabase.storage.from("site-media").upload(LOGO.storage, buffer, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`upload logo: ${error.message}`);
  must(
    await supabase.from("media").upsert({ storage_path: LOGO.storage, alt_text: LOGO.alt, focal_x: 50, focal_y: 50 }, { onConflict: "storage_path" }),
    "media logo",
  );
  const id = await mediaId(LOGO.storage);
  if (!id) throw new Error("Logo media row missing after upload");
  return id;
}

async function theme() {
  console.log("Theme");
  const row = must(await supabase.from("theme_settings").select("id, tokens").eq("id", 1).maybeSingle(), "theme");
  if (!row) throw new Error("Missing theme_settings");
  backup.theme = clone(row);
  const tokens = row.tokens as Json;
  if (tokens.headingColor === HEADING_COLOR) return console.log("  = headingColor already done");
  changes.push({ table: "theme_settings", id: "1", field: "tokens.headingColor", before: tokens.headingColor ?? null, after: HEADING_COLOR, reason: "Headings in a darker shade of the brand purple" });
  console.log("  ~ headingColor");
  if (APPLY) must(await supabase.from("theme_settings").update({ tokens: { ...tokens, headingColor: HEADING_COLOR } }).eq("id", 1), "update theme");
}

async function home() {
  console.log("Avaleht");
  const swing = await mediaId(PHOTO.swing);
  const bridge = await mediaId(PHOTO.bridge);
  if (!swing || !bridge) throw new Error("Home photos are missing from media");
  const logoId = await ensureLogo();

  // Hero: same two-column layout as before, the logo takes the photo's place.
  // The photo moves to the next screen. On phones the logo comes first.
  const hero = await section("avaleht", "hero");
  const source = HERO_FROM ? heroFromBackup(HERO_FROM) : hero;
  const root = layoutRoot(source);
  if (!root || root.type !== "columns") throw new Error("Hero layout is not two columns; pass --hero-from <backup.json> with the original row");
  const columns = root.columns as Json[];
  const titleFields = ((columns[0].children as Json[]) ?? []).map((n) => String(n.field ?? "")).filter((field) => /vaikus/i.test(String(source.content[field] ?? "")));
  const heroContent: Json = { ...source.content, title: BRAND_NAME };
  for (const field of titleFields) heroContent[field] = BRAND_NAME;
  heroContent["custom.image.logo"] = { mediaId: logoId, crop: "original", size: 60, align: "center" };
  const heroStyle: Json = {
    ...source.style,
    layoutTree: {
      ...(source.style.layoutTree as Json),
      root: {
        ...root,
        mobile: { mode: "stack", order: "right-first" },
        columns: [
          columns[0],
          { ...columns[1], children: [{ id: `layout.${hero.id}.custom.image.logo`, type: "element", field: "custom.image.logo", label: "Logo", elementType: "image" }] },
        ],
      },
    },
  };
  await saveSection(hero, { content: heroContent, style: heroStyle }, "hero logo + one-word title", "Logo with the Vaikusruum title; photo moves to the next screen");

  // Miina intro: takes the swing photo, photo first on mobile.
  const miina = await section("avaleht", "miina");
  await saveSection(
    miina,
    { content: miina.content, style: { ...miina.style, mediaId: swing, image: { crop: "original" }, mobileOrder: "image-first" } },
    "style.mediaId → swing photo",
    "Photo on the screen after the hero",
  );

  // Yoga text: keeps the bridge photo, text first on mobile so photos never stack.
  const yoga = await section("avaleht", "yoga");
  const yogaStyle: Json = {
    ...yoga.style,
    layout: "image-right",
    mediaId: bridge,
    image: { crop: "original" },
    mobileOrder: "text-first",
    columnBalance: "55-45",
    layoutTree: {
      version: 1,
      root: {
        id: `layout.${yoga.id}.columns`,
        type: "columns",
        label: "Jooga columns",
        ratio: "55-45",
        gap: "large",
        verticalAlign: "center",
        horizontalAlign: "center",
        mobile: { mode: "stack", order: "left-first" },
        columns: [
          {
            id: `layout.${yoga.id}.left`,
            type: "column",
            label: "Tekst",
            verticalAlign: "center",
            horizontalAlign: "center",
            children: [{ id: `layout.${yoga.id}.body`, type: "element", field: "body", label: "Tekst", elementType: "text" }],
          },
          {
            id: `layout.${yoga.id}.right`,
            type: "column",
            label: "Pilt",
            verticalAlign: "center",
            horizontalAlign: "center",
            children: [{ id: `layout.${yoga.id}.image`, type: "element", field: "image", label: "Foto", elementType: "image" }],
          },
        ],
      },
    },
  };
  await saveSection(yoga, { content: yoga.content, style: yogaStyle }, "split with bridge photo", "Keep the bridge photo; text → photo on mobile");
}

async function kundalini() {
  console.log("Kundalini jooga");
  const row = await section("kundalini-jooga", "practical");
  const root = layoutRoot(row);
  if (!root) return console.log("  = no layout tree, dates already hidden publicly");
  const nextRoot = removeNodes(root, (n) => n.field === "datesLabel");
  await saveSection(
    row,
    { content: { ...row.content, showDates: false }, style: { ...row.style, layoutTree: { ...(row.style.layoutTree as Json), root: nextRoot } } },
    "remove Kuupäevad",
    "Dates not needed on this page",
  );
}

async function gong() {
  console.log("Pehme jooga ja gong");
  const practical = await section("pehme-jooga-ja-gong", "practical");
  await saveSection(practical, { content: { ...practical.content, eventLinkLabel: "" }, style: practical.style }, "hide Üks Maja link", "Link not needed; URL kept");

  const opening = await section("pehme-jooga-ja-gong", "opening");
  const image = { ...((opening.style.image as Json | undefined) ?? {}), crop: "original" };
  await saveSection(opening, { content: opening.content, style: { ...opening.style, image } }, "photo crop → original", "Show the whole photo including the candle");
}

async function eratunnid() {
  console.log("Eratunnid");
  const row = await section("eratunnid", "lessons");
  const lessons = Array.isArray(row.content.lessons) ? (row.content.lessons as Json[]) : [];
  const next = lessons.map((lesson) => {
    const description = String(lesson.description ?? "");
    return description.includes(PRIVATE_FROM) ? { ...lesson, description: description.replace(PRIVATE_FROM, PRIVATE_TO) } : lesson;
  });
  await saveSection(row, { content: { ...row.content, lessons: next }, style: row.style }, "pregnancy lesson wording", "Client wording");
}

async function heaTeada() {
  console.log("Hea teada");
  const row = await section("hea-teada", "notes");
  const items = Array.isArray(row.content.items) ? (row.content.items as string[]) : [];
  const next = items.some((item) => item.trim() === HEA_TEADA_ITEM) ? items : [...items, HEA_TEADA_ITEM];
  await saveSection(row, { content: { ...row.content, items: next }, style: row.style }, "add meal note", "Client asked for this sentence");
}

async function minust() {
  console.log("Minust");
  const row = await section("minust", "bio");
  const root = layoutRoot(row);
  const body = (root && findNode(root, (n) => n.field === "body")) ?? { id: `layout.${row.id}.body`, type: "element", field: "body", label: "Lõik", elementType: "text" };
  const fieldStyles = { ...((row.style.fieldStyles as Json | undefined) ?? {}) };
  fieldStyles.body = { ...((fieldStyles.body as Json | undefined) ?? {}), width: 720, maxWidth: 720 };
  await saveSection(
    row,
    {
      content: row.content,
      style: {
        ...row.style,
        layout: "centered",
        fieldStyles,
        layoutTree: {
          version: 1,
          root: { id: `layout.${row.id}.content`, type: "group", label: "Sisu", gap: "medium", children: [body] },
        },
      },
    },
    "single wide column, no photo",
    "Photo left out for now; text gets a wider column",
  );
}

async function main() {
  console.log(APPLY ? "APPLYING to the database\n" : "Dry run (pass --apply to write)\n");
  const outDir = join(process.cwd(), "tmp", "third-pass");
  mkdirSync(outDir, { recursive: true });

  await theme();
  await home();
  await kundalini();
  await gong();
  await eratunnid();
  await heaTeada();
  await minust();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(join(outDir, `backup-${stamp}.json`), JSON.stringify(backup, null, 2));
  writeFileSync(join(outDir, `manifest-${stamp}.json`), JSON.stringify({ applied: APPLY, at: new Date().toISOString(), changes }, null, 2));
  console.log(`\n${changes.length} change(s) ${APPLY ? "applied" : "planned"}. Backup + manifest in tmp/third-pass/`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
