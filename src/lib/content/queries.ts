import { cache } from "react";
import { createPublicSupabase } from "@/lib/supabase/public";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseTheme, DEFAULT_THEME, type ThemeTokens } from "@/lib/theme/theme";
import { isCustomImageField } from "@/lib/editor/image-style";
import { mediaPublicUrl, pageHref } from "@/lib/utils/urls";
import { readImageSize } from "@/lib/utils/image-size";
import { buildLessonOptions, lessonsFromSections, type LessonOption } from "@/lib/content/lesson-options";
import type {
  EventRow,
  MediaRow,
  OfferingRow,
  PageRow,
  SectionRow,
  SiteSettings,
  NavItem,
  TestimonialWithPhoto,
} from "@/types/content";

export { pageHref } from "@/lib/utils/urls";

export const getTheme = cache(async function getTheme(): Promise<ThemeTokens> {
  try {
    const supabase = createPublicSupabase();
    const { data } = await supabase.from("theme_settings").select("tokens").eq("id", 1).maybeSingle();
    return parseTheme(data?.tokens ?? DEFAULT_THEME);
  } catch {
    return DEFAULT_THEME;
  }
});

export const getCustomCss = cache(async function getCustomCss(): Promise<string> {
  try {
    const supabase = createPublicSupabase();
    const { data } = await supabase
      .from("advanced_style_settings")
      .select("custom_css")
      .eq("id", 1)
      .maybeSingle();
    return data?.custom_css ?? "";
  } catch {
    return "";
  }
});

export const getSiteSettings = cache(async function getSiteSettings(): Promise<SiteSettings> {
  const fallback: SiteSettings = {
    id: 1,
    site_name: "Vaikusruum",
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    company_name: null,
    registry_code: null,
    iban: null,
    bank: null,
    default_registration_email: null,
    social: {},
    footer_text: null,
  };
  try {
    const supabase = createPublicSupabase();
    const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return fallback;
    return {
      id: 1,
      site_name: data.site_name ?? "Vaikusruum",
      contact_name: data.contact_name ?? null,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      company_name: data.company_name ?? null,
      registry_code: data.registry_code ?? null,
      iban: data.iban ?? null,
      bank: data.bank ?? null,
      default_registration_email: data.default_registration_email,
      social: (data.social as SiteSettings["social"]) ?? {},
      footer_text: data.footer_text,
    };
  } catch {
    return fallback;
  }
});

export const getNavItems = cache(async function getNavItems(): Promise<NavItem[]> {
  try {
    const supabase = createPublicSupabase();
    const { data } = await supabase
      .from("pages")
      .select("slug, title, nav_label, nav_order")
      .eq("is_published", true)
      .eq("show_in_nav", true)
      .order("nav_order", { ascending: true });
    return (data ?? []).map((page) => ({
      slug: page.slug,
      href: pageHref(page.slug),
      label: page.nav_label || page.title,
    }));
  } catch {
    return [];
  }
});

export const getPublishedPage = cache(async function getPublishedPage(slug: string): Promise<{
  page: PageRow;
  sections: SectionRow[];
} | null> {
  const supabase = createPublicSupabase();
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!page) return null;

  const { data: sections } = await supabase
    .from("sections")
    .select("*")
    .eq("page_id", page.id)
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  return {
    page: page as PageRow,
    sections: (sections ?? []) as SectionRow[],
  };
});

export const getOfferingsByIds = cache(async function getOfferingsByIds(ids: string[]): Promise<OfferingRow[]> {
  if (ids.length === 0) return [];
  const supabase = createPublicSupabase();
  const { data } = await supabase.from("offerings").select("*").in("id", ids).eq("active", true);
  const list = (data ?? []) as OfferingRow[];
  return ids.map((id) => list.find((item) => item.id === id)).filter((item): item is OfferingRow => Boolean(item));
});

export const getActiveOfferings = cache(async function getActiveOfferings(): Promise<OfferingRow[]> {
  const supabase = createPublicSupabase();
  const { data } = await supabase.from("offerings").select("*").eq("active", true).order("title", { ascending: true });
  return (data ?? []) as OfferingRow[];
});

/** Private-lesson types listed on the published site (the Eratunnid page). */
export const getPrivateLessonItems = cache(async function getPrivateLessonItems() {
  const supabase = createPublicSupabase();
  const { data } = await supabase.from("sections").select("section_type, enabled, content").eq("section_type", "private_lessons");
  return lessonsFromSections((data ?? []) as Array<{ section_type: string; enabled: boolean; content: Record<string, unknown> }>);
});

/** Every class a visitor can ask about in the contact form: the active offerings plus the private-lesson types. */
export const getLessonOptions = cache(async function getLessonOptions(): Promise<LessonOption[]> {
  try {
    const [offerings, lessons] = await Promise.all([getActiveOfferings(), getPrivateLessonItems()]);
    return buildLessonOptions(offerings, lessons);
  } catch {
    return buildLessonOptions([], []);
  }
});

const TESTIMONIAL_SELECT = "*, photo:media(storage_path, alt_text)";

/** What the Tagasiside page shows: published testimonials in the order the admin set. Empty if the table is not there yet. */
export const getPublishedTestimonials = cache(async function getPublishedTestimonials(): Promise<TestimonialWithPhoto[]> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("testimonials")
      .select(TESTIMONIAL_SELECT)
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[testimonials] read failed:", error.message);
      return [];
    }
    return (data ?? []) as unknown as TestimonialWithPhoto[];
  } catch {
    return [];
  }
});

export const getOfferingById = cache(async function getOfferingById(id: string): Promise<OfferingRow | null> {
  const supabase = createPublicSupabase();
  const { data } = await supabase.from("offerings").select("*").eq("id", id).maybeSingle();
  return (data as OfferingRow | null) ?? null;
});

export const getEventsForOffering = cache(async function getEventsForOffering(offeringId: string): Promise<EventRow[]> {
  const supabase = createPublicSupabase();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("offering_id", offeringId)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as EventRow[];
});

export const getMediaByIds = cache(async function getMediaByIds(ids: string[]): Promise<Record<string, MediaRow>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const supabase = createPublicSupabase();
  const { data } = await supabase.from("media").select("*").in("id", unique);
  const rows = await withImageSizes((data ?? []) as MediaRow[]);
  const map: Record<string, MediaRow> = {};
  for (const row of rows) {
    map[row.id] = row;
  }
  return map;
});

/**
 * Reads each image's pixel size from the start of the file, so the page reserves the right space
 * and nothing jumps when the image arrives. Uploaded files never change in place, so the bytes are
 * cached for good. A failed read just leaves the size unknown.
 */
async function imageSize(storagePath: string): Promise<{ width: number; height: number } | null> {
  const url = mediaPublicUrl(storagePath);
  if (!url) return null;
  // Most headers sit in the first 64 KB; JPEGs with large metadata blocks need a longer read.
  for (const end of [65_535, 524_287]) {
    try {
      const response = await fetch(url, {
        headers: { Range: `bytes=0-${end}` },
        cache: "force-cache",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const size = readImageSize(new Uint8Array(await response.arrayBuffer()));
      if (size) return size;
    } catch {
      return null;
    }
  }
  return null;
}

export async function withImageSizes(rows: MediaRow[]): Promise<MediaRow[]> {
  return Promise.all(
    rows.map(async (row) => {
      const size = await imageSize(row.storage_path);
      return size ? { ...row, ...size } : row;
    }),
  );
}

export { mediaPublicUrl } from "@/lib/utils/urls";

export async function getEditorBundle() {
  const supabase = await createServerSupabase();
  const [pagesRes, sectionsRes, offeringsRes, eventsRes, mediaRes, testimonialsRes] = await Promise.all([
    supabase.from("pages").select("*").order("nav_order", { ascending: true }),
    supabase.from("sections").select("*").order("sort_order", { ascending: true }),
    supabase.from("offerings").select("*"),
    supabase.from("events").select("*").order("sort_order", { ascending: true }),
    supabase.from("media").select("*").order("created_at", { ascending: false }),
    supabase.from("testimonials").select(TESTIMONIAL_SELECT).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
  ]);

  const failures = [
    ["pages", pagesRes.error],
    ["sections", sectionsRes.error],
    ["offerings", offeringsRes.error],
    ["events", eventsRes.error],
    ["media", mediaRes.error],
    ["testimonials", testimonialsRes.error],
  ] as const;
  for (const [label, error] of failures) {
    if (error) {
      console.error(`[editor] ${label} query failed:`, error.message);
      throw new Error(`${label} laadimine ebaõnnestus.`);
    }
  }

  const pages = (pagesRes.data ?? []) as PageRow[];
  if (pages.length === 0) {
    throw new Error("Lehti ei leitud.");
  }

  const sections = (sectionsRes.data ?? []) as SectionRow[];
  const sectionsByPage: Record<string, SectionRow[]> = {};
  for (const section of sections) {
    sectionsByPage[section.page_id] ??= [];
    sectionsByPage[section.page_id].push(section);
  }

  const offerings: Record<string, OfferingRow> = {};
  for (const row of (offeringsRes.data ?? []) as OfferingRow[]) offerings[row.id] = row;

  const eventsByOffering: Record<string, EventRow[]> = {};
  for (const event of (eventsRes.data ?? []) as EventRow[]) {
    eventsByOffering[event.offering_id] ??= [];
    eventsByOffering[event.offering_id].push(event);
  }

  const media: Record<string, MediaRow> = {};
  for (const row of await withImageSizes((mediaRes.data ?? []) as MediaRow[])) media[row.id] = row;

  const [settings, theme, customCss, revisionRes] = await Promise.all([
    getSiteSettings(),
    getTheme(),
    getCustomCss(),
    supabase.from("site_revision").select("revision").eq("id", 1).maybeSingle(),
  ]);
  if (revisionRes.error) throw new Error(`site revision: ${revisionRes.error.message}`);

  return {
    pages,
    sectionsByPage,
    offerings,
    eventsByOffering,
    media,
    settings,
    theme,
    customCss,
    deletedSectionIds: [] as string[],
    /** Shown on the canvas, edited in the admin panel; not part of the editor's own draft. */
    testimonials: (testimonialsRes.data ?? []) as unknown as TestimonialWithPhoto[],
    revision: Number(revisionRes.data?.revision ?? 0),
  };
}

export function collectMediaIds(sections: SectionRow[]): string[] {
  const ids: string[] = [];
  for (const section of sections) {
    for (const [key, value] of Object.entries(section.content ?? {})) {
      if (!isCustomImageField(key) || !value || typeof value !== "object") continue;
      const customId = (value as { mediaId?: unknown }).mediaId;
      if (typeof customId === "string" && customId) ids.push(customId);
    }
    if (Object.prototype.hasOwnProperty.call(section.style ?? {}, "mediaId")) {
      const styleId = section.style?.mediaId;
      if (typeof styleId === "string" && styleId) ids.push(styleId);
      continue;
    }
    const contentId = section.content?.mediaId;
    if (typeof contentId === "string" && contentId) ids.push(contentId);
  }
  return ids;
}
