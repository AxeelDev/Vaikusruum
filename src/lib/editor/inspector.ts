import { findSection } from "@/lib/editor/draft";
import {
  INSPECTOR_TAB_LABELS,
  nodeKindLabel,
  resolveInspectorTab,
  resolveNodeKind,
  tabsForKind,
  type EditorNodeKind,
} from "@/lib/editor/node-registry";
import { readEditorContent } from "@/lib/editor/content-binding";
import { clientLayoutLabel } from "@/lib/editor/labels";
import { findLayoutNode, getSectionLayoutTree } from "@/lib/editor/layout-tree";
import type { EditorDraft, EditorSelection, InspectorContext, InspectorTabId } from "@/lib/editor/types";
import type { AdminRole } from "@/types/content";

export type { InspectorTabId, EditorNodeKind };
export { INSPECTOR_TAB_LABELS, resolveInspectorTab, tabsForKind };

export type InspectorModel = {
  context: InspectorContext;
  kind: EditorNodeKind | null;
  tabs: InspectorTabId[];
  tab: InspectorTabId;
  title: string;
  kicker: string;
  breadcrumb: string;
};

export function inspectorContextFromSelection(
  selection: EditorSelection | null,
  siteDesign: boolean,
  pageId: string,
): InspectorContext {
  if (siteDesign) return { kind: "site" };
  if (!selection) return { kind: "none" };
  if (selection.type === "page") return { kind: "page", pageId: pageId };
  return { kind: "node", nodeId: selection.id };
}

export function buildInspectorModel(options: {
  draft: EditorDraft;
  selection: EditorSelection | null;
  context: InspectorContext;
  tab: InspectorTabId | string;
  role: AdminRole;
  pageId: string;
}): InspectorModel {
  const { draft, selection, context, tab, role, pageId } = options;
  if (context.kind === "site") {
    return {
      context,
      kind: null,
      tabs: [],
      tab: "appearance",
      title: "Saidi kujundus",
      kicker: "Sait",
      breadcrumb: "Saidi kujundus",
    };
  }
  if (context.kind === "none" || !selection) {
    const page = draft.pages.find((item) => item.id === pageId);
    return {
      context: { kind: "none" },
      kind: null,
      tabs: [],
      tab: "content",
      title: page?.title ?? "Leht",
      kicker: "Leht",
      breadcrumb: "Elemendid",
    };
  }

  const content = readEditorContent(draft, selection);
  const kind = resolveNodeKind(selection, { rich: content.format === "rich" });
  const tabs = tabsForKind(kind, role);
  const resolvedTab = resolveInspectorTab(kind, tab, role);
  const title = inspectorTitle(draft, selection, kind, content.plainPreview);
  return {
    context,
    kind,
    tabs,
    tab: resolvedTab,
    title,
    kicker: nodeKindLabel(kind),
    breadcrumb: `${nodeKindLabel(kind)} / ${title}`,
  };
}

export function inspectorTitle(
  draft: EditorDraft,
  selection: EditorSelection,
  kind: EditorNodeKind,
  preview?: string,
): string {
  if (selection.type === "header") return "Päis";
  if (selection.id === "header.wordmark") return "Vaikusruum";
  if (selection.id === "footer.text") return "Jalusetekst";
  if (kind === "section" && selection.sectionId) {
    const section = findSection(draft, selection.sectionId);
    return section ? clientLayoutLabel(section, { type: "section", id: section.id, label: section.section_key }) : "Sektsioon";
  }
  if (kind === "container" && selection.sectionId) {
    const section = findSection(draft, selection.sectionId);
    const node = section ? findLayoutNode(getSectionLayoutTree(section).root, selection.layoutNodeId ?? selection.id) : null;
    if (section && node) return clientLayoutLabel(section, node);
  }
  if (kind === "image" && selection.sectionId) {
    const section = findSection(draft, selection.sectionId);
    if (section) return clientLayoutLabel(section, { type: "element", id: selection.id, elementType: "image", label: "Pilt" });
  }
  if (preview?.trim()) return preview.trim().slice(0, 42);
  if (selection.field === "title" || selection.id.includes("title")) return "Pealkiri";
  if (selection.field === "intro" || selection.id.includes("intro")) return "Sissejuhatus";
  if (selection.field === "heading") return "Pealkiri";
  if (selection.field === "plain" || selection.field === "body") return "Tekst";
  return nodeKindLabel(kind);
}

export const SITE_DESIGN_TABS = [
  { id: "colors", label: "Värvid" },
  { id: "fonts", label: "Kirjatüübid" },
  { id: "layout", label: "Paigutus" },
  { id: "background", label: "Taust" },
] as const;

export type SiteDesignTabId = (typeof SITE_DESIGN_TABS)[number]["id"];
