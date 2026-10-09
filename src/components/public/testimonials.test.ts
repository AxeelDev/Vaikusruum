import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Testimonial, TestimonialList } from "@/components/public/Testimonials";
import type { TestimonialWithPhoto } from "@/types/content";

function item(partial: Partial<TestimonialWithPhoto> = {}): TestimonialWithPhoto {
  return {
    id: "t1",
    quote: "Tund aitas mul rahuneda.",
    name: "Mari",
    photo_media_id: "m1",
    show_name: true,
    show_photo: true,
    published: true,
    sort_order: 0,
    created_at: "",
    updated_at: "",
    photo: { storage_path: "people/mari.jpg", alt_text: null },
    ...partial,
  };
}

const render = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

describe("Testimonial", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"));
  afterEach(() => vi.unstubAllEnvs());

  it("shows quote, photo and name, with decorative marks hidden from screen readers", () => {
    const markup = render(createElement(Testimonial, { item: item() }));
    expect(markup).toContain("Tund aitas mul rahuneda.");
    expect(markup).toContain("people/mari.jpg");
    expect(markup).toContain("Mari");
    expect(markup.match(/aria-hidden="true"/g)).toHaveLength(2);
    expect(markup).toContain("„");
    expect(markup).toContain("“");
  });

  it("shows the stand-ins for an empty name and no photo", () => {
    const markup = render(createElement(Testimonial, { item: item({ name: null, photo: null, photo_media_id: null }) }));
    expect(markup).toContain("Joogakäija");
    expect(markup).toContain("/brand/avatar-placeholder.svg");
  });

  it("shows only the name, only the photo, or only the quote", () => {
    const nameOnly = render(createElement(Testimonial, { item: item({ show_photo: false }) }));
    expect(nameOnly).toContain("Mari");
    expect(nameOnly).not.toContain("<img");

    const photoOnly = render(createElement(Testimonial, { item: item({ show_name: false }) }));
    expect(photoOnly).toContain("<img");
    expect(photoOnly).not.toContain("vr-testimonial-name");

    const quoteOnly = render(createElement(Testimonial, { item: item({ show_name: false, show_photo: false }) }));
    expect(quoteOnly).toContain("Tund aitas mul rahuneda.");
    expect(quoteOnly).not.toContain("figcaption");
    expect(quoteOnly).not.toContain("<img");
  });
});

describe("TestimonialList", () => {
  it("hides unpublished testimonials unless asked to show them", () => {
    const items = [item({ id: "a", quote: "Avalik" }), item({ id: "b", quote: "Peidetud", published: false })];
    const pub = render(createElement(TestimonialList, { items }));
    expect(pub).toContain("Avalik");
    expect(pub).not.toContain("Peidetud");
    const editing = render(createElement(TestimonialList, { items, showHidden: true }));
    expect(editing).toContain("Peidetud");
    expect(editing).toContain("vr-editor-hidden");
  });
});
