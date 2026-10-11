import type { EventRow, OfferingRow, PageRow, SiteSettings } from "@/types/content";
import { pageHref } from "@/lib/utils/urls";

/** The brand as search engines should show it; the settings row holds the uppercase wordmark instead. */
export const BRAND = "Vaikusruum";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://vaikusruum.ee").replace(/\/$/, "");
}

/**
 * Used only when a page's SEO title or description is left empty in the editor.
 * Every sentence is taken from the site's own text, only shortened or reordered.
 */
const PAGE_DEFAULTS: Record<string, { title?: string; description?: string }> = {
  avaleht: {
    description:
      "Vaikusruum on kutse aeglustuda, hingata ja olla. Miina Laanesaar – muusik ja joogaõpetaja. Kundalini jooga ja pehme jooga ja lõõgastus Veenuse gongiga Tallinnas, eratunnid kokkuleppel.",
  },
  "kundalini-jooga": {
    description:
      "Kundalini jooga on terviklik joogapraktika, mis ühendab liikumise, hingamise, meditatsiooni ja sügava lõdvestuse. Kolmapäeviti 19:30–21:00, Lauliku lasteaia saal, Kivimäe 17, Tallinn.",
  },
  "pehme-jooga-ja-gong": {
    description:
      "Rahulikud joogalikud liikumised, pehmed venitused ja teadlik hingamine, seejärel sügav lõdvestus Veenuse gongi pehmete helide saatel. 2 x kuus esmaspäeviti, Üksmaja Ladvaruum, Valdeku 66, Tallinn.",
  },
  eratunnid: {
    description:
      "Individuaalne joogatund Miinaga: kundalini jooga, pehme jooga ja gongilõdvestus või individuaaltund rasedale. Eratunni koht ja aeg kokkuleppel.",
  },
  minust: {
    title: "Miina Laanesaar – muusik ja joogaõpetaja",
    description:
      "Miina Laanesaar on muusik ja joogaõpetaja. Pärast Eesti Muusika- ja Teatriakadeemia lõpetamist 2016. aastal läks ta õppima kundalini jooga õpetajaks. Taust ja koolitused.",
  },
  "joogatunni-kkk": {
    description:
      "Kas tund sobib algajale? Kas tund sobib rasedatele? Kui intensiivsed on kundalini jooga tunnid? Mis siis, kui ma ei saa rätsepistes istuda? Vastused joogatunni küsimustele.",
  },
  "hea-teada": {
    description:
      "Grupitunnid on mõeldud alates 14. eluaastast. Jooga toetab üldist heaolu, kuid ei asenda arsti määratud ravi. Mida veel teada enne joogatundi.",
  },
  kontakt: {
    description: "Võta ühendust Miina Laanesaarega – küsimus või registreerumine joogatundi.",
  },
};

export type PageSeo = {
  /** Already complete; render it as an absolute title so the "· Vaikusruum" template is not added twice. */
  absoluteTitle?: string;
  title: string;
  description?: string;
};

export function resolvePageSeo(page: Pick<PageRow, "slug" | "title" | "seo_title" | "seo_description">, ownerName: string | null): PageSeo {
  const defaults = PAGE_DEFAULTS[page.slug] ?? {};
  const title = page.seo_title?.trim() || defaults.title || page.title;
  const description = page.seo_description?.trim() || defaults.description || undefined;

  // The front page title is often just the brand; pair it with the teacher's name instead of repeating the brand.
  if (title.toLowerCase() === BRAND.toLowerCase()) {
    const absoluteTitle = ownerName ? `${BRAND} – ${ownerName} · jooga ja gong Tallinnas` : BRAND;
    return { absoluteTitle, title: absoluteTitle, description };
  }
  if (title.toLowerCase().includes(BRAND.toLowerCase())) return { absoluteTitle: title, title, description };
  return { title, description };
}

type JsonLd = Record<string, unknown>;

type StructuredDataInput = {
  page: Pick<PageRow, "slug" | "title">;
  seo: PageSeo;
  settings: Pick<SiteSettings, "contact_name" | "contact_email" | "contact_phone" | "social">;
  /** Classes whose own page this is, with their upcoming dates. */
  offerings: { offering: Pick<OfferingRow, "title" | "location_name" | "address">; events: Pick<EventRow, "id" | "starts_at" | "ends_at">[] }[];
};

function postalAddress(address: string): JsonLd {
  // Stored as "Kivimäe 17, Tallinn".
  const comma = address.lastIndexOf(",");
  const street = comma > 0 ? address.slice(0, comma).trim() : address.trim();
  const locality = comma > 0 ? address.slice(comma + 1).trim() : undefined;
  return { "@type": "PostalAddress", streetAddress: street, addressLocality: locality, addressCountry: "EE" };
}

/** schema.org graph telling search engines that Vaikusruum is Miina Laanesaar's yoga practice in Tallinn. */
export function buildStructuredData({ page, seo, settings, offerings }: StructuredDataInput): JsonLd {
  const base = siteUrl();
  const url = `${base}${pageHref(page.slug)}`;
  const orgId = `${base}/#organization`;
  const personId = `${base}/#person`;
  const websiteId = `${base}/#website`;
  // Profiles only: the Stebby link is a payment page, not another presence of the studio.
  const sameAs = Object.entries(settings.social ?? {})
    .filter(([key]) => key !== "stebby")
    .map(([, link]) => link)
    .filter((link): link is string => typeof link === "string" && link.length > 0);
  const owner = settings.contact_name;

  const graph: JsonLd[] = [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: `${base}/`,
      name: BRAND,
      inLanguage: "et",
      publisher: { "@id": orgId },
    },
    {
      "@type": "Organization",
      "@id": orgId,
      name: BRAND,
      url: `${base}/`,
      logo: `${base}/brand/logo-vaikusruum.png`,
      description: "Vaikusruum on kutse aeglustuda, hingata ja olla.",
      areaServed: { "@type": "City", name: "Tallinn" },
      email: settings.contact_email ?? undefined,
      telephone: settings.contact_phone ?? undefined,
      founder: owner ? { "@id": personId } : undefined,
      sameAs: sameAs.length ? sameAs : undefined,
    },
  ];

  if (owner) {
    graph.push({
      "@type": "Person",
      "@id": personId,
      name: owner,
      url: `${base}/minust`,
      jobTitle: "Muusik ja joogaõpetaja",
      worksFor: { "@id": orgId },
      alumniOf: { "@type": "CollegeOrUniversity", name: "Eesti Muusika- ja Teatriakadeemia" },
      knowsAbout: ["Kundalini jooga", "Rasedatejooga", "Gongimäng", "Yin-jooga", "Viiul"],
      email: settings.contact_email ?? undefined,
      telephone: settings.contact_phone ?? undefined,
    });
  }

  graph.push({
    "@type": page.slug === "minust" && owner ? "ProfilePage" : "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: seo.absoluteTitle ?? `${seo.title} · ${BRAND}`,
    description: seo.description,
    inLanguage: "et",
    isPartOf: { "@id": websiteId },
    about: { "@id": orgId },
    mainEntity: page.slug === "minust" && owner ? { "@id": personId } : undefined,
    breadcrumb:
      page.slug === "avaleht"
        ? undefined
        : {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: BRAND, item: `${base}/` },
              { "@type": "ListItem", position: 2, name: page.title, item: url },
            ],
          },
  });

  for (const { offering, events } of offerings) {
    if (!offering.address) continue;
    for (const event of events) {
      if (!event.starts_at) continue;
      graph.push({
        "@type": "Event",
        "@id": `${url}#event-${event.id}`,
        name: `${offering.title} – ${BRAND}`,
        description: seo.description,
        url,
        image: `${base}/opengraph-image.png`,
        startDate: event.starts_at,
        endDate: event.ends_at ?? undefined,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        inLanguage: "et",
        location: {
          "@type": "Place",
          name: offering.location_name ?? offering.address,
          address: postalAddress(offering.address),
        },
        organizer: { "@id": orgId },
        performer: owner ? { "@id": personId } : undefined,
      });
    }
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so CMS text cannot close the tag. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
