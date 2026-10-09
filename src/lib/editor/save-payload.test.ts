import { describe, expect, it } from "vitest";
import { diffDraft, hasChanges } from "@/lib/editor/save-payload";
import type { EditorDraft } from "@/lib/editor/types";

const PAGE = "11111111-1111-4111-8111-111111111111";
const OFFER = "22222222-2222-4222-8222-222222222222";

function draft(): EditorDraft {
  return {
    pages: [
      { id: PAGE, slug: "minust", title: "Minust", nav_label: "Minust", show_in_nav: true, nav_order: 1, is_published: true, seo_title: null, seo_description: null },
      { id: "p2", slug: "tagasiside", title: "Tagasiside", nav_label: null, show_in_nav: false, nav_order: 2, is_published: false, seo_title: null, seo_description: null },
    ],
    sectionsByPage: {
      [PAGE]: [{ id: "s1", page_id: PAGE, section_key: "bio", section_type: "rich_text", sort_order: 1, enabled: true, content: { a: 1, b: 2 }, style: {} }],
    },
    offerings: {},
    eventsByOffering: {
      [OFFER]: [
        { id: "e1", offering_id: OFFER, starts_at: "2026-11-02T17:00:00Z", ends_at: null, display_date: null, sort_order: 0, active: true },
        { id: "e2", offering_id: OFFER, starts_at: "2026-11-23T17:00:00Z", ends_at: null, display_date: null, sort_order: 1, active: true },
      ],
    },
    media: {},
    settings: { id: 1, site_name: "Vaikusruum", social: {} },
    theme: { headingColor: "#5C1836" },
    customCss: "",
    deletedSectionIds: [],
  } as unknown as EditorDraft;
}

describe("diffDraft", () => {
  it("sends nothing when nothing changed, even if key order differs", () => {
    const saved = draft();
    const next = draft();
    next.sectionsByPage[PAGE][0].content = { b: 2, a: 1 };
    expect(hasChanges(diffDraft(saved, next, "owner"))).toBe(false);
  });

  it("sends only the page that changed, as a full row", () => {
    const next = draft();
    next.pages[0] = { ...next.pages[0], title: "Minust uus" };
    const changes = diffDraft(draft(), next, "owner");
    expect(Object.keys(changes)).toEqual(["pages"]);
    expect(changes.pages).toHaveLength(1);
    expect(changes.pages?.[0]).toMatchObject({ id: PAGE, title: "Minust uus", is_published: true, slug: "minust" });
  });

  it("reports added, edited and removed dates", () => {
    const next = draft();
    next.eventsByOffering[OFFER] = [
      { ...next.eventsByOffering[OFFER][0], starts_at: "2026-11-09T17:00:00Z" },
      { id: "e3", offering_id: OFFER, starts_at: "2026-12-07T17:00:00Z", ends_at: null, display_date: null, sort_order: 2, active: true },
    ];
    const changes = diffDraft(draft(), next, "owner");
    expect(changes.events?.map((e) => e.id)).toEqual(["e1", "e3"]);
    expect(changes.deletedEventIds).toEqual(["e2"]);
  });

  it("never sends custom CSS for an editor", () => {
    const next = draft();
    next.customCss = "body { color: red }";
    expect(diffDraft(draft(), next, "editor").customCss).toBeUndefined();
    expect(diffDraft(draft(), next, "owner").customCss).toBe("body { color: red }");
  });

  it("sends the contact details when one is edited in place, and only then", () => {
    expect(diffDraft(draft(), draft(), "editor").settings).toBeUndefined();
    const next = draft();
    next.settings = { ...next.settings, company_name: "Kõlavõlu OÜ", iban: "EE827700771002774537" };
    const changes = diffDraft(draft(), next, "editor");
    expect(Object.keys(changes)).toEqual(["settings"]);
    expect(changes.settings).toMatchObject({ company_name: "Kõlavõlu OÜ", iban: "EE827700771002774537", contact_name: null, bank: null });
  });
});
