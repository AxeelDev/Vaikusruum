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

export type SectionStyle = {
  background?: "main" | "warm" | "soft";
  layout?: "image-left" | "image-right" | "text-only" | "image-only" | "centered";
  verticalAlign?: "start" | "center";
  textAlign?: "left" | "center";
  minHeight?: "none" | "compact" | "viewport";
  specks?: boolean;
  mediaId?: string | null;
  mobileOrder?: "image-first" | "text-first";
  topSpace?: number | null;
  bottomSpace?: number | null;
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
