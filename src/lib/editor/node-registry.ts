import type { AddableElementType, EditorSelection, InspectorTabId } from "@/lib/editor/types";
import type { AdminRole, LayoutElementNode } from "@/types/content";

export type EditorNodeKind =
  | "text"
  | "richText"
  | "image"
  | "list"
  | "buttons"
  | "video"
  | "links"
  | "audio"
  | "icons"
  | "gallery"
  | "table"
  | "timer"
  | "divider"
  | "slideshow"
  | "form"
  | "widget"
  | "embed"
  | "container"
  | "control"
  | "section"
  | "header"
  | "nav"
  | "page"
  | "offering";

export type EditorNodeDefinition = {
  type: EditorNodeKind;
  label: string;
  kindLabel: string;
  tabs: InspectorTabId[];
  ownerTabs?: InspectorTabId[];
  canPlaceBeside: boolean;
};

export const INSPECTOR_TAB_ORDER: InspectorTabId[] = [
  "content",
  "appearance",
  "layout",
  "animation",
  "advanced",
];

export const INSPECTOR_TAB_LABELS: Record<InspectorTabId, string> = {
  content: "Sisu",
  appearance: "Välimus",
  layout: "Paigutus",
  animation: "Animatsioon",
  advanced: "Täpsem",
};

const TABS = {
  text: ["content", "appearance", "animation"] as InspectorTabId[],
  media: ["content", "appearance", "animation"] as InspectorTabId[],
  structured: ["content", "appearance", "animation"] as InspectorTabId[],
  layout: ["content", "appearance", "animation"] as InspectorTabId[],
  container: ["content", "appearance"] as InspectorTabId[],
};

export const nodeRegistry: Record<EditorNodeKind, EditorNodeDefinition> = {
  text: { type: "text", label: "Tekst", kindLabel: "Tekst", tabs: TABS.text, ownerTabs: ["advanced"], canPlaceBeside: true },
  richText: { type: "richText", label: "Tekst", kindLabel: "Tekst", tabs: TABS.text, ownerTabs: ["advanced"], canPlaceBeside: true },
  image: { type: "image", label: "Pilt", kindLabel: "Pilt", tabs: TABS.media, ownerTabs: ["advanced"], canPlaceBeside: true },
  list: { type: "list", label: "Loend", kindLabel: "Loend", tabs: TABS.structured, canPlaceBeside: true },
  buttons: { type: "buttons", label: "Nupud", kindLabel: "Nupud", tabs: ["content", "appearance", "layout", "animation"], canPlaceBeside: true },
  video: { type: "video", label: "Video", kindLabel: "Video", tabs: TABS.media, canPlaceBeside: true },
  links: { type: "links", label: "Lingid", kindLabel: "Link", tabs: TABS.structured, canPlaceBeside: true },
  audio: { type: "audio", label: "Audio", kindLabel: "Audio", tabs: TABS.media, canPlaceBeside: true },
  icons: { type: "icons", label: "Ikoonid", kindLabel: "Ikoonid", tabs: TABS.structured, canPlaceBeside: true },
  gallery: { type: "gallery", label: "Galerii", kindLabel: "Galerii", tabs: TABS.media, canPlaceBeside: true },
  table: { type: "table", label: "Tabel", kindLabel: "Tabel", tabs: TABS.structured, canPlaceBeside: true },
  timer: { type: "timer", label: "Taimer", kindLabel: "Taimer", tabs: TABS.structured, canPlaceBeside: true },
  divider: { type: "divider", label: "Eraldaja", kindLabel: "Eraldaja", tabs: ["appearance"], canPlaceBeside: true },
  slideshow: { type: "slideshow", label: "Slaidiseanss", kindLabel: "Slaidiseanss", tabs: TABS.media, canPlaceBeside: true },
  form: { type: "form", label: "Vorm", kindLabel: "Vorm", tabs: TABS.structured, canPlaceBeside: true },
  widget: { type: "widget", label: "Moodul", kindLabel: "Moodul", tabs: TABS.structured, canPlaceBeside: true },
  embed: { type: "embed", label: "Embed", kindLabel: "Embed", tabs: TABS.structured, ownerTabs: ["advanced"], canPlaceBeside: true },
  container: { type: "container", label: "Konteiner", kindLabel: "Konteiner", tabs: TABS.container, ownerTabs: ["advanced"], canPlaceBeside: false },
  control: { type: "control", label: "Ankur", kindLabel: "Ankur", tabs: ["content", "advanced"], canPlaceBeside: true },
  section: { type: "section", label: "Sektsioon", kindLabel: "Sektsioon", tabs: TABS.layout, ownerTabs: ["advanced"], canPlaceBeside: false },
  header: { type: "header", label: "Päis", kindLabel: "Päis", tabs: ["content", "appearance"], canPlaceBeside: false },
  nav: { type: "nav", label: "Menüülink", kindLabel: "Menüülink", tabs: ["content"], canPlaceBeside: false },
  page: { type: "page", label: "Leht", kindLabel: "Leht", tabs: ["content"], ownerTabs: ["advanced"], canPlaceBeside: false },
  offering: { type: "offering", label: "Tund", kindLabel: "Tekst", tabs: TABS.text, canPlaceBeside: true },
};

const CUSTOM_FIELD_KIND: Record<string, EditorNodeKind> = {
  text: "text",
  list: "list",
  image: "image",
  buttons: "buttons",
  video: "video",
  links: "links",
  audio: "audio",
  icons: "icons",
  gallery: "gallery",
  table: "table",
  timer: "timer",
  divider: "divider",
  slideshow: "slideshow",
  form: "form",
  widget: "widget",
  embed: "embed",
  container: "text",
  control: "control",
};

export function kindFromAddable(type: AddableElementType): EditorNodeKind {
  if (type === "links") return "links";
  if (type === "container") return "container";
  return type;
}

export function kindFromLayoutElement(node: LayoutElementNode): EditorNodeKind {
  if (node.elementType === "offering") return "offering";
  if (node.elementType === "link") return "links";
  if (node.elementType === "text") return "text";
  return node.elementType;
}

export function kindFromField(field?: string): EditorNodeKind | null {
  if (!field?.startsWith("custom.")) return null;
  const raw = field.split(".")[1];
  return CUSTOM_FIELD_KIND[raw] ?? "text";
}

export function resolveNodeKind(selection: EditorSelection, options?: { rich?: boolean }): EditorNodeKind {
  if (selection.type === "image") return "image";
  if (selection.type === "section") return "section";
  if (selection.type === "container") return "container";
  if (selection.type === "header") return "header";
  if (selection.type === "nav") return "nav";
  if (selection.type === "page") return "page";
  if (selection.type === "link") return kindFromField(selection.field) ?? "links";
  if (selection.offeringId) return "offering";
  const fromField = kindFromField(selection.field);
  if (fromField) return fromField;
  if (options?.rich) return "richText";
  return "text";
}

export function tabsForKind(kind: EditorNodeKind, role: AdminRole = "editor"): InspectorTabId[] {
  const definition = nodeRegistry[kind];
  const extra = role === "owner" ? definition.ownerTabs ?? [] : [];
  const tabs = [...definition.tabs, ...extra];
  return INSPECTOR_TAB_ORDER.filter((tab) => tabs.includes(tab));
}

export function resolveInspectorTab(
  kind: EditorNodeKind,
  current: InspectorTabId | string | null | undefined,
  role: AdminRole = "editor",
): InspectorTabId {
  const tabs = tabsForKind(kind, role);
  const requested = current === "settings" ? "advanced" : current === "layout" ? "content" : current;
  if (requested && tabs.includes(requested as InspectorTabId)) return requested as InspectorTabId;
  return tabs[0] ?? "content";
}

export function nodeKindLabel(kind: EditorNodeKind): string {
  return nodeRegistry[kind].kindLabel;
}

export function canPlaceBeside(kind: EditorNodeKind): boolean {
  return nodeRegistry[kind].canPlaceBeside;
}
