import type { EditorDraft } from "@/lib/editor/types";
import type { EventRow, MediaRow, OfferingRow, PageRow, SectionRow } from "@/types/content";

/** Only what changed since the last load or save. Each row carries all of its saved fields. */
export type EditorChanges = {
  pages?: Array<Pick<PageRow, "id" | "title" | "nav_label" | "show_in_nav" | "nav_order" | "is_published" | "seo_title" | "seo_description" | "slug">>;
  sections?: Array<Pick<SectionRow, "id" | "page_id" | "section_key" | "section_type" | "sort_order" | "enabled" | "content" | "style">>;
  deletedSectionIds?: string[];
  offerings?: Array<
    Pick<
      OfferingRow,
      "id" | "title" | "short_title" | "location_name" | "address" | "schedule_summary" | "tasakaal" | "registration_mode" | "registration_url" | "registration_email"
    >
  >;
  events?: Array<Pick<EventRow, "id" | "offering_id" | "starts_at" | "ends_at" | "display_date" | "sort_order" | "active">>;
  deletedEventIds?: string[];
  media?: Array<Pick<MediaRow, "id" | "alt_text" | "focal_x" | "focal_y">>;
  settings?: {
    site_name: string;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    company_name: string | null;
    registry_code: string | null;
    iban: string | null;
    bank: string | null;
    footer_text: string | null;
    social: Record<string, unknown>;
  };
  theme?: unknown;
  customCss?: string;
};

// jsonb does not keep key order, so compare with sorted keys.
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => [key, stable((value as Record<string, unknown>)[key])]),
  );
}

const same = (a: unknown, b: unknown) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

function changedRows<T extends { id: string }, R>(saved: T[], draft: T[], pick: (row: T) => R): R[] {
  const before = new Map(saved.map((row) => [row.id, pick(row)]));
  return draft.map(pick).filter((row) => !same(before.get((row as unknown as { id: string }).id), row));
}

const pagePick = (p: PageRow) => ({
  id: p.id,
  title: p.title,
  nav_label: p.nav_label,
  show_in_nav: p.show_in_nav,
  nav_order: p.nav_order,
  is_published: p.is_published,
  seo_title: p.seo_title,
  seo_description: p.seo_description,
  slug: p.slug,
});

const sectionPick = (s: SectionRow) => ({
  id: s.id,
  page_id: s.page_id,
  section_key: s.section_key,
  section_type: s.section_type,
  sort_order: s.sort_order,
  enabled: s.enabled,
  content: s.content,
  style: s.style ?? {},
});

const offeringPick = (o: OfferingRow) => ({
  id: o.id,
  title: o.title,
  short_title: o.short_title,
  location_name: o.location_name,
  address: o.address,
  schedule_summary: o.schedule_summary,
  tasakaal: o.tasakaal,
  registration_mode: o.registration_mode,
  registration_url: o.registration_url,
  registration_email: o.registration_email,
});

const eventPick = (e: EventRow) => ({
  id: e.id,
  offering_id: e.offering_id,
  starts_at: e.starts_at,
  ends_at: e.ends_at,
  display_date: e.display_date,
  sort_order: e.sort_order,
  active: e.active,
});

const mediaPick = (m: MediaRow) => ({ id: m.id, alt_text: m.alt_text, focal_x: m.focal_x, focal_y: m.focal_y });

const settingsPick = (d: EditorDraft) => ({
  site_name: d.settings.site_name,
  contact_name: d.settings.contact_name ?? null,
  contact_email: d.settings.contact_email,
  contact_phone: d.settings.contact_phone,
  company_name: d.settings.company_name ?? null,
  registry_code: d.settings.registry_code ?? null,
  iban: d.settings.iban ?? null,
  bank: d.settings.bank ?? null,
  footer_text: d.settings.footer_text,
  social: d.settings.social ?? {},
});

export function diffDraft(saved: EditorDraft, draft: EditorDraft, role: "owner" | "editor"): EditorChanges {
  const changes: EditorChanges = {};
  const allSections = (d: EditorDraft) => Object.values(d.sectionsByPage).flat();
  const allEvents = (d: EditorDraft) => Object.values(d.eventsByOffering).flat();

  const pages = changedRows(saved.pages, draft.pages, pagePick);
  if (pages.length) changes.pages = pages;

  const sections = changedRows(allSections(saved), allSections(draft), sectionPick);
  if (sections.length) changes.sections = sections;
  if (draft.deletedSectionIds.length) changes.deletedSectionIds = [...draft.deletedSectionIds];

  const offerings = changedRows(Object.values(saved.offerings), Object.values(draft.offerings), offeringPick);
  if (offerings.length) changes.offerings = offerings;

  const events = changedRows(allEvents(saved), allEvents(draft), eventPick);
  if (events.length) changes.events = events;
  const draftEventIds = new Set(allEvents(draft).map((event) => event.id));
  const deletedEventIds = allEvents(saved)
    .map((event) => event.id)
    .filter((id) => !draftEventIds.has(id));
  if (deletedEventIds.length) changes.deletedEventIds = deletedEventIds;

  const media = changedRows(Object.values(saved.media), Object.values(draft.media), mediaPick);
  if (media.length) changes.media = media;

  if (!same(settingsPick(saved), settingsPick(draft))) changes.settings = settingsPick(draft);
  if (!same(saved.theme, draft.theme)) changes.theme = draft.theme;
  if (role === "owner" && saved.customCss !== draft.customCss) changes.customCss = draft.customCss;

  return changes;
}

export function hasChanges(changes: EditorChanges) {
  return Object.keys(changes).length > 0;
}
