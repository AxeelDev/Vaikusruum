import { createServerSupabase } from "@/lib/supabase/server";
import { parseTheme, DEFAULT_THEME, type ThemeTokens } from "@/lib/theme/theme";
import { pageHref } from "@/lib/utils/urls";
import type {
  EventRow,
  MediaRow,
  OfferingRow,
  PageRow,
  SectionRow,
  SiteSettings,
  NavItem,
} from "@/types/content";

export { pageHref } from "@/lib/utils/urls";

export async function getTheme(): Promise<ThemeTokens> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from("theme_settings").select("tokens").eq("id", 1).maybeSingle();
    return parseTheme(data?.tokens ?? DEFAULT_THEME);
  } catch {
    return DEFAULT_THEME;
  }
}

export async function getCustomCss(): Promise<string> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("advanced_style_settings")
      .select("custom_css")
      .eq("id", 1)
      .maybeSingle();
    return data?.custom_css ?? "";
  } catch {
    return "";
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const fallback: SiteSettings = {
    id: 1,
    site_name: "Vaikusruum",
    contact_email: null,
    contact_phone: null,
    default_registration_email: null,
    social: {},
    footer_text: null,
  };
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return fallback;
    return {
      id: 1,
      site_name: data.site_name ?? "Vaikusruum",
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      default_registration_email: data.default_registration_email,
      social: (data.social as SiteSettings["social"]) ?? {},
      footer_text: data.footer_text,
    };
  } catch {
    return fallback;
  }
}

export async function getNavItems(): Promise<NavItem[]> {
  try {
    const supabase = await createServerSupabase();
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
}

export async function getPublishedPage(slug: string): Promise<{
  page: PageRow;
  sections: SectionRow[];
} | null> {
  const supabase = await createServerSupabase();
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
}

export async function getOfferingsByIds(ids: string[]): Promise<OfferingRow[]> {
  if (ids.length === 0) return [];
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("offerings").select("*").in("id", ids).eq("active", true);
  const list = (data ?? []) as OfferingRow[];
  return ids.map((id) => list.find((item) => item.id === id)).filter((item): item is OfferingRow => Boolean(item));
}

export async function getOfferingById(id: string): Promise<OfferingRow | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("offerings").select("*").eq("id", id).maybeSingle();
  return (data as OfferingRow | null) ?? null;
}

export async function getEventsForOffering(offeringId: string): Promise<EventRow[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("offering_id", offeringId)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as EventRow[];
}

export async function getMediaByIds(ids: string[]): Promise<Record<string, MediaRow>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("media").select("*").in("id", unique);
  const map: Record<string, MediaRow> = {};
  for (const row of (data ?? []) as MediaRow[]) {
    map[row.id] = row;
  }
  return map;
}

export { mediaPublicUrl } from "@/lib/utils/urls";

export async function getEditorBundle() {
  const supabase = await createServerSupabase();
  const [pagesRes, sectionsRes, offeringsRes, eventsRes, mediaRes] = await Promise.all([
    supabase.from("pages").select("*").order("nav_order", { ascending: true }),
    supabase.from("sections").select("*").order("sort_order", { ascending: true }),
    supabase.from("offerings").select("*"),
    supabase.from("events").select("*").order("sort_order", { ascending: true }),
    supabase.from("media").select("*").order("created_at", { ascending: false }),
  ]);

  const failures = [
    ["pages", pagesRes.error],
    ["sections", sectionsRes.error],
    ["offerings", offeringsRes.error],
    ["events", eventsRes.error],
    ["media", mediaRes.error],
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
  for (const row of (mediaRes.data ?? []) as MediaRow[]) media[row.id] = row;

  const [settings, theme, customCss] = await Promise.all([getSiteSettings(), getTheme(), getCustomCss()]);

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
  };
}

export function collectMediaIds(sections: SectionRow[]): string[] {
  const ids: string[] = [];
  for (const section of sections) {
    const styleId = section.style?.mediaId;
    if (typeof styleId === "string" && styleId) ids.push(styleId);
    const contentId = section.content?.mediaId;
    if (typeof contentId === "string" && contentId) ids.push(contentId);
  }
  return ids;
}
