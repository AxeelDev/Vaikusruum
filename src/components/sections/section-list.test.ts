import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SectionList } from "@/components/sections/SectionList";
import { paragraphs } from "@/lib/content/rich-text";
import type { SectionRow, SiteSettings } from "@/types/content";
import { SEED_IDS } from "@/lib/content/ids";

const settings: SiteSettings = {
  id: 1,
  site_name: "Vaikusruum",
  contact_email: null,
  contact_phone: null,
  default_registration_email: null,
  social: {},
  footer_text: "Vaikusruum",
};

function row(partial: Partial<SectionRow> & Pick<SectionRow, "section_key" | "section_type" | "content">): SectionRow {
  return {
    id: partial.id ?? "s1",
    page_id: "p1",
    sort_order: 1,
    enabled: true,
    style: partial.style ?? {},
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

function html(slug: string, sections: SectionRow[]) {
  return renderToStaticMarkup(
    createElement(SectionList, {
      slug,
      sections,
      offerings: {
        [SEED_IDS.offerings.kundalini]: {
          id: SEED_IDS.offerings.kundalini,
          slug: "kundalini-jooga",
          title: "Kundalini jooga",
          short_title: "Kundalini jooga",
          location_name: "Lauliku lasteaia saal",
          address: "Kivimäe 17, Tallinn",
          schedule_summary: "Kolmapäeviti 19:30–21:00",
          tasakaal: null,
          registration_mode: "form",
          registration_email: null,
          registration_url: null,
          active: true,
        },
      },
      eventsByOffering: {},
      media: {},
      settings,
      themeDensity: "low",
    }),
  );
}

describe("section list copy", () => {
  it("renders inner-page headings and bodies", () => {
    const markup = html("kundalini-jooga", [
      row({
        section_key: "what",
        section_type: "rich_text",
        content: {
          heading: "Mis on kundalini jooga?",
          body: paragraphs("Kundalini jooga on terviklik joogapraktika"),
        },
        style: { layout: "centered" },
      }),
    ]);
    expect(markup).toContain("Mis on kundalini jooga?");
    expect(markup).toContain("Kundalini jooga on terviklik joogapraktika");
  });

  it("renders faq questions that used to vanish from the tree", () => {
    const markup = html("joogatunni-kkk", [
      row({
        section_key: "faq",
        section_type: "faq",
        content: {
          items: [{ question: "Kas tund sobib algajale?", answer: "Jah." }],
        },
      }),
    ]);
    expect(markup).toContain("Kas tund sobib algajale?");
    expect(markup).toContain("Jah.");
  });

  it("keeps hea teada and practical labels in the page copy", () => {
    const markup = html("kundalini-jooga", [
      row({
        section_key: "practical",
        section_type: "offering_practical_info",
        content: {
          offeringId: SEED_IDS.offerings.kundalini,
          scheduleText: "Tunnid toimuvad kolmapäeviti",
          bring: "Kaasa võta: oma matt",
          clothing: "Selga mugavad riided.",
          headTeadaLink: true,
        },
      }),
    ]);
    expect(markup).toContain("Tunnid toimuvad kolmapäeviti");
    expect(markup).toContain("Kaasa võta: oma matt");
    expect(markup).toContain("Selga mugavad riided.");
    expect(markup).toContain("Hea teada");
    expect(markup).toContain("Registreeri tundi");
  });
});
