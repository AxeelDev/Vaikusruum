import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SEED_IDS } from "../src/lib/content/ids";
import { DEFAULT_PRIVATE_LESSONS, DEFAULT_PRIVATE_PRICES } from "../src/lib/content/private-lessons";
import { tallinnLocalToIso } from "../src/lib/content/events";
import { applyThemePreset } from "../src/lib/theme/presets";
import { parseTheme } from "../src/lib/theme/theme";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const GONG_EVENT_URL = "https://yksmaja.ee/events/pehme-jooga-ja-loogastus-veenuse-gongiga/";
const MEDIA_IDS = {
  swing: "d1000000-0000-4000-8000-000000000001",
  gong: "d1000000-0000-4000-8000-000000000002",
  sillal: "d1000000-0000-4000-8000-000000000003",
  kneeling: "d1000000-0000-4000-8000-000000000004",
} as const;
const ERATUNNID_SECTION_ID = "d2000000-0000-4000-8000-000000000001";

type ManifestChange = {
  table: string;
  id: string;
  field: string;
  before: unknown;
  after: unknown;
  reason: string;
};

function must<T>(result: { data: T; error: { message: string } | null }, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

function prepareJpeg(src: string, dest: string, max = 2000) {
  mkdirSync(dirname(dest), { recursive: true });
  const converted = spawnSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", String(max), src, "--out", dest], {
    encoding: "utf8",
  });
  if (converted.status !== 0) throw new Error(converted.stderr || `sips failed for ${src}`);
  spawnSync("xattr", ["-c", dest]);
}

async function ensurePhoto(input: {
  id: string;
  local: string;
  storagePath: string;
  alt: string;
  focalX?: number;
  focalY?: number;
}) {
  const existing = must(
    await supabase.from("media").select("id, storage_path, alt_text, focal_x, focal_y").eq("storage_path", input.storagePath).maybeSingle(),
    `media ${input.storagePath}`,
  );
  if (existing) return existing.id as string;

  const dest = resolve(process.cwd(), "tmp/derivatives", input.storagePath.replaceAll("/", "-"));
  prepareJpeg(resolve(process.cwd(), input.local), dest);
  const buffer = readFileSync(dest);
  const uploaded = await supabase.storage.from("site-media").upload(input.storagePath, buffer, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploaded.error && !/already exists|Duplicate/i.test(uploaded.error.message)) {
    throw new Error(`${input.storagePath}: ${uploaded.error.message}`);
  }
  const inserted = await supabase.from("media").upsert(
    {
      id: input.id,
      storage_path: input.storagePath,
      alt_text: input.alt,
      focal_x: input.focalX ?? 50,
      focal_y: input.focalY ?? 50,
    },
    { onConflict: "storage_path" },
  );
  if (inserted.error) throw new Error(`media insert ${input.storagePath}: ${inserted.error.message}`);
  return input.id;
}

async function patchRow(
  table: string,
  id: string,
  field: string,
  next: unknown,
  reason: string,
  current: unknown,
  changes: ManifestChange[],
  apply: () => Promise<void>,
) {
  if (JSON.stringify(current) === JSON.stringify(next)) return;
  changes.push({ table, id, field, before: current, after: next, reason });
  await apply();
}

async function main() {
  const outDir = join(process.cwd(), "tmp", "client-edits-audit");
  mkdirSync(outDir, { recursive: true });
  const changes: ManifestChange[] = [];

  const [pages, sections, offerings, events, settings, theme] = await Promise.all([
    supabase.from("pages").select("*").order("nav_order", { ascending: true }),
    supabase.from("sections").select("*"),
    supabase.from("offerings").select("*"),
    supabase.from("events").select("*"),
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("theme_settings").select("tokens, updated_at").eq("id", 1).maybeSingle(),
  ]);
  const pageRows = must(pages, "pages") ?? [];
  const sectionRows = must(sections, "sections") ?? [];
  const offeringRows = must(offerings, "offerings") ?? [];
  const eventRows = must(events, "events") ?? [];
  const settingsRow = must(settings, "settings");
  const themeRow = must(theme, "theme");
  if (!settingsRow || !themeRow) throw new Error("Missing settings or theme");

  const swingId = await ensurePhoto({
    id: MEDIA_IDS.swing,
    local: "images-to-add/Kodulehele.jpg",
    storagePath: "client/2026/miina-kiigel.jpg",
    alt: "Miina kiigel heleroosas kleidis",
    focalX: 50,
    focalY: 46,
  });
  const gongId = await ensurePhoto({
    id: MEDIA_IDS.gong,
    local: "images-to-add/Gong.jpg",
    storagePath: "client/2026/veenuse-gong.jpg",
    alt: "Veenuse gong ja lootoseküünal",
    focalX: 50,
    focalY: 42,
  });
  const sillalId = await ensurePhoto({
    id: MEDIA_IDS.sillal,
    local: "images-to-add/Sillal.jpg",
    storagePath: "client/2026/miina-sillal.jpg",
    alt: "Miina laudtee ääres, jalg vees",
    focalX: 62,
    focalY: 48,
  });
  await ensurePhoto({
    id: MEDIA_IDS.kneeling,
    local: "images-to-add/att.X3N4PpZo6HLIaagDPkAuyh55E9aJncakoOiBAY31S1E.jpeg",
    storagePath: "client/2026/miina-gongiga.jpg",
    alt: "Miina gongi kõrval põlvitamas",
    focalX: 38,
    focalY: 42,
  });

  const hero = sectionRows.find((row) => row.section_key === "hero" && row.page_id === SEED_IDS.pages.avaleht);
  const gongOffering = offeringRows.find((row) => row.id === SEED_IDS.offerings.gong);
  const gongPractical = sectionRows.find((row) => row.section_key === "practical" && row.page_id === SEED_IDS.pages.gong);
  const gongOpening = sectionRows.find((row) => row.section_key === "opening" && row.page_id === SEED_IDS.pages.gong);
  const minust = sectionRows.find((row) => row.section_key === "bio" && row.page_id === SEED_IDS.pages.minust);
  const privateHome = sectionRows.find((row) => row.section_key === "private" && row.page_id === SEED_IDS.pages.avaleht);
  if (!hero || !gongOffering || !gongPractical || !gongOpening || !minust || !privateHome) {
    throw new Error("Expected homepage, gong or about rows were missing.");
  }

  const heroContent = { ...(hero.content as Record<string, unknown>) };
  const heroStyle = { ...(hero.style as Record<string, unknown>) };
  if (heroContent["custom.text.bab0a141"] === "VAIKUSRUUM") heroContent["custom.text.bab0a141"] = "Vaikus ruum";
  if (heroContent.title === "VAIKUSRUUM") heroContent.title = "Vaikus ruum";
  heroContent.showEmblem = false;
  heroStyle.mediaId = swingId;
  await patchRow("sections", hero.id, "content+style.mediaId", { title: heroContent.title, wordmark: heroContent["custom.text.bab0a141"], mediaId: swingId }, "Swing photo first and a controlled Vaikus / ruum split", { title: (hero.content as Record<string, unknown>).title, mediaId: (hero.style as Record<string, unknown>).mediaId }, changes, async () => {
    const { error } = await supabase.from("sections").update({ content: heroContent, style: heroStyle }).eq("id", hero.id);
    if (error) throw new Error(error.message);
  });

  const nextGongOffering = {
    address: "Valdeku 66, Tallinn",
    registration_url: GONG_EVENT_URL,
  };
  if (gongOffering.address !== nextGongOffering.address || gongOffering.registration_url !== nextGongOffering.registration_url) {
    changes.push({
      table: "offerings",
      id: gongOffering.id,
      field: "address+registration_url",
      before: { address: gongOffering.address, registration_url: gongOffering.registration_url },
      after: nextGongOffering,
      reason: "Remove leftover dates from the address and add the Üks Maja link",
    });
    const { error } = await supabase.from("offerings").update(nextGongOffering).eq("id", gongOffering.id);
    if (error) throw new Error(error.message);
  }

  const gongContent = { ...(gongPractical.content as Record<string, unknown>) };
  gongContent.eventLinkLabel = "Vaata sündmust Üks Maja lehel";
  gongContent.eventLinkUrl = GONG_EVENT_URL;
  if (!gongContent.datesLabel) gongContent.datesLabel = "Kuupäevad:";
  await patchRow("sections", gongPractical.id, "content.eventLink*", { eventLinkLabel: gongContent.eventLinkLabel, eventLinkUrl: gongContent.eventLinkUrl }, "Add the supplied Üks Maja link beside the gong schedule", gongPractical.content, changes, async () => {
    const { error } = await supabase.from("sections").update({ content: gongContent }).eq("id", gongPractical.id);
    if (error) throw new Error(error.message);
  });

  const openingStyle = { ...(gongOpening.style as Record<string, unknown>) };
  openingStyle.layout = "image-left";
  openingStyle.mediaId = gongId;
  await patchRow("sections", gongOpening.id, "style.mediaId", gongId, "Place the gong photograph on the gong page", (gongOpening.style as Record<string, unknown>).mediaId ?? null, changes, async () => {
    const { error } = await supabase.from("sections").update({ style: openingStyle }).eq("id", gongOpening.id);
    if (error) throw new Error(error.message);
  });

  const minustStyle = { ...(minust.style as Record<string, unknown>) };
  minustStyle.layout = "image-left";
  minustStyle.mediaId = sillalId;
  await patchRow("sections", minust.id, "style.mediaId", sillalId, "Place the boardwalk portrait on Minust", (minust.style as Record<string, unknown>).mediaId ?? null, changes, async () => {
    const { error } = await supabase.from("sections").update({ style: minustStyle }).eq("id", minust.id);
    if (error) throw new Error(error.message);
  });

  const privateContent = { ...(privateHome.content as Record<string, unknown>) };
  if (typeof privateContent.label === "string" && privateContent.label.includes("\n\n")) {
    privateContent.label = privateContent.label.replace(/\n{2,}/g, "\n").trim();
    await patchRow("sections", privateHome.id, "content.label", privateContent.label, "Drop empty paragraph spacing in the homepage private-lesson line", (privateHome.content as Record<string, unknown>).label, changes, async () => {
      const { error } = await supabase.from("sections").update({ content: privateContent }).eq("id", privateHome.id);
      if (error) throw new Error(error.message);
    });
  }

  const nextSettings = {
    contact_name: "Miina Laanesaar",
    contact_email: "miina.laanesaar@gmail.com",
    contact_phone: "55585161",
    company_name: "Kõlavõlu OÜ",
    registry_code: "14342017",
    iban: "EE827700771002774537",
    bank: "LHV",
  };
  changes.push({
    table: "site_settings",
    id: "1",
    field: "contact+company",
    before: {
      contact_name: settingsRow.contact_name,
      contact_email: settingsRow.contact_email,
      contact_phone: settingsRow.contact_phone,
      company_name: settingsRow.company_name,
      registry_code: settingsRow.registry_code,
      iban: settingsRow.iban,
      bank: settingsRow.bank,
    },
    after: nextSettings,
    reason: "Write the supplied personal and company contact details",
  });
  const { error: settingsError } = await supabase.from("site_settings").update(nextSettings).eq("id", 1);
  if (settingsError) throw new Error(settingsError.message);

  const currentTheme = parseTheme(themeRow.tokens);
  const nextTheme = applyThemePreset(currentTheme, "a");
  changes.push({
    table: "theme_settings",
    id: "1",
    field: "tokens",
    before: currentTheme,
    after: nextTheme,
    reason: "Warm light palette A. Keep B as an admin preview. Contact stays on the beige warm token.",
  });
  const { error: themeError } = await supabase.from("theme_settings").update({ tokens: nextTheme }).eq("id", 1);
  if (themeError) throw new Error(themeError.message);

  for (const event of eventRows) {
    if (event.offering_id !== SEED_IDS.offerings.gong || !event.starts_at) continue;
    const startLocal = new Date(event.starts_at).toLocaleString("sv-SE", { timeZone: "Europe/Tallinn" }).slice(0, 16).replace(" ", "T");
    const endLocal = event.ends_at
      ? new Date(event.ends_at).toLocaleString("sv-SE", { timeZone: "Europe/Tallinn" }).slice(0, 16).replace(" ", "T")
      : null;
    const wantedStart = `${startLocal.slice(0, 10)}T19:00`;
    const wantedEnd = `${startLocal.slice(0, 10)}T20:30`;
    if (startLocal.endsWith("T19:00") && (!endLocal || endLocal.endsWith("T20:30"))) continue;
    const startsAt = tallinnLocalToIso(wantedStart);
    const endsAt = tallinnLocalToIso(wantedEnd);
    await patchRow(
      "events",
      event.id,
      "starts_at+ends_at",
      { starts_at: startsAt, ends_at: endsAt },
      "Keep every gong class at 19:00–20:30 Tallinn time after the clock change",
      { starts_at: event.starts_at, ends_at: event.ends_at },
      changes,
      async () => {
        const { error } = await supabase.from("events").update({ starts_at: startsAt, ends_at: endsAt }).eq("id", event.id);
        if (error) throw new Error(error.message);
      },
    );
  }

  const existingEratunnid = pageRows.find((page) => page.slug === "eratunnid");
  if (!existingEratunnid) {
    for (const page of pageRows) {
      if (page.nav_order >= 4) {
        const { error } = await supabase.from("pages").update({ nav_order: page.nav_order + 1 }).eq("id", page.id);
        if (error) throw new Error(error.message);
        changes.push({
          table: "pages",
          id: page.id,
          field: "nav_order",
          before: page.nav_order,
          after: page.nav_order + 1,
          reason: "Make room for Eratunnid after the class pages",
        });
      }
    }
    const { error: pageError } = await supabase.from("pages").insert({
      id: SEED_IDS.pages.eratunnid,
      slug: "eratunnid",
      title: "Eratunnid",
      nav_label: "Eratunnid",
      show_in_nav: true,
      nav_order: 4,
      is_published: true,
      seo_title: "Eratunnid",
      seo_description: "Individuaalne joogatund Miinaga.",
    });
    if (pageError) throw new Error(pageError.message);
    const { error: sectionError } = await supabase.from("sections").insert({
      id: ERATUNNID_SECTION_ID,
      page_id: SEED_IDS.pages.eratunnid,
      section_key: "lessons",
      section_type: "private_lessons",
      sort_order: 1,
      enabled: true,
      content: {
        heading: "Individuaalne joogatund",
        label: "",
        lessons: DEFAULT_PRIVATE_LESSONS,
        prices: DEFAULT_PRIVATE_PRICES,
        actionLabel: "Võta ühendust",
        actionHref: "/kontakt?teema=eratund",
      },
      style: { background: "main", specks: false, height: "auto" },
    });
    if (sectionError) throw new Error(sectionError.message);
    changes.push({
      table: "pages",
      id: SEED_IDS.pages.eratunnid,
      field: "insert",
      before: null,
      after: { slug: "eratunnid", nav_order: 4 },
      reason: "Published Eratunnid page and menu item",
    });
  }

  writeFileSync(join(outDir, "change-manifest.json"), JSON.stringify({ appliedAt: new Date().toISOString(), changes }, null, 2));
  writeFileSync(
    join(outDir, "rollback.md"),
    [
      "Restore only this task’s fields from `before.json` and `change-manifest.json`.",
      "Do not run `pnpm seed` or `pnpm seed:media` against production.",
      "Keep later client edits. Old media objects stay in `site-media`.",
      "Contact notification recipients were not changed.",
    ].join("\n"),
  );
  console.log(`Applied ${changes.length} field changes.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Apply failed");
  process.exit(1);
});
