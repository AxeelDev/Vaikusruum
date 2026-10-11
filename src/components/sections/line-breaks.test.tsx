import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The editor imports its save action; nothing here saves, so the server side is left out.
vi.mock("@/lib/actions/admin", () => ({ saveEditorDraftAction: vi.fn() }));

import { EditorProvider } from "@/components/editor/EditorProvider";
import { SectionList } from "@/components/sections/SectionList";
import { SEED_IDS } from "@/lib/content/ids";
import type { EditorDraft } from "@/lib/editor/types";
import { DEFAULT_THEME } from "@/lib/theme/theme";
import type { OfferingRow, SectionRow, SiteSettings } from "@/types/content";

/**
 * A line break typed into any text box must show on the page, for visitors and in the editor alike.
 * Each field below holds "<token> üks\n<token> kaks"; the page must put a <br/> between the two lines.
 */
const two = (token: string) => `${token} üks\n${token} kaks`;
const broken = (token: string) => `${token} üks<br/>${token} kaks`;

const KUNDALINI = SEED_IDS.offerings.kundalini;

const settings: SiteSettings = {
  id: 1,
  site_name: "Vaikusruum",
  contact_name: two("NIMI"),
  contact_email: "info@example.com",
  contact_phone: "55555555",
  company_name: two("FIRMA"),
  registry_code: "1234",
  iban: "EE00",
  bank: two("PANK"),
  default_registration_email: null,
  social: {},
  footer_text: "Vaikusruum",
};

const offering: OfferingRow = {
  id: KUNDALINI,
  slug: "kundalini-jooga",
  title: "Kundalini jooga",
  short_title: two("KAART"),
  location_name: two("KOHT"),
  address: two("AADRESS"),
  schedule_summary: two("AEG"),
  tasakaal: two("TASAKAAL"),
  registration_mode: "form",
  registration_email: null,
  registration_url: null,
  active: true,
};

function row(id: string, partial: Pick<SectionRow, "section_key" | "section_type" | "content"> & Partial<SectionRow>): SectionRow {
  return { id, page_id: "p1", sort_order: 1, enabled: true, style: {}, created_at: "", updated_at: "", ...partial };
}

/** Field token → the slug and sections that show it. */
const CASES: Array<{ name: string; slug: string; sections: SectionRow[]; tokens: string[] }> = [
  {
    name: "rich text heading and plain text",
    slug: "minust",
    sections: [row("s-rich", { section_key: "about", section_type: "rich_text", content: { heading: two("PEALKIRI"), plain: two("TEKST") } })],
    tokens: ["PEALKIRI", "TEKST"],
  },
  {
    name: "hero intro",
    slug: "avaleht",
    sections: [row("s-hero", { section_key: "hero", section_type: "hero", content: { title: "VAIKUSRUUM", intro: two("INTRO") } })],
    tokens: ["INTRO"],
  },
  {
    name: "faq question and answer",
    slug: "joogatunni-kkk",
    sections: [row("s-faq", { section_key: "faq", section_type: "faq", content: { items: [{ question: two("KUSIMUS"), answer: two("VASTUS") }] } })],
    tokens: ["KUSIMUS", "VASTUS"],
  },
  {
    name: "offering card",
    slug: "avaleht",
    sections: [
      row("s-offer", {
        section_key: "offerings",
        section_type: "offering_overview",
        content: { offeringIds: [KUNDALINI], moreInfoLabel: two("ROHKEM") },
        style: { layout: "image-right" },
      }),
    ],
    tokens: ["KAART", "KOHT", "AADRESS", "AEG", "ROHKEM"],
  },
  {
    name: "practical info",
    slug: "kundalini-jooga",
    sections: [
      row("s-practical", {
        section_key: "practical",
        section_type: "offering_practical_info",
        content: {
          offeringId: KUNDALINI,
          scheduleText: two("TOIMUB"),
          bring: two("KAASA"),
          clothing: two("RIIDED"),
          notes: two("MARKUS"),
          tasakaalLabel: two("SILT"),
          headTeadaLink: true,
          headTeadaLabel: two("HEATEADA"),
          registerHeading: two("REGISTREERI"),
          formButtons: [{ label: two("NUPP"), href: "https://example.com" }],
        },
      }),
    ],
    tokens: ["TOIMUB", "KAASA", "RIIDED", "MARKUS", "SILT", "TASAKAAL", "HEATEADA", "REGISTREERI", "NUPP"],
  },
  {
    name: "private lessons",
    slug: "eratunnid",
    sections: [
      row("s-private", {
        section_key: "lessons",
        section_type: "private_lessons",
        content: {
          heading: two("TEENUS"),
          lessons: [{ title: two("TUND"), duration: two("KESTUS"), description: two("KIRJELDUS") }],
          prices: [{ label: two("HIND"), amount: two("SUMMA") }],
          actionLabel: two("TEGEVUS"),
        },
      }),
    ],
    tokens: ["TEENUS", "TUND", "KESTUS", "KIRJELDUS", "HIND", "SUMMA", "TEGEVUS"],
  },
  {
    name: "contact form copy and contact details",
    slug: "kontakt",
    sections: [
      row("s-contact", {
        section_key: "contact",
        section_type: "contact",
        content: { heading: two("KONTAKT"), formConsent: two("NOUSOLEK"), formName: two("VALINIMI"), formSubmit: two("SAADA") },
        style: { layout: "text-only" },
      }),
    ],
    tokens: ["KONTAKT", "NOUSOLEK", "VALINIMI", "SAADA", "NIMI", "FIRMA", "PANK"],
  },
];

function draft(sections: SectionRow[]): EditorDraft {
  return {
    pages: [{ id: "p1", slug: "avaleht", title: "Avaleht", nav_label: "Avaleht", show_in_nav: true, nav_order: 1, is_published: true, seo_title: null, seo_description: null, created_at: "", updated_at: "" }],
    sectionsByPage: { p1: sections },
    offerings: { [KUNDALINI]: offering },
    eventsByOffering: {},
    media: {},
    settings,
    theme: DEFAULT_THEME,
    customCss: "",
    deletedSectionIds: [],
  };
}

function render(slug: string, sections: SectionRow[], inEditor: boolean) {
  const list = (
    <SectionList
      slug={slug}
      sections={sections}
      offerings={{ [KUNDALINI]: offering }}
      eventsByOffering={{}}
      media={{}}
      settings={settings}
      themeDensity="low"
    />
  );
  if (!inEditor) return renderToStaticMarkup(list);
  return renderToStaticMarkup(
    <EditorProvider initial={draft(sections)} revision={1} role="owner">
      {list}
    </EditorProvider>,
  );
}

describe.each([
  ["for visitors", false],
  ["in the editor", true],
])("line breaks %s", (_label, inEditor) => {
  it.each(CASES)("show in $name", ({ slug, sections, tokens }) => {
    const markup = render(slug, sections, inEditor);
    for (const token of tokens) {
      expect(markup, token).toContain(broken(token));
    }
  });
});

describe("shared text styles", () => {
  it("style every lesson name and amount for visitors", () => {
    const sections = [
      row("s-styled", {
        section_key: "lessons",
        section_type: "private_lessons",
        content: { lessons: [{ title: "Tund A", duration: "1 h", description: "" }], prices: [{ label: "Hind", amount: "80 €" }] },
        style: { fieldStyles: { "lessons.name": { fontSize: 31, fontWeight: 700 }, "prices.amount": { letterSpacing: 0.2 } } },
      }),
    ];
    const markup = render("eratunnid", sections, false);
    expect(markup).toMatch(/<span[^>]*style="[^"]*font-size:31px[^"]*"[^>]*>Tund A<\/span>/);
    expect(markup).toMatch(/<span[^>]*style="[^"]*letter-spacing:0.2em[^"]*"[^>]*>80 €<\/span>/);
  });
});
