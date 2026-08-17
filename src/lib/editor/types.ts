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
export type InspectorTab = "content" | "appearance" | "layout";
export type SelectedType =
  | "page"
  | "section"
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
  inlineEditingId: string | null;
  preview: boolean;
  advanced: boolean;
  saving: boolean;
  saveError: string | null;
  saveFlash: boolean;
  themePanel: boolean;
  pendingPageId: string | null;
};

export type AddableSectionType = Extract<
  SectionType,
  "rich_text" | "split_media_text" | "offering_overview" | "faq" | "contact" | "private_lessons" | "testimonials" | "spacer"
>;

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
