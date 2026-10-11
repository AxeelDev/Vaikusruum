import { describe, expect, it } from "vitest";
import { buildStructuredData, resolvePageSeo, serializeJsonLd } from "@/lib/seo/site";

const page = (slug: string, title: string, seo_title: string | null = null, seo_description: string | null = null) => ({
  slug,
  title,
  seo_title,
  seo_description,
});

describe("resolvePageSeo", () => {
  it("pairs a brand-only front page title with the owner's name instead of repeating the brand", () => {
    const seo = resolvePageSeo(page("avaleht", "Avaleht", "Vaikusruum"), "Miina Laanesaar");
    expect(seo.absoluteTitle).toBe("Vaikusruum – Miina Laanesaar · jooga ja gong Tallinnas");
  });

  it("keeps the brand alone when no owner name is set", () => {
    expect(resolvePageSeo(page("avaleht", "Avaleht", "Vaikusruum"), null).absoluteTitle).toBe("Vaikusruum");
  });

  it("does not add the brand template to a title that already contains it", () => {
    expect(resolvePageSeo(page("kontakt", "Kontakt", "Kontakt · Vaikusruum"), null).absoluteTitle).toBe("Kontakt · Vaikusruum");
  });

  it("prefers the editor's SEO fields over the built-in defaults", () => {
    const seo = resolvePageSeo(page("minust", "Minust", "Minu lugu", "Oma kirjeldus"), "Miina Laanesaar");
    expect(seo).toEqual({ title: "Minu lugu", description: "Oma kirjeldus" });
  });

  it("falls back to a default when the editor fields are empty", () => {
    const seo = resolvePageSeo(page("minust", "Minust", null, "  "), "Miina Laanesaar");
    expect(seo.title).toBe("Miina Laanesaar – muusik ja joogaõpetaja");
    expect(seo.description).toContain("Miina Laanesaar");
  });

  it("uses the page title for a page without defaults", () => {
    expect(resolvePageSeo(page("uus-leht", "Uus leht"), null)).toEqual({ title: "Uus leht", description: undefined });
  });
});

describe("buildStructuredData", () => {
  const settings = { contact_name: "Miina Laanesaar", contact_email: "a@b.ee", contact_phone: "+372 1", social: {} };

  it("links the site, the brand and the owner", () => {
    const data = buildStructuredData({ page: page("minust", "Minust"), seo: { title: "Minust" }, settings, offerings: [] });
    const graph = data["@graph"] as Record<string, unknown>[];
    const types = graph.map((node) => node["@type"]);
    expect(types).toEqual(["WebSite", "Organization", "Person", "ProfilePage"]);
    const org = graph[1];
    expect(org.founder).toEqual({ "@id": graph[2]["@id"] });
    expect(graph[2].name).toBe("Miina Laanesaar");
    expect(graph[3].mainEntity).toEqual({ "@id": graph[2]["@id"] });
  });

  it("lists upcoming class dates as events with a postal address", () => {
    const data = buildStructuredData({
      page: page("kundalini-jooga", "Kundalini jooga"),
      seo: { title: "Kundalini jooga" },
      settings,
      offerings: [
        {
          offering: { title: "Kundalini jooga", location_name: "Lauliku lasteaia saal", address: "Kivimäe 17, Tallinn" },
          events: [
            { id: "e1", starts_at: "2026-10-21T16:30:00+00:00", ends_at: "2026-10-21T18:00:00+00:00" },
            { id: "e2", starts_at: null, ends_at: null },
          ],
        },
      ],
    });
    const events = (data["@graph"] as Record<string, unknown>[]).filter((node) => node["@type"] === "Event");
    expect(events).toHaveLength(1);
    expect(events[0].startDate).toBe("2026-10-21T16:30:00+00:00");
    expect((events[0].location as { address: unknown }).address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Kivimäe 17",
      addressLocality: "Tallinn",
      addressCountry: "EE",
    });
  });

  it("leaves out the person when no owner name is set", () => {
    const data = buildStructuredData({ page: page("avaleht", "Avaleht"), seo: { title: "Vaikusruum" }, settings: { ...settings, contact_name: null }, offerings: [] });
    expect((data["@graph"] as Record<string, unknown>[]).some((node) => node["@type"] === "Person")).toBe(false);
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so text cannot close the script tag", () => {
    expect(serializeJsonLd({ name: "</script><b>" })).not.toContain("<");
  });
});
