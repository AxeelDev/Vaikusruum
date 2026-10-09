/**
 * Client feedback, fourth pass. Content changes applied to the database.
 *
 *   pnpm tsx --env-file=.env scripts/apply-fourth-pass.ts           # dry run, writes tmp/fourth-pass/
 *   pnpm tsx --env-file=.env scripts/apply-fourth-pass.ts --apply   # writes to the database and storage
 *
 * - Hero logo: swap the 247px PNG for the sharp render of the vector master (scripts/build-logo.ts).
 * - Minust: show the bridge photo at the end of the bio (it stays on the home page as well).
 * - Pehme jooga ja gong: register through the Üksmaja event link instead of the form.
 * - Minust: the ajakirimuusika.ee link was saved without an address; give it one.
 *
 * Every run writes a backup of the touched rows and a before/after manifest. Steps that already match are skipped.
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

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const OLD_LOGO = "brand/logo-transparent.png";
const LOGO = { local: "public/brand/logo-vaikusruum.png", storage: "brand/logo-vaikusruum.png", alt: "Vaikusruum logo" };
const BRIDGE = "client/2026/miina-sillal.jpg";
const GONG_OFFERING = "pehme-jooga-ja-gong";
const GONG_REGISTRATION_URL = "https://yksmaja.ee/events/pehme-jooga-ja-loogastus-veenuse-gongiga-3/";

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

/** Replaces every occurrence of one media id inside a section's content and style. */
function swapMediaId(value: unknown, from: string, to: string): unknown {
  if (value === from) return to;
  if (Array.isArray(value)) return value.map((item) => swapMediaId(item, from, to));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Json).map(([key, item]) => [key, swapMediaId(item, from, to)]));
}

async function logo() {
  console.log("Hero logo");
  const oldId = await mediaId(OLD_LOGO);
  let newId = await mediaId(LOGO.storage);
  if (!newId) {
    changes.push({ table: "media", id: LOGO.storage, field: "insert", before: null, after: LOGO, reason: "Sharp logo rendered from the vector master" });
    console.log(`  + media ${LOGO.storage}`);
    if (APPLY) {
      const buffer = readFileSync(resolve(process.cwd(), LOGO.local));
      const { error } = await supabase.storage.from("site-media").upload(LOGO.storage, buffer, { contentType: "image/png", upsert: true });
      if (error) throw new Error(`upload logo: ${error.message}`);
      must(
        await supabase.from("media").upsert({ storage_path: LOGO.storage, alt_text: LOGO.alt, focal_x: 50, focal_y: 50 }, { onConflict: "storage_path" }),
        "media logo",
      );
      newId = await mediaId(LOGO.storage);
      if (!newId) throw new Error("Logo media row missing after upload");
    } else {
      newId = "00000000-0000-4000-8000-dry-run-logo";
    }
  } else {
    console.log(`  = media ${LOGO.storage} already uploaded`);
  }
  if (!oldId) return console.log(`  = no ${OLD_LOGO} media row; nothing to swap`);
  const hero = await section("avaleht", "hero");
  const next = {
    content: swapMediaId(hero.content, oldId, newId) as Json,
    style: swapMediaId(hero.style, oldId, newId) as Json,
  };
  await saveSection(hero, next, "logo media id", "Use the sharp logo in the hero");
}

async function minustPhoto() {
  console.log("Minust bridge photo");
  const bridgeId = await mediaId(BRIDGE);
  if (!bridgeId) throw new Error(`Missing media ${BRIDGE}`);
  const bio = await section("minust", "bio");
  const style = clone(bio.style);
  style.mediaId = bridgeId;
  const tree = style.layoutTree as { root?: { children?: Json[] } } | undefined;
  const root = tree?.root;
  if (!root || !Array.isArray(root.children)) throw new Error("minust/bio has no layout tree");
  const prefix = String(root.children[0]?.id ?? `layout.${bio.id}.body`).replace(/\.[^.]+$/, "");
  const hasImage = root.children.some((child) => child.elementType === "image" && (child.field ?? "image") === "image");
  if (!hasImage) root.children.push({ id: `${prefix}.image`, type: "element", field: "image", label: "Pilt", elementType: "image" });
  // Show the whole photo, like on the home page, rather than a landscape crop.
  const home = await section("avaleht", "yoga");
  if (home.style.image && typeof home.style.image === "object") style.image = clone(home.style.image);
  await saveSection(bio, { content: bio.content, style }, "image at the end", "Client: the bridge photo goes to the end of Minust");
}

/** Gives link marks without an address the URL they display. */
function repairLinks(node: Json): Json {
  const next = { ...node };
  if (Array.isArray(next.marks) && typeof next.text === "string" && /^https?:\/\/\S+$/.test(next.text.trim())) {
    next.marks = (next.marks as Json[]).map((mark) => {
      const attrs = (mark.attrs ?? {}) as Json;
      if (mark.type !== "link" || (typeof attrs.href === "string" && attrs.href)) return mark;
      return { ...mark, attrs: { ...attrs, href: (next.text as string).trim(), target: "_blank", rel: "noopener noreferrer nofollow" } };
    });
  }
  if (Array.isArray(next.content)) next.content = (next.content as Json[]).map(repairLinks);
  return next;
}

async function minustLink() {
  console.log("Minust article link");
  const bio = await section("minust", "bio");
  const content = clone(bio.content);
  if (content.body && typeof content.body === "object") content.body = repairLinks(content.body as Json);
  await saveSection(bio, { content, style: bio.style }, "link href", "The ajakirimuusika.ee link had no address");
}

async function gongRegistration() {
  console.log("Gong registration");
  const row = must(
    await supabase.from("offerings").select("id, registration_mode, registration_url").eq("slug", GONG_OFFERING).maybeSingle(),
    "gong offering",
  );
  if (!row) throw new Error("Missing gong offering");
  backup[`offerings:${GONG_OFFERING}`] = clone(row);
  const next = { registration_mode: "external_link", registration_url: GONG_REGISTRATION_URL };
  if (row.registration_mode === next.registration_mode && row.registration_url === next.registration_url) {
    console.log("  = offering already uses the link");
  } else {
    changes.push({ table: "offerings", id: row.id, field: "registration", before: row, after: next, reason: "Client: register through Üksmaja, remove the form" });
    console.log("  ~ offering: form -> external link");
    if (APPLY) must(await supabase.from("offerings").update(next).eq("id", row.id), "update gong offering");
  }
  const practical = await section("pehme-jooga-ja-gong", "practical");
  if (practical.content.eventLinkUrl !== undefined) {
    await saveSection(
      practical,
      { content: { ...practical.content, eventLinkUrl: GONG_REGISTRATION_URL }, style: practical.style },
      "eventLinkUrl",
      "Keep the event link in step with the registration link",
    );
  }
}

async function main() {
  const outDir = resolve(process.cwd(), "tmp/fourth-pass");
  mkdirSync(outDir, { recursive: true });
  console.log(APPLY ? "Applying fourth pass" : "Dry run (add --apply to write)");

  await logo();
  await minustPhoto();
  await minustLink();
  await gongRegistration();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(join(outDir, `backup-${stamp}.json`), JSON.stringify(backup, null, 2));
  writeFileSync(join(outDir, `manifest-${stamp}.json`), JSON.stringify({ applied: APPLY, at: new Date().toISOString(), changes }, null, 2));
  console.log(`${changes.length} change(s). Backup and manifest in tmp/fourth-pass/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
