import { SiteView } from "@/components/site/SiteView";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  collectMediaIds,
  getEventsForOffering,
  getMediaByIds,
  getNavItems,
  getOfferingsByIds,
  getPublishedPage,
  getSiteSettings,
  getTheme,
} from "@/lib/content/queries";
import { upcomingEventsNow } from "@/lib/content/events";
import { pageHref } from "@/lib/utils/urls";
import type { EventRow, OfferingRow } from "@/types/content";

export async function generateCmsMetadata(slug: string): Promise<Metadata> {
  const data = await getPublishedPage(slug);
  if (!data) return {};
  const title = data.page.seo_title || data.page.title;
  const description = data.page.seo_description || undefined;
  return {
    title,
    description,
    alternates: { canonical: slug === "avaleht" ? "/" : `/${slug}` },
    // A page's openGraph replaces the site-wide one rather than merging, so repeat the shared parts here.
    openGraph: {
      title,
      description,
      siteName: "Vaikusruum",
      locale: "et_EE",
      type: "website",
      url: slug === "avaleht" ? "/" : `/${slug}`,
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Vaikusruum" }],
    },
  };
}

export async function CmsPage({ slug }: { slug: string }) {
  const data = await getPublishedPage(slug);
  if (!data) notFound();

  const offeringIds = data.sections.flatMap((section) => {
    const ids: string[] = [];
    if (typeof section.content.offeringId === "string") ids.push(section.content.offeringId);
    if (Array.isArray(section.content.offeringIds)) ids.push(...(section.content.offeringIds as string[]));
    return ids;
  });

  const [offeringRows, media, settings, theme, nav] = await Promise.all([
    getOfferingsByIds(offeringIds),
    getMediaByIds(collectMediaIds(data.sections)),
    getSiteSettings(),
    getTheme(),
    getNavItems(),
  ]);

  const offerings: Record<string, OfferingRow> = {};
  for (const row of offeringRows) offerings[row.id] = row;

  // Past classes drop off the page; cached pages refresh hourly, so a finished date disappears within the hour.
  const eventsByOffering: Record<string, EventRow[]> = {};
  await Promise.all(
    offeringRows.map(async (offering) => {
      eventsByOffering[offering.id] = upcomingEventsNow(await getEventsForOffering(offering.id));
    }),
  );

  const sections = data.sections;

  return (
    <SiteView
      page={data.page}
      sections={sections}
      offerings={offerings}
      eventsByOffering={eventsByOffering}
      media={media}
      settings={settings}
      nav={nav.length ? nav : [{ href: pageHref(data.page.slug), label: data.page.nav_label || data.page.title, slug: data.page.slug }]}
      themeDensity={theme.specksDensity}
      headerSticky={theme.headerSticky}
    />
  );
}
