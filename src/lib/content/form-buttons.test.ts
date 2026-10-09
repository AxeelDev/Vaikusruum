import { describe, expect, it } from "vitest";
import { linkButtonError, readButtonLinks, visibleLinkButtons, writeButtonLinks } from "@/lib/content/form-buttons";
import type { SectionRow } from "@/types/content";

function section(content: Record<string, unknown>): SectionRow {
  return {
    id: "s1",
    page_id: "p1",
    section_key: "contact",
    section_type: "contact",
    sort_order: 1,
    enabled: true,
    content,
    style: {},
    created_at: "",
    updated_at: "",
  };
}

describe("form button links", () => {
  it("keeps each form's links on that section", () => {
    const home = readButtonLinks({ formButtons: [{ label: "Instagram", href: "https://instagram.com/a" }] }, "form");
    const contact = readButtonLinks({ formButtons: [{ label: "Broneeri", href: "/kontakt" }] }, "formButtons");
    expect(home).toEqual([{ label: "Instagram", href: "https://instagram.com/a" }]);
    expect(contact).toEqual([{ label: "Broneeri", href: "/kontakt" }]);
  });

  it("writes registration links without touching the rest of the section", () => {
    const next = writeButtonLinks(
      section({ heading: "VÕTA ÜHENDUST", formButtons: [] }),
      "form",
      [{ label: "Üks Maja", href: "https://yksmaja.ee/events/1" }],
    );
    expect(next.content.heading).toBe("VÕTA ÜHENDUST");
    expect(next.content.formButtons).toEqual([{ label: "Üks Maja", href: "https://yksmaja.ee/events/1" }]);
  });

  it("keeps a form element's other settings when its buttons change", () => {
    const next = writeButtonLinks(
      section({ "custom.form.ab": { kind: "contact", submitLabel: "Saada", successText: "Aitäh." } }),
      "custom.form.ab",
      [{ label: "Kaart", href: "https://maps.example/a" }],
    );
    expect(next.content["custom.form.ab"]).toMatchObject({
      kind: "contact",
      submitLabel: "Saada",
      successText: "Aitäh.",
      buttons: [{ label: "Kaart", href: "https://maps.example/a" }],
    });
  });

  it("hides empty and unsafe links on the public page", () => {
    const buttons = [
      { label: "OK", href: "https://example.com" },
      { label: "Halb", href: "javascript:alert(1)" },
      { label: "Tühi", href: "" },
    ];
    expect(visibleLinkButtons(buttons, false)).toEqual([{ label: "OK", href: "https://example.com" }]);
    expect(visibleLinkButtons(buttons, true).map((item) => item.label)).toEqual(["OK", "Halb", "Tühi"]);
    expect(linkButtonError("javascript:alert(1)")).toBeTruthy();
    expect(linkButtonError("/kontakt")).toBeNull();
  });
});
