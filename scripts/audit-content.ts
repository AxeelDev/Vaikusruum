import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const outDir = join(process.cwd(), "tmp", "client-edits-audit");
  mkdirSync(outDir, { recursive: true });

  const [pages, sections, offerings, events, media, settings, theme, css, objects] = await Promise.all([
    supabase.from("pages").select("*").order("nav_order", { ascending: true }),
    supabase.from("sections").select("id, page_id, section_key, section_type, sort_order, enabled, content, style, created_at, updated_at").order("sort_order", { ascending: true }),
    supabase.from("offerings").select("*"),
    supabase.from("events").select("*").order("sort_order", { ascending: true }),
    supabase.from("media").select("id, storage_path, alt_text, caption, focal_x, focal_y, created_at"),
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("theme_settings").select("id, tokens, updated_at").eq("id", 1).maybeSingle(),
    supabase.from("advanced_style_settings").select("id, custom_css, updated_at").eq("id", 1).maybeSingle(),
    supabase.storage.from("site-media").list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } }),
  ]);

  for (const [label, result] of [
    ["pages", pages],
    ["sections", sections],
    ["offerings", offerings],
    ["events", events],
    ["media", media],
    ["settings", settings],
    ["theme", theme],
    ["css", css],
    ["objects", objects],
  ] as const) {
    if (result.error) throw new Error(`${label}: ${result.error.message}`);
  }

  const snapshot = {
    exportedAt: new Date().toISOString(),
    projectHost: new URL(env("NEXT_PUBLIC_SUPABASE_URL")).host,
    pages: pages.data,
    sections: sections.data,
    offerings: offerings.data,
    events: events.data,
    media: media.data,
    site_settings: settings.data,
    theme_settings: theme.data,
    advanced_style_settings: {
      id: css.data?.id,
      custom_css: css.data?.custom_css,
      updated_at: css.data?.updated_at,
    },
    storage_objects: objects.data,
  };

  const stamp = process.argv.includes("--after") ? "after" : "before";
  writeFileSync(join(outDir, `${stamp}.json`), JSON.stringify(snapshot, null, 2));
  writeFileSync(
    join(outDir, `${stamp}-summary.json`),
    JSON.stringify(
      {
        exportedAt: snapshot.exportedAt,
        projectHost: snapshot.projectHost,
        pages: (pages.data ?? []).map((page) => ({
          id: page.id,
          slug: page.slug,
          title: page.title,
          nav_label: page.nav_label,
          nav_order: page.nav_order,
          show_in_nav: page.show_in_nav,
          is_published: page.is_published,
          updated_at: page.updated_at,
        })),
        sections: (sections.data ?? []).map((section) => ({
          id: section.id,
          page_id: section.page_id,
          section_key: section.section_key,
          section_type: section.section_type,
          sort_order: section.sort_order,
          enabled: section.enabled,
          contentKeys: Object.keys(section.content ?? {}),
          styleBackground: (section.style as { background?: string } | null)?.background ?? null,
          mediaId: (section.style as { mediaId?: string } | null)?.mediaId ?? (section.content as { mediaId?: string } | null)?.mediaId ?? null,
          updated_at: section.updated_at,
        })),
        offerings: offerings.data,
        events: events.data,
        media: media.data,
        site_settings: settings.data,
        theme_tokens: theme.data?.tokens ?? null,
        theme_updated_at: theme.data?.updated_at ?? null,
        custom_css_length: css.data?.custom_css?.length ?? 0,
        storage_objects: (objects.data ?? []).map((item) => ({
          name: item.name,
          updated_at: item.updated_at,
          metadata: item.metadata,
        })),
      },
      null,
      2,
    ),
  );

  console.log(`Wrote ${outDir}/${stamp}.json and ${stamp}-summary.json`);
  console.log(`pages=${pages.data?.length ?? 0} sections=${sections.data?.length ?? 0} offerings=${offerings.data?.length ?? 0} events=${events.data?.length ?? 0} media=${media.data?.length ?? 0}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Audit failed");
  process.exit(1);
});
