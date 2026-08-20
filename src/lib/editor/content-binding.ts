import type { TiptapNode } from "@/types/content";
import { isTiptapDoc } from "@/lib/content/rich-text";
import { findSection } from "@/lib/editor/draft";
import type { EditPath, EditorDraft, EditorSelection } from "@/lib/editor/types";
import type { OfferingRow } from "@/types/content";

export type EditorContent =
  | { format: "plain"; value: string }
  | { format: "rich"; value: TiptapNode }
  | { format: "structured"; value: unknown };

export type BoundEditorContent = EditorContent & {
  path: EditPath | null;
  label: string;
  plainPreview: string;
};

const EMPTY_PLAIN: BoundEditorContent = {
  format: "plain",
  value: "",
  path: null,
  label: "Sisu",
  plainPreview: "",
};

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
    const field = selection.field;
    if (field.startsWith("q.")) {
      const index = Number(field.slice(2));
      const value = String((section.content.items as Array<{ question?: string }> | undefined)?.[index]?.question ?? "");
      return plain(value, { kind: "faq", sectionId: section.id, index, field: "question" }, "Küsimus");
    }
    if (field.startsWith("a.")) {
      const index = Number(field.slice(2));
      const value = String((section.content.items as Array<{ answer?: string }> | undefined)?.[index]?.answer ?? "");
      return plain(value, { kind: "faq", sectionId: section.id, index, field: "answer" }, "Vastus");
    }
    if (field.startsWith("item.")) {
      const index = Number(field.slice(5));
      const value = String((section.content.items as string[] | undefined)?.[index] ?? "");
      return plain(value, { kind: "list-item", sectionId: section.id, index }, "Punkt");
    }
    if (field.startsWith("quote.")) {
      const index = Number(field.slice(6));
      const value = String((section.content.items as Array<{ quote?: string }> | undefined)?.[index]?.quote ?? "");
      return plain(value, { kind: "testimonial", sectionId: section.id, index, field: "quote" }, "Tsitaat");
    }
    if (field.startsWith("name.")) {
      const index = Number(field.slice(5));
      const value = String((section.content.items as Array<{ name?: string }> | undefined)?.[index]?.name ?? "");
      return plain(value, { kind: "testimonial", sectionId: section.id, index, field: "name" }, "Nimi");
    }

    const raw = readSectionField(section.content, field, section.section_type, draft);
    if (isTiptapDoc(raw)) {
      return {
        format: "rich",
        value: raw,
        path: { kind: "section-content", sectionId: section.id, key: field },
        label: fieldLabel(field, section.section_type),
        plainPreview: richPreview(raw),
      };
    }
    if (typeof raw === "string") {
      return plain(raw, { kind: "section-content", sectionId: section.id, key: field }, fieldLabel(field, section.section_type));
    }
    if (raw && typeof raw === "object") {
      return {
        format: "structured",
        value: raw,
        path: { kind: "section-content", sectionId: section.id, key: field },
        label: fieldLabel(field, section.section_type),
        plainPreview: "",
      };
    }
    if (field === "title" && section.section_type === "hero") {
      return plain(draft.settings.site_name || "VAIKUSRUUM", { kind: "section-content", sectionId: section.id, key: "title" }, "Hero pealkiri");
    }
    return plain("", { kind: "section-content", sectionId: section.id, key: field }, fieldLabel(field, section.section_type));
  }
  if (selection.field === "title" || selection.type === "page") {
    const page = draft.pages.find((item) => item.id === draftPageId(draft, selection) ) ?? draft.pages[0];
    if (!page) return null;
    return plain(page.title, { kind: "page-title", pageId: page.id }, "Pealkiri");
  }
  return null;
}

function draftPageId(draft: EditorDraft, selection: EditorSelection) {
  if (selection.id.includes(".")) {
    const slug = selection.id.split(".")[0];
    return draft.pages.find((page) => page.slug === slug)?.id;
  }
  return undefined;
}

function readSectionField(
  content: Record<string, unknown>,
  field: string,
  sectionType: string,
  draft: EditorDraft,
): unknown {
  if (Object.prototype.hasOwnProperty.call(content, field)) return content[field];
  if (field === "body" && content.text !== undefined) return content.text;
  if (field === "plain" && typeof content.copy === "string") return content.copy;
  if (field === "title" && sectionType === "hero") return content.title ?? draft.settings.site_name ?? "VAIKUSRUUM";
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
  return "Tund";
}

function fieldLabel(field: string, sectionType?: string) {
  if (field === "title") return sectionType === "hero" ? "Hero pealkiri" : "Pealkiri";
  if (field === "intro") return sectionType === "hero" ? "Hero sissejuhatus" : "Sissejuhatus";
  if (field === "heading") return "Pealkiri";
  if (field === "plain" || field === "body") return "Tekst";
  if (field === "label") return "Silt";
  if (field === "actionLabel") return "Nupp";
  if (field === "moreInfoLabel") return "Link";
  if (field.startsWith("custom.")) return "Komponent";
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
