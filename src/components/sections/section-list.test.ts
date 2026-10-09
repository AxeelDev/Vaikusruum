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
  contact_name: "Miina Laanesaar",
  contact_email: "miina.laanesaar@gmail.com",
  contact_phone: "55585161",
  company_name: "Kõlavõlu OÜ",
  registry_code: "14342017",
  iban: "EE827700771002774537",
  bank: "LHV",
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

  it("renders offering titles as whole phrases", () => {
    const markup = html("avaleht", [
      row({
        section_key: "offerings",
        section_type: "offering_overview",
        content: {
          offeringIds: [SEED_IDS.offerings.kundalini],
          moreInfoLabel: "rohkem infot",
        },
        style: { layout: "image-right" },
      }),
    ]);
    expect(markup).toContain("Kundalini jooga");
    expect(markup).toContain("rohkem infot");
    expect(markup).toContain("vr-layout-element--card");
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

  it("shows a price written into the tasakaal label even without a separate amount", () => {
    const practical = (tasakaalLabel?: string) =>
      html("kundalini-jooga", [
        row({
          section_key: "practical",
          section_type: "offering_practical_info",
          content: { offeringId: SEED_IDS.offerings.kundalini, ...(tasakaalLabel ? { tasakaalLabel } : {}) },
        }),
      ]);
    expect(practical("Tasakaal: 20€")).toContain("Tasakaal: 20€");
    expect(practical()).not.toContain("Tasakaal");
  });

  it("renders private lesson options and shared prices", () => {
    const markup = html("eratunnid", [
      row({
        section_key: "lessons",
        section_type: "private_lessons",
        content: {
          heading: "Individuaalne joogatund",
          lessons: [
            { title: "Kundalini jooga", duration: "1,5 h", description: "" },
            { title: "Individuaaltund rasedale", duration: "1,5 h", description: "Õrn, toetav, sünnituseks ettevalmistav." },
          ],
          prices: [
            { label: "Individuaaltund", amount: "80 €" },
            { label: "Tule koos sõbraga!", amount: "120 €" },
          ],
          actionLabel: "Võta ühendust",
        },
      }),
    ]);
    expect(markup).toContain("Individuaalne joogatund");
    expect(markup).toContain("1,5 h");
    expect(markup).toContain("Õrn, toetav, sünnituseks ettevalmistav.");
    expect(markup).toContain("80 €");
    expect(markup).toContain("Tule koos sõbraga!");
    expect(markup).toContain("120 €");
  });

  it("gives each contact form its own button links", () => {
    const contact = (heading: string, href: string, label: string) =>
      row({
        section_key: "contact",
        section_type: "contact",
        content: { heading, formButtons: [{ label, href }] },
        style: { layout: "text-only", background: "warm" },
      });
    const home = html("avaleht", [contact("A", "https://instagram.com/a", "Instagram")]);
    const page = html("kontakt", [contact("B", "https://example.com/book", "Broneeri")]);
    expect(home).toContain('href="https://instagram.com/a"');
    expect(home).toContain("Instagram");
    expect(home).not.toContain("example.com/book");
    expect(page).toContain('href="https://example.com/book"');
    expect(page).not.toContain("instagram.com/a");
  });

  it("drops an unsafe contact form button link", () => {
    const markup = html("kontakt", [
      row({
        section_key: "contact",
        section_type: "contact",
        content: { heading: "VÕTA ÜHENDUST", formButtons: [{ label: "Halb", href: "javascript:alert(1)" }] },
        style: { layout: "text-only" },
      }),
    ]);
    expect(markup).not.toContain("javascript:alert");
    expect(markup).not.toContain("Halb");
  });

  it("renders a registration form's own button link", () => {
    const markup = html("kundalini-jooga", [
      row({
        section_key: "practical",
        section_type: "offering_practical_info",
        content: {
          offeringId: SEED_IDS.offerings.kundalini,
          formButtons: [{ label: "Üks Maja", href: "https://yksmaja.ee/events/kundalini" }],
        },
      }),
    ]);
    expect(markup).toContain('href="https://yksmaja.ee/events/kundalini"');
    expect(markup).toContain("Üks Maja");
  });

  it("uses a section heading on the homepage contact and a page heading on /kontakt", () => {
    const section = row({
      section_key: "contact",
      section_type: "contact",
      content: { heading: "VÕTA ÜHENDUST" },
      style: { layout: "text-only", background: "warm" },
    });
    const home = html("avaleht", [section]);
    const page = html("kontakt", [section]);
    expect(home).toContain("<h2");
    expect(home).not.toContain("<h1");
    expect(page).toContain("<h1");
    expect(page.indexOf("vr-form")).toBeLessThan(page.indexOf("vr-contact-details"));
    expect(page).toContain("Miina Laanesaar");
  });
});
