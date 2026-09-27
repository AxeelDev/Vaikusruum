import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseTheme } from "../src/lib/theme/theme";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MEDIA = {
  swing: "d1000000-0000-4000-8000-000000000001",
  gong: "d1000000-0000-4000-8000-000000000002",
  sillal: "d1000000-0000-4000-8000-000000000003",
  kneeling: "d1000000-0000-4000-8000-000000000004",
} as const;

const SECTIONS = {
  homeContact: "53e6cf5e-6fe2-4828-b9db-9d11ff8d1022",
  homeMiina: "a1664df0-7d68-4985-b337-6c78c7de8404",
  homeYoga: "8d03b30a-4a7a-4d39-97e5-b4d15951f7cb",
  homeOfferings: "384e4085-fbcf-475f-bff2-e2d258d1daf2",
} as const;

const REQUIRED_OBJECTS = [
  "client/2026/miina-kiigel.jpg",
  "client/2026/veenuse-gong.jpg",
  "client/2026/miina-sillal.jpg",
  "client/2026/miina-gongiga.jpg",
] as const;

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

async function objectExists(path: string): Promise<{ exists: boolean; size: number | null }> {
  const { data, error } = await supabase.storage.from("site-media").list(path.includes("/") ? path.split("/").slice(0, -1).join("/") : "", {
    limit: 100,
    search: path.split("/").pop(),
  });
  if (error) throw new Error(`list ${path}: ${error.message}`);
  const name = path.split("/").pop();
  const found = (data ?? []).find((item) => item.name === name);
  return { exists: Boolean(found), size: found?.metadata && typeof found.metadata.size === "number" ? found.metadata.size : null };
}

function walkAlignStart(node: unknown): unknown {
  if (!node || typeof node !== "object") return node;
  const row = node as Record<string, unknown>;
  const next = { ...row };
  if (next.type === "columns" || next.type === "column" || next.type === "group") {
    next.verticalAlign = "start";
  }
  if (Array.isArray(next.columns)) next.columns = next.columns.map(walkAlignStart);
  if (Array.isArray(next.children)) next.children = next.children.map(walkAlignStart);
  return next;
}

async function main() {
  const outDir = join(process.cwd(), "tmp", "second-pass-audit");
  mkdirSync(outDir, { recursive: true });
  const changes: ManifestChange[] = [];
  const photoStatus: Array<{ path: string; exists: boolean; size: number | null }> = [];

  for (const path of REQUIRED_OBJECTS) {
    const status = await objectExists(path);
    photoStatus.push({ path, ...status });
    if (!status.exists) {
      throw new Error(`${path} is missing from live site-media. Re-run the first media upload before this pass.`);
    }
  }

  const pigment = must(
    await supabase.from("media").select("id, storage_path").or("storage_path.ilike.%8951%,alt_text.ilike.%pigment%,alt_text.ilike.%värv%"),
    "pigment check",
  );
  if ((pigment ?? []).length) {
    throw new Error("Pigment reference appears in media rows. Do not upload IMG_8951.");
  }

  const sectionRows = must(await supabase.from("sections").select("id, section_key, content, style").in("id", Object.values(SECTIONS)), "sections");
  const themeRow = must(await supabase.from("theme_settings").select("id, tokens").eq("id", 1).maybeSingle(), "theme");
  if (!themeRow) throw new Error("Missing theme_settings");

  const byId = new Map((sectionRows ?? []).map((row) => [row.id, row]));

  const contact = byId.get(SECTIONS.homeContact);
  if (contact) {
    const style = { ...(contact.style as Record<string, unknown>) };
    const tree = walkAlignStart(style.layoutTree);
    const nextStyle = {
      ...style,
      layout: "image-right",
      mediaId: MEDIA.kneeling,
      verticalAlign: "start",
      columnBalance: "55-45",
      image: { ...(typeof style.image === "object" && style.image ? style.image : {}), crop: "portrait", align: "center" },
      layoutTree: tree,
    };
    changes.push({
      table: "sections",
      id: contact.id,
      field: "style.layout+mediaId",
      before: { layout: style.layout, mediaId: style.mediaId },
      after: { layout: "image-right", mediaId: MEDIA.kneeling },
      reason: "Replace the white-backed logo with the kneeling photograph and keep the image beside the form",
    });
    const { error } = await supabase.from("sections").update({ style: nextStyle }).eq("id", contact.id);
    if (error) throw new Error(error.message);
  }

  const miina = byId.get(SECTIONS.homeMiina);
  if (miina) {
    const style = { ...(miina.style as Record<string, unknown>) };
    const nextStyle = { ...style, mediaId: MEDIA.sillal };
    changes.push({
      table: "sections",
      id: miina.id,
      field: "style.mediaId",
      before: style.mediaId ?? null,
      after: MEDIA.sillal,
      reason: "Stop repeating the swing photo on the homepage intro",
    });
    if (style.fieldStyles && typeof style.fieldStyles === "object") {
      const fieldStyles = { ...(style.fieldStyles as Record<string, Record<string, unknown>>) };
      if (fieldStyles.plain) {
        const plain = { ...fieldStyles.plain };
        delete plain.size;
        delete plain.fontSize;
        delete plain.fontId;
        fieldStyles.plain = plain;
        nextStyle.fieldStyles = fieldStyles;
        changes.push({
          table: "sections",
          id: miina.id,
          field: "style.fieldStyles.plain",
          before: (style.fieldStyles as Record<string, unknown>).plain,
          after: plain,
          reason: "Let homepage intro copy use the shared body role",
        });
      }
    }
    const { error } = await supabase.from("sections").update({ style: nextStyle }).eq("id", miina.id);
    if (error) throw new Error(error.message);
  }

  const yoga = byId.get(SECTIONS.homeYoga);
  if (yoga) {
    const style = { ...(yoga.style as Record<string, unknown>) };
    const nextStyle = {
      ...style,
      layout: "centered",
      mediaId: null,
      layoutTree: {
        version: 1,
        root: {
          id: `layout.${yoga.id}.content`,
          type: "group",
          label: "Sisu",
          gap: "medium",
          children: [
            {
              id: `layout.${yoga.id}.body`,
              type: "element",
              field: "body",
              label: "Tekst",
              elementType: "text",
            },
          ],
        },
      },
    };
    changes.push({
      table: "sections",
      id: yoga.id,
      field: "style.layout+mediaId",
      before: { layout: style.layout, mediaId: style.mediaId },
      after: { layout: "centered", mediaId: null },
      reason: "Drop the repeated logo from the homepage yoga copy",
    });
    const { error } = await supabase.from("sections").update({ style: nextStyle }).eq("id", yoga.id);
    if (error) throw new Error(error.message);
  }

  const offerings = byId.get(SECTIONS.homeOfferings);
  if (offerings) {
    const style = { ...(offerings.style as Record<string, unknown>) };
    const existingTree = style.layoutTree as { root?: { columns?: Array<{ children?: unknown[] }> } } | undefined;
    const offeringChildren = existingTree?.root?.columns?.[0]?.children ?? [
      {
        id: `layout.${offerings.id}.offerings`,
        type: "group",
        label: "Tundide tekst",
        children: [],
      },
    ];
    const nextStyle = {
      ...style,
      layout: "centered",
      mediaId: null,
      layoutTree: {
        version: 1,
        root: {
          id: `layout.${offerings.id}.offerings`,
          type: "group",
          label: "Tundide tekst",
          gap: "large",
          children: offeringChildren,
        },
      },
    };
    changes.push({
      table: "sections",
      id: offerings.id,
      field: "style.layout+mediaId",
      before: { layout: style.layout, mediaId: style.mediaId },
      after: { layout: "centered", mediaId: null },
      reason: "Drop the repeated logo from the class list",
    });
    const { error } = await supabase.from("sections").update({ style: nextStyle }).eq("id", offerings.id);
    if (error) throw new Error(error.message);
  }

  const currentTheme = parseTheme(themeRow.tokens);
  const nextTheme = parseTheme({
    ...currentTheme,
    bodyFont: "cormorant",
    displayFont: "cormorant",
    wordmarkFont: "cormorant",
    bodySize: 21,
    bodyLineHeight: 1.55,
    pageTitleSize: 52,
    wordmarkSize: 76,
    headingScale: 1,
    paragraphMaxWidth: 36,
  });
  changes.push({
    table: "theme_settings",
    id: "1",
    field: "tokens.type-roles",
    before: {
      bodyFont: currentTheme.bodyFont,
      bodySize: currentTheme.bodySize,
      bodyLineHeight: currentTheme.bodyLineHeight,
      pageTitleSize: currentTheme.pageTitleSize,
      wordmarkSize: currentTheme.wordmarkSize,
      paragraphMaxWidth: currentTheme.paragraphMaxWidth,
    },
    after: {
      bodyFont: nextTheme.bodyFont,
      bodySize: nextTheme.bodySize,
      bodyLineHeight: nextTheme.bodyLineHeight,
      pageTitleSize: nextTheme.pageTitleSize,
      wordmarkSize: nextTheme.wordmarkSize,
      paragraphMaxWidth: nextTheme.paragraphMaxWidth,
    },
    reason: "Tune the live Theme A type roles without changing the public colours",
  });
  const { error: themeError } = await supabase.from("theme_settings").update({ tokens: nextTheme }).eq("id", 1);
  if (themeError) throw new Error(themeError.message);

  const staleAlts = must(await supabase.from("media").select("id, alt_text, storage_path").eq("alt_text", "IMG_0390"), "stale alts");
  for (const row of staleAlts ?? []) {
    changes.push({
      table: "media",
      id: row.id,
      field: "alt_text",
      before: row.alt_text,
      after: "Miina kiigel heleroosas kleidis",
      reason: "Replace filename alt text on the older swing uploads",
    });
    const { error } = await supabase.from("media").update({ alt_text: "Miina kiigel heleroosas kleidis" }).eq("id", row.id);
    if (error) throw new Error(error.message);
  }

  writeFileSync(join(outDir, "change-manifest.json"), JSON.stringify({ appliedAt: new Date().toISOString(), photoStatus, changes }, null, 2));
  writeFileSync(
    join(outDir, "media-mapping.json"),
    JSON.stringify(
      {
        projectHost: new URL(env("NEXT_PUBLIC_SUPABASE_URL")).host,
        bucket: "site-media",
        verified_live: photoStatus,
        placed: [
          { media_id: MEDIA.swing, used_on: "Avaleht hero", alt: "Miina kiigel heleroosas kleidis" },
          { media_id: MEDIA.gong, used_on: "Pehme jooga ja gong opening", alt: "Veenuse gong ja lootoseküünal" },
          { media_id: MEDIA.sillal, used_on: "Avaleht tutvustus and Minust", alt: "Miina laudtee ääres, jalg vees" },
          { media_id: MEDIA.kneeling, used_on: "Avaleht contact", alt: "Miina gongi kõrval põlvitamas" },
        ],
        not_a_site_photo: ["images-to-add/IMG_8951.jpeg"],
      },
      null,
      2,
    ),
  );
  console.log(`Verified ${photoStatus.length} live photos. Applied ${changes.length} field changes.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Second pass apply failed");
  process.exit(1);
});
