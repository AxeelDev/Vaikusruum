export type AdminRole = "owner" | "editor";

export type RegistrationMode = "form" | "email" | "external_link" | "form_and_email" | "disabled";

export type SectionType =
  | "hero"
  | "split_media_text"
  | "rich_text"
  | "offering_overview"
  | "offering_practical_info"
  | "faq"
  | "important_info"
  | "testimonials"
  | "contact"
  | "private_lessons"
  | "spacer";

export type PageRow = {
  id: string;
  slug: string;
  title: string;
  nav_label: string | null;
  show_in_nav: boolean;
  nav_order: number;
  is_published: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type SectionRow = {
  id: string;
  page_id: string;
  section_key: string;
  section_type: SectionType;
  sort_order: number;
  enabled: boolean;
  content: Record<string, unknown>;
  style: SectionStyle;
  created_at: string;
  updated_at: string;
};

export type HeightPreset = "screen" | "large" | "auto";
export type VerticalAlign = "start" | "center" | "end";
export type TextAlign = "left" | "center" | "right";
export type ColumnBalance = "40-60" | "45-55" | "50-50" | "55-45" | "60-40";
export type ImageCrop = "original" | "landscape" | "portrait" | "square";
export type TextRole = "h1" | "h2" | "h3" | "p";
export type HorizontalAlign = "left" | "center" | "right";

export type LayoutElementNode = {
  id: string;
  type: "element";
  elementType:
    | "text"
    | "image"
    | "link"
    | "offering"
    | "form"
    | "list"
    | "buttons"
    | "video"
    | "audio"
    | "icons"
    | "gallery"
    | "table"
    | "timer"
    | "divider"
    | "slideshow"
    | "widget"
    | "embed"
    | "control";
  label: string;
  field?: string;
  offeringId?: string;
};

export type LayoutGroupNode = {
  id: string;
  type: "group";
  label: string;
  gap?: "small" | "medium" | "large";
  horizontalAlign?: HorizontalAlign;
  textAlign?: TextAlign;
  ephemeral?: boolean;
  preferredRatio?: ColumnBalance | "custom";
  preferredCustomRatio?: number;
  children: LayoutNode[];
};

export type LayoutColumnNode = {
  id: string;
  type: "column";
  label: string;
  horizontalAlign?: HorizontalAlign;
  verticalAlign?: "top" | "center" | "bottom";
  children: LayoutNode[];
};

export type LayoutColumnsNode = {
  id: string;
  type: "columns";
  label: string;
  ratio?: ColumnBalance | "custom";
  customRatio?: number;
  gap?: "small" | "medium" | "large" | "custom";
  gapPx?: number;
  verticalAlign?: "top" | "center" | "bottom";
  horizontalAlign?: HorizontalAlign;
  mobile?: {
    mode?: "stack" | "columns";
    order?: "left-first" | "right-first";
  };
  columns: [LayoutColumnNode, LayoutColumnNode];
};

export type LayoutNode = LayoutColumnsNode | LayoutColumnNode | LayoutGroupNode | LayoutElementNode;

export type SectionLayoutTree = {
  version: 1;
  root: LayoutColumnsNode | LayoutGroupNode;
};

export type TextAppearance = {
  role?: TextRole;
  color?: string;
  fontId?: string;
  size?: number;
  weight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: TextAlign;
  width?: number;
};

export type ImageAppearance = {
  crop?: ImageCrop;
  width?: number;
  radius?: number;
  align?: "left" | "right" | "center";
};

export type AnimationAppearance = {
  preset?: "none" | "fade-in" | "fade-up" | "fade-down" | "fade-left" | "fade-right" | "scale-in";
  duration?: number;
  delay?: number;
  threshold?: number;
  replayable?: boolean;
};

export type SectionStyle = {
  background?: "main" | "warm" | "soft";
  layout?: "image-left" | "image-right" | "text-only" | "image-only" | "centered";
  verticalAlign?: VerticalAlign;
  textAlign?: TextAlign;
  height?: HeightPreset;
  minHeight?: "none" | "compact" | "viewport";
  specks?: boolean;
  mediaId?: string | null;
  mobileOrder?: "image-first" | "text-first";
  topSpace?: number | null;
  bottomSpace?: number | null;
  contentWidth?: number | null;
  splitGap?: number | null;
  columnBalance?: ColumnBalance;
  columnRatio?: number | null;
  preferredColumnBalance?: ColumnBalance;
  preferredColumnRatio?: number | null;
  layoutTree?: SectionLayoutTree;
  fieldStyles?: Record<string, TextAppearance>;
  image?: ImageAppearance;
  animation?: AnimationAppearance;
};

export type OfferingRow = {
  id: string;
  slug: string;
  title: string;
  short_title: string | null;
  location_name: string | null;
  address: string | null;
  schedule_summary: string | null;
  tasakaal: string | null;
  registration_mode: RegistrationMode;
  registration_email: string | null;
  registration_url: string | null;
  active: boolean;
};

export type EventRow = {
  id: string;
  offering_id: string;
  starts_at: string | null;
  ends_at: string | null;
  display_date: string | null;
  sort_order: number;
  active: boolean;
};

export type MediaRow = {
  id: string;
  storage_path: string;
  alt_text: string | null;
  caption: string | null;
  focal_x: number;
  focal_y: number;
};

export type SiteSettings = {
  id: 1;
  site_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  default_registration_email: string | null;
  social: {
    instagram?: string | null;
    facebook?: string | null;
    pinterest?: string | null;
    youtube?: string | null;
  };
  footer_text: string | null;
};

export type NavItem = {
  href: string;
  label: string;
  slug: string;
};

export type TiptapMark = { type: string; attrs?: Record<string, unknown> };

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
};

export type FaqItem = { question: string; answer: string };

export type SocialPlatform = "instagram" | "facebook" | "pinterest" | "youtube";
