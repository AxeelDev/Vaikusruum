import type { SectionRow, SectionType, TextAppearance } from "@/types/content";
import type { AddableSectionType, EditorDraft } from "@/lib/editor/types";

export function cloneDraft(draft: EditorDraft): EditorDraft {
  return structuredClone(draft);
}

const INDEXED_STYLE_KEY = /^(q|a|item|quote|name)\.(\d+)$/;

/**
 * Removes one FAQ question or list point. Item styles are kept by position ("q.2"), so the styles of the
 * items after it move up one place with their items instead of passing to a neighbour.
 */
export function removeIndexedItem(section: SectionRow, index: number): SectionRow {
  const items = Array.isArray(section.content.items) ? [...(section.content.items as unknown[])] : [];
  if (index < 0 || index >= items.length) return section;
  items.splice(index, 1);
  const styles = section.style?.fieldStyles;
  if (!styles) return { ...section, content: { ...section.content, items } };
  const fieldStyles: Record<string, TextAppearance> = {};
  for (const [key, value] of Object.entries(styles)) {
    const match = key.match(INDEXED_STYLE_KEY);
    const position = match ? Number(match[2]) : -1;
    if (!match || position < index) fieldStyles[key] = value;
    else if (position > index) fieldStyles[`${match[1]}.${position - 1}`] = value;
  }
  return { ...section, content: { ...section.content, items }, style: { ...section.style, fieldStyles } };
}

export function pageSections(draft: EditorDraft, pageId: string): SectionRow[] {
  return [...(draft.sectionsByPage[pageId] ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

export function updateSection(
  draft: EditorDraft,
  sectionId: string,
  updater: (section: SectionRow) => SectionRow,
): EditorDraft {
  const next = cloneDraft(draft);
  for (const pageId of Object.keys(next.sectionsByPage)) {
    next.sectionsByPage[pageId] = next.sectionsByPage[pageId].map((section) =>
      section.id === sectionId ? updater(section) : section,
    );
  }
  return next;
}

export function findSection(draft: EditorDraft, sectionId: string): SectionRow | undefined {
  for (const sections of Object.values(draft.sectionsByPage)) {
    const match = sections.find((section) => section.id === sectionId);
    if (match) return match;
  }
  return undefined;
}

export function defaultSectionContent(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return { intro: "", showEmblem: true, title: "VAIKUSRUUM" };
    case "split_media_text":
      return { plain: "Uus tekst" };
    case "rich_text":
      return { heading: "", body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Uus tekst" }] }] } };
    case "offering_overview":
      return { offeringIds: [], moreInfoLabel: "rohkem infot" };
    case "faq":
      return { items: [{ question: "Küsimus", answer: "Vastus" }] };
    case "contact":
      return { heading: "VÕTA ÜHENDUST" };
    case "private_lessons":
      return { label: "Eratunnid kokkuleppel", actionLabel: "Võta ühendust" };
    case "testimonials":
      return { items: [{ quote: "Tsitaat", name: "" }] };
    case "important_info":
      return { items: [""] };
    case "offering_practical_info":
      return {
        datesLabel: "Kuupäevad:",
        headTeadaLabel: "Hea teada",
        tasakaalLabel: "Tasakaal",
        registerHeading: "Registreeri tundi",
      };
    case "spacer":
      return {};
    default:
      return {};
  }
}

export function createSection(pageId: string, type: AddableSectionType, sortOrder: number): SectionRow {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  return {
    id,
    page_id: pageId,
    section_key: `${type}-${id.slice(0, 8)}`,
    section_type: type,
    sort_order: sortOrder,
    enabled: true,
    content: defaultSectionContent(type),
    style: {
      background: "main",
      height: type === "spacer" ? "auto" : "screen",
      verticalAlign: "center",
      layout: type === "split_media_text" ? "image-left" : type === "rich_text" ? "centered" : undefined,
      specks: true,
    },
    created_at: now,
    updated_at: now,
  };
}

export function duplicateSection(section: SectionRow, sortOrder: number): SectionRow {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  return {
    ...structuredClone(section),
    id,
    section_key: `${section.section_type}-${id.slice(0, 8)}`,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  };
}

export function reorderSections(sections: SectionRow[], sectionId: string, direction: -1 | 1): SectionRow[] {
  const ordered = [...sections].sort((a, b) => a.sort_order - b.sort_order);
  const index = ordered.findIndex((section) => section.id === sectionId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return ordered;
  const copy = [...ordered];
  const [moved] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, moved);
  return copy.map((section, i) => ({ ...section, sort_order: i + 1 }));
}

export function draftsEqual(a: EditorDraft, b: EditorDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
