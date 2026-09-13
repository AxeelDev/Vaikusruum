import type { TiptapNode } from "@/types/content";
import { isTiptapDoc } from "@/lib/content/rich-text";
import { findSection } from "@/lib/editor/draft";
import type { EditPath, EditorDraft, EditorSelection } from "@/lib/editor/types";
import type { OfferingRow, SectionRow } from "@/types/content";

export type EditorContent =
  | { format: "plain"; value: string }
  | { format: "rich"; value: TiptapNode }
  | { format: "structured"; value: unknown };

export type BoundEditorContent = EditorContent & {
  path: EditPath | null;
  label: string;
  plainPreview: string;
};

export type IndexedFieldKind = "q" | "a" | "item" | "quote" | "name";

export type IndexedField = {
  kind: IndexedFieldKind;
  index: number;
};

export const PAGE_COPY_DEFAULTS = {
  moreInfoLabel: "rohkem infot",
  privateLabel: "Eratunnid kokkuleppel",
  privateAction: "Võta ühendust",
  contactHeading: "VÕTA ÜHENDUST",
  datesLabel: "Kuupäevad:",
  headTeadaLabel: "Hea teada",
  tasakaalLabel: "Tasakaal",
  registerHeading: "Registreeri tundi",
  registerCta: "Registreeri",
  heroTitle: "VAIKUSRUUM",
} as const;

const EMPTY_PLAIN: BoundEditorContent = {
  format: "plain",
  value: "",
  path: null,
  label: "Sisu",
  plainPreview: "",
};

export function parseIndexedField(field?: string | null): IndexedField | null {
  if (!field) return null;
  const match = field.match(/^(q|a|item|quote|name)\.(\d+)$/);
  if (!match) return null;
  return { kind: match[1] as IndexedFieldKind, index: Number(match[2]) };
}

export function textSelection(
  slug: string,
  section: SectionRow,
  field: string,
  extra: Partial<EditorSelection> = {},
): EditorSelection {
  const offeringBit = extra.offeringId ? `${extra.offeringId}.` : "";
  return {
    id: extra.id ?? `${slug}.${section.section_key}.${offeringBit}${field}`,
    type: extra.type ?? "text",
    sectionId: section.id,
    field,
    ...extra,
  };
}

export function readEditorContent(draft: EditorDraft, selection: EditorSelection | null): BoundEditorContent {
  if (!selection) return EMPTY_PLAIN;
  const bound = bindSelection(draft, selection);
  if (!bound && selection.type === "text") {
    warnMissingTextBinding(selection);
  }
  return bound ?? EMPTY_PLAIN;
}

export function editorContentValue(content: BoundEditorContent): string {
  if (content.format === "plain") return content.value;
  if (content.format === "rich") return richPreview(content.value);
  return "";
}

export function bindSelection(draft: EditorDraft, selection: EditorSelection): BoundEditorContent | null {
  if (selection.id === "header.wordmark" || selection.field === "site_name") {
    return plain(draft.settings.site_name, { kind: "settings", key: "site_name" }, "Vaikusruum");
  }
  if (selection.id === "footer.text" || selection.field === "footer_text") {
    return plain(draft.settings.footer_text ?? "", { kind: "settings", key: "footer_text" }, "Jalusetekst");
  }
  if (selection.type === "nav" && selection.navSlug) {
    const page = draft.pages.find((item) => item.slug === selection.navSlug);
    if (!page) return null;
    return plain(page.nav_label || page.title, { kind: "nav-label", pageId: page.id }, "Menüülink");
  }
  if (selection.offeringId && selection.field) {
    const offering = draft.offerings[selection.offeringId];
    const value = String((offering as Record<string, unknown> | undefined)?.[selection.field] ?? "");
    return plain(value, { kind: "offering", offeringId: selection.offeringId, key: selection.field as keyof OfferingRow }, offeringFieldLabel(selection.field));
  }
  if (selection.sectionId && selection.field) {
    const section = findSection(draft, selection.sectionId);
    if (!section) return null;
    const indexed = parseIndexedField(selection.field);
    if (indexed) return bindIndexedField(section, indexed);
    const raw = readBoundSectionValue(section, selection.field, draft);
    if (isTiptapDoc(raw)) {
      return {
        format: "rich",
        value: raw,
        path: { kind: "section-content", sectionId: section.id, key: selection.field },
        label: fieldLabel(selection.field, section.section_type),
        plainPreview: richPreview(raw),
      };
    }
    if (typeof raw === "string") {
      return plain(raw, { kind: "section-content", sectionId: section.id, key: selection.field }, fieldLabel(selection.field, section.section_type));
    }
    if (raw && typeof raw === "object") {
      return {
        format: "structured",
        value: raw,
        path: { kind: "section-content", sectionId: section.id, key: selection.field },
        label: fieldLabel(selection.field, section.section_type),
        plainPreview: "",
      };
    }
    if (selection.field === "title" && section.section_type === "hero") {
      return plain(draft.settings.site_name || PAGE_COPY_DEFAULTS.heroTitle, { kind: "section-content", sectionId: section.id, key: "title" }, "Hero pealkiri");
    }
    return plain("", { kind: "section-content", sectionId: section.id, key: selection.field }, fieldLabel(selection.field, section.section_type));
  }
  if (selection.field === "title" || selection.type === "page") {
    const page =
      draft.pages.find((item) => item.id === draftPageId(draft, selection)) ??
      draft.pages.find((item) => item.slug === slugFromSelection(selection)) ??
      draft.pages[0];
    if (!page) return null;
    return plain(page.title, { kind: "page-title", pageId: page.id }, "Pealkiri");
  }
  return null;
}

function bindIndexedField(section: SectionRow, indexed: IndexedField): BoundEditorContent {
  const value = indexedFieldValue(section, indexed);
  if (indexed.kind === "q") {
    return plain(value, { kind: "faq", sectionId: section.id, index: indexed.index, field: "question" }, "Küsimus");
  }
  if (indexed.kind === "a") {
    return plain(value, { kind: "faq", sectionId: section.id, index: indexed.index, field: "answer" }, "Vastus");
  }
  if (indexed.kind === "item") {
    return plain(value, { kind: "list-item", sectionId: section.id, index: indexed.index }, "Punkt");
  }
  if (indexed.kind === "quote") {
    return plain(value, { kind: "testimonial", sectionId: section.id, index: indexed.index, field: "quote" }, "Tsitaat");
  }
  return plain(value, { kind: "testimonial", sectionId: section.id, index: indexed.index, field: "name" }, "Nimi");
}

export function indexedFieldValue(section: SectionRow, indexed: IndexedField): string {
  const items = Array.isArray(section.content.items) ? section.content.items : [];
  const row = items[indexed.index];
  if (indexed.kind === "item") return typeof row === "string" ? row : "";
  if (!row || typeof row !== "object") return "";
  const record = row as Record<string, unknown>;
  if (indexed.kind === "q") return String(record.question ?? "");
  if (indexed.kind === "a") return String(record.answer ?? "");
  if (indexed.kind === "quote") return String(record.quote ?? "");
  return String(record.name ?? "");
}

export function readBoundSectionValue(section: SectionRow, field: string, draft?: EditorDraft): unknown {
  const indexed = parseIndexedField(field);
  if (indexed) return indexedFieldValue(section, indexed);
  return readSectionField(section.content, field, section.section_type, draft);
}

function draftPageId(draft: EditorDraft, selection: EditorSelection) {
  if (selection.id.includes(".")) {
    const slug = selection.id.split(".")[0];
    return draft.pages.find((page) => page.slug === slug)?.id;
  }
  return undefined;
}

function slugFromSelection(selection: EditorSelection) {
  if (!selection.id.includes(".")) return undefined;
  return selection.id.split(".")[0];
}

function readSectionField(
  content: Record<string, unknown>,
  field: string,
  sectionType: string,
  draft?: EditorDraft,
): unknown {
  if (Object.prototype.hasOwnProperty.call(content, field)) return content[field];
  if (field === "body" && content.text !== undefined) return content.text;
  if (field === "plain" && typeof content.copy === "string") return content.copy;
  if (field === "title" && sectionType === "hero") return content.title ?? draft?.settings.site_name ?? PAGE_COPY_DEFAULTS.heroTitle;
  if (field === "heading" && sectionType === "contact") return content.heading ?? PAGE_COPY_DEFAULTS.contactHeading;
  if (field === "label" && sectionType === "private_lessons") return content.label ?? PAGE_COPY_DEFAULTS.privateLabel;
  if (field === "actionLabel" && sectionType === "private_lessons") return content.actionLabel ?? PAGE_COPY_DEFAULTS.privateAction;
  if (field === "moreInfoLabel") return content.moreInfoLabel ?? PAGE_COPY_DEFAULTS.moreInfoLabel;
  if (field === "datesLabel") return content.datesLabel ?? PAGE_COPY_DEFAULTS.datesLabel;
  if (field === "headTeadaLabel") return content.headTeadaLabel ?? PAGE_COPY_DEFAULTS.headTeadaLabel;
  if (field === "tasakaalLabel") return content.tasakaalLabel ?? PAGE_COPY_DEFAULTS.tasakaalLabel;
  if (field === "registerHeading") return content.registerHeading ?? PAGE_COPY_DEFAULTS.registerHeading;
  return undefined;
}

function plain(value: string, path: EditPath, label: string): BoundEditorContent {
  return { format: "plain", value, path, label, plainPreview: value };
}

function offeringFieldLabel(field: string) {
  if (field === "short_title" || field === "title") return "Pealkiri";
  if (field === "schedule_summary") return "Aeg";
  if (field === "location_name") return "Koht";
  if (field === "address") return "Aadress";
  if (field === "tasakaal") return "Tasakaal";
  return "Tund";
}

export function fieldLabel(field: string, sectionType?: string) {
  if (field === "title") return sectionType === "hero" ? "Hero pealkiri" : "Pealkiri";
  if (field === "intro") return sectionType === "hero" ? "Hero sissejuhatus" : "Sissejuhatus";
  if (field === "heading") return "Pealkiri";
  if (field === "plain" || field === "body") return "Tekst";
  if (field === "label") return "Silt";
  if (field === "actionLabel") return "Nupp";
  if (field === "moreInfoLabel") return "Link";
  if (field === "scheduleText") return "Aeg";
  if (field === "bring") return "Kaasa";
  if (field === "clothing") return "Riided";
  if (field === "notes") return "Märkus";
  if (field === "datesLabel") return "Kuupäevad";
  if (field === "headTeadaLabel") return "Link";
  if (field === "tasakaalLabel") return "Tasakaal";
  if (field === "registerHeading") return "Pealkiri";
  if (field.startsWith("custom.")) return "Komponent";
  const indexed = parseIndexedField(field);
  if (indexed?.kind === "q") return "Küsimus";
  if (indexed?.kind === "a") return "Vastus";
  if (indexed?.kind === "item") return "Punkt";
  if (indexed?.kind === "quote") return "Tsitaat";
  if (indexed?.kind === "name") return "Nimi";
  return "Sisu";
}

function richPreview(value: TiptapNode): string {
  const parts: string[] = [];
  const walk = (node: TiptapNode) => {
    if (node.text) parts.push(node.text);
    node.content?.forEach(walk);
  };
  walk(value);
  return parts.join(" ").trim();
}

function warnMissingTextBinding(selection: EditorSelection) {
  if (process.env.NODE_ENV === "production") return;
  console.error(`Editable text node ${selection.id} has no content binding.`);
}

export function getEditableText(draft: EditorDraft, selection: EditorSelection): BoundEditorContent {
  return readEditorContent(draft, selection);
}

export function assertEditableTextBinding(draft: EditorDraft, selection: EditorSelection): BoundEditorContent {
  const bound = bindSelection(draft, selection);
  if (!bound?.path) {
    const message = `Text binding missing: ${selection.id}`;
    if (process.env.NODE_ENV !== "production") console.error(message);
    throw new Error(message);
  }
  return bound;
}

export function isRichEditorContent(content: BoundEditorContent): content is BoundEditorContent & { format: "rich" } {
  return content.format === "rich";
}

export function isStructuredEditorContent(
  content: BoundEditorContent,
): content is BoundEditorContent & { format: "structured" } {
  return content.format === "structured";
}
