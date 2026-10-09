import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SectionList } from "@/components/sections/SectionList";
import type { SectionRow, SiteSettings, TestimonialWithPhoto } from "@/types/content";

const settings = { id: 1, site_name: "Vaikusruum", social: {}, footer_text: null } as unknown as SiteSettings;

const section: SectionRow = {
  id: "s1",
  page_id: "p1",
  section_key: "list",
  section_type: "testimonials",
  sort_order: 1,
  enabled: true,
  content: { items: [] },
  style: {},
  created_at: "",
  updated_at: "",
};

function testimonial(partial: Partial<TestimonialWithPhoto>): TestimonialWithPhoto {
  return {
    id: "t",
    quote: "Tsitaat",
    name: "Mari",
    photo_media_id: null,
    show_name: true,
    show_photo: false,
    published: true,
    sort_order: 0,
    created_at: "",
    updated_at: "",
    photo: null,
    ...partial,
  };
}

function html(testimonials: TestimonialWithPhoto[]) {
  return renderToStaticMarkup(
    createElement(SectionList, {
      slug: "tagasiside",
      sections: [section],
      offerings: {},
      eventsByOffering: {},
      media: {},
      settings,
      themeDensity: "none",
      testimonials,
    }),
  );
}

describe("testimonials section", () => {
  it("shows published testimonials in the given order and hides unpublished ones", () => {
    const markup = html([
      testimonial({ id: "a", quote: "Esimene" }),
      testimonial({ id: "b", quote: "Peidetud", published: false }),
      testimonial({ id: "c", quote: "Kolmas" }),
    ]);
    expect(markup.indexOf("Esimene")).toBeGreaterThan(-1);
    expect(markup.indexOf("Kolmas")).toBeGreaterThan(markup.indexOf("Esimene"));
    expect(markup).not.toContain("Peidetud");
  });

  it("renders no empty section on the public page when there is nothing to show", () => {
    expect(html([])).toBe("");
    expect(html([testimonial({ published: false })])).toBe("");
  });
});
