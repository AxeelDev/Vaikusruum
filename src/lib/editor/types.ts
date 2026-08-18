import type {
  EventRow,
  MediaRow,
  OfferingRow,
  PageRow,
  SectionRow,
  SectionType,
  SiteSettings,
} from "@/types/content";
import type { ThemeTokens } from "@/lib/theme/theme";

export type EditorBreakpoint = "desktop" | "tablet" | "mobile";
export type InspectorTab = "content" | "appearance" | "animation" | "settings";
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
};

export type EditorState = {
  pageId: string;
  selected: EditorSelection | null;
  inspectorOpen: boolean;
  inspectorTab: InspectorTab;
  breakpoint: EditorBreakpoint;
  draft: EditorDraft;
  dirty: boolean;
  history: EditorDraft[];
  historyIndex: number;
  draggedNodeId: string | null;
  hoveredNodeId: string | null;
  preview: boolean;
  advanced: boolean;
  saving: boolean;
  saveError: string | null;
  saveFlash: boolean;
  themePanel: boolean;
  pendingPageId: string | null;
  pendingNavigationHref: string | null;
};

export type AddableSectionType = Extract<
  SectionType,
  "rich_text" | "split_media_text" | "offering_overview" | "faq" | "contact" | "private_lessons" | "testimonials" | "spacer"
>;

export type AddableElementType =
  | "text"
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
  { type: "text", label: "Text" },
  { type: "list", label: "List" },
  { type: "image", label: "Image" },
  { type: "buttons", label: "Buttons" },
  { type: "video", label: "Video" },
  { type: "links", label: "Links" },
  { type: "audio", label: "Audio" },
  { type: "icons", label: "Icons" },
  { type: "gallery", label: "Gallery" },
  { type: "table", label: "Table" },
  { type: "timer", label: "Timer" },
  { type: "divider", label: "Divider" },
  { type: "slideshow", label: "Slideshow" },
  { type: "form", label: "Form" },
  { type: "widget", label: "Widget" },
  { type: "embed", label: "Embed", ownerOnly: true },
  { type: "container", label: "Container" },
  { type: "control", label: "Control", ownerOnly: true },
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
