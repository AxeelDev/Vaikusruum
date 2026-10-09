import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactForm } from "@/components/forms/ContactForm";
import { buildLessonOptions } from "@/lib/content/lesson-options";
import { DEFAULT_PRIVATE_LESSONS } from "@/lib/content/private-lessons";

const options = buildLessonOptions(
  [{ id: "o1", slug: "kundalini-jooga", title: "Kundalini jooga", short_title: "Kundalini jooga" }],
  DEFAULT_PRIVATE_LESSONS,
);

/** The radio input with this name and value, as rendered. */
function radio(markup: string, name: string, value: string) {
  return markup.match(new RegExp(`<input[^>]*name="${name}"[^>]*value="${value}"[^>]*/>`))?.[0] ?? "";
}

describe("ContactForm topic picker", () => {
  it("offers Küsimus and Eratund as a radio group, not a select", () => {
    const markup = renderToStaticMarkup(createElement(ContactForm, { lessonOptions: options }));
    expect(markup).not.toContain("<select");
    expect(markup).toContain("<fieldset");
    expect(radio(markup, "kind", "contact")).toContain("checked");
    expect(radio(markup, "kind", "private_lesson")).not.toContain("checked");
    expect(markup).toContain("Küsimus");
    expect(markup).toContain("Eratund");
    // The class list only appears once Eratund is chosen.
    expect(markup).not.toContain("Milline tund?");
  });

  it("asks which class when the form is for private lessons, listing each once with 'Pole veel kindel' last", () => {
    const markup = renderToStaticMarkup(createElement(ContactForm, { kind: "private_lesson", lessonOptions: options }));
    expect(markup).toContain("Milline tund?");
    const labels = [...markup.matchAll(/name="lesson"[^>]*\/><span>([^<]+)<\/span>/g)].map((match) => match[1]);
    expect(labels).toEqual(["Kundalini jooga", "Pehme jooga ja gongilõdvestus", "Individuaaltund rasedale", "Pole veel kindel"]);
    expect(radio(markup, "kind", "private_lesson")).toContain("checked");
    expect(radio(markup, "lesson", "pole-kindel")).toContain("checked");
    expect(radio(markup, "lesson", "kundalini-jooga")).not.toContain("checked");
  });

  it("has no topic picker for a registration form", () => {
    const markup = renderToStaticMarkup(createElement(ContactForm, { kind: "registration", showKindSelect: false, lessonOptions: options }));
    expect(markup).not.toContain('name="kind"');
    expect(markup).not.toContain("Milline tund?");
  });
});
