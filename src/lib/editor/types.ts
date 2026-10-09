import type {
  EventRow,
  MediaRow,
  OfferingRow,
  PageRow,
  SectionRow,
  SectionType,
  SiteSettings,
  TestimonialWithPhoto,
} from "@/types/content";
import type { ThemeTokens } from "@/lib/theme/theme";

export type EditorBreakpoint = "desktop" | "tablet" | "mobile";
export type InspectorTabId = "content" | "appearance" | "layout" | "animation" | "advanced";
export type InspectorTab = InspectorTabId | "settings";
export type InspectorContext =
  | { kind: "none" }
  | { kind: "site" }
  | { kind: "page"; pageId: string }
  | { kind: "node"; nodeId: string };

export type EditPath =
  | { kind: "section-content"; sectionId: string; key: string }
  | { kind: "offering"; offeringId: string; key: keyof OfferingRow }
  | { kind: "settings"; key: "site_name" | "footer_text" | "contact_email" | "contact_phone" }
  | { kind: "nav-label"; pageId: string }
  | { kind: "page-title"; pageId: string }
  | { kind: "faq"; sectionId: string; index: number; field: "question" | "answer" }
  | { kind: "list-item"; sectionId: string; index: number };

export type SelectedType =
  | "page"
  | "section"
  | "container"
  | "text"
  | "image"
  | "link"
  | "header"
  | "nav"
  | "theme"
  | null;

export type EditorDraft = {
  pages: PageRow[];
  sectionsByPage: Record<string, SectionRow[]>;
  offerings: Record<string, OfferingRow>;
  eventsByOffering: Record<string, EventRow[]>;
  media: Record<string, MediaRow>;
  settings: SiteSettings;
  theme: ThemeTokens;
  customCss: string;
  deletedSectionIds: string[];
};

export type EditorSelection = {
  id: string;
  type: Exclude<SelectedType, null>;
  sectionId?: string;
  field?: string;
  offeringId?: string;
  mediaId?: string;
  navSlug?: string;
  layoutNodeId?: string;
};

export type EditorState = {
  pageId: string;
  selected: EditorSelection | null;
  inspectorOpen: boolean;
  inspectorContext: InspectorContext;
  inspectorTab: InspectorTab;
  notice: string | null;
  lastInsertedNodeId: string | null;
  breakpoint: EditorBreakpoint;
  draft: EditorDraft;
  /** Shown on the canvas, edited in the admin panel; never part of the editor's own draft. */
  testimonials: TestimonialWithPhoto[];
  dirty: boolean;
  history: EditorDraft[];
  historyIndex: number;
  preview: boolean;
  advanced: boolean;
  saving: boolean;
  saveError: string | null;
  /** The last save was refused because the site changed after the editor loaded. */
  saveConflict: boolean;
  saveFlash: boolean;
  pendingPageId: string | null;
  pendingNavigationHref: string | null;
};

export type DragRuntimeState = {
  draggedNodeId: string | null;
  hoveredNodeId: string | null;
};

export type AddableSectionType = Extract<
  SectionType,
  "rich_text" | "split_media_text" | "offering_overview" | "faq" | "contact" | "private_lessons" | "testimonials" | "spacer"
>;

export type AddableElementType =
  | "text"
  | "paragraph"
  | "list"
  | "image"
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
  | "control";

export const ADDABLE_ELEMENTS: Array<{ type: AddableElementType; label: string; ownerOnly?: boolean }> = [
  { type: "text", label: "Tekst" },
  { type: "paragraph", label: "Lõik" },
  { type: "list", label: "Loend" },
  { type: "image", label: "Pilt" },
  { type: "buttons", label: "Nupud" },
  { type: "video", label: "Video" },
  { type: "links", label: "Lingid" },
  { type: "audio", label: "Heli" },
  { type: "icons", label: "Ikoonid" },
  { type: "gallery", label: "Galerii" },
  { type: "table", label: "Tabel" },
  { type: "timer", label: "Taimer" },
  { type: "divider", label: "Eraldaja" },
  { type: "slideshow", label: "Slaidiesitlus" },
  { type: "form", label: "Vorm" },
  { type: "widget", label: "Vidin" },
  { type: "embed", label: "Manustatud kood", ownerOnly: true },
  { type: "container", label: "Plokk" },
  { type: "control", label: "Juhtelement", ownerOnly: true },
];

export const ADDABLE_SECTIONS: Array<{ type: AddableSectionType; label: string }> = [
  { type: "rich_text", label: "Tekst" },
  { type: "split_media_text", label: "Pilt + tekst" },
  { type: "offering_overview", label: "Tunnid" },
  { type: "faq", label: "KKK" },
  { type: "contact", label: "Kontakt" },
  { type: "private_lessons", label: "Eratunnid" },
  { type: "testimonials", label: "Tagasiside" },
  { type: "spacer", label: "Vahe" },
];

export const BREAKPOINT_WIDTH: Record<EditorBreakpoint, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};
