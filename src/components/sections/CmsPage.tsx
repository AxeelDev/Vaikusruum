import { SiteView } from "@/components/site/SiteView";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  collectMediaIds,
  getEventsForOffering,
  getLessonOptions,
  getMediaByIds,
  getNavItems,
  getOfferingsByIds,
  getPageLabel,
  getPublishedPage,
  getPublishedTestimonials,
  getSiteSettings,
  getTheme,
} from "@/lib/content/queries";
import { upcomingEventsNow } from "@/lib/content/events";
import { listLayoutElements } from "@/lib/editor/layout-tree";
import { pageHref } from "@/lib/utils/urls";
import { BRAND, buildStructuredData, resolvePageSeo, serializeJsonLd } from "@/lib/seo/site";
import type { EventRow, OfferingRow } from "@/types/content";

export async function generateCmsMetadata(slug: string): Promise<Metadata> {
  const [data, settings] = await Promise.all([getPublishedPage(slug), getSiteSettings()]);
  if (!data) return {};
  const seo = resolvePageSeo(data.page, settings.contact_name);
  const path = pageHref(slug);
  return {
    title: seo.absoluteTitle ? { absolute: seo.absoluteTitle } : seo.title,
    description: seo.description,
    alternates: { canonical: path },
    // A page's openGraph replaces the site-wide one rather than merging, so repeat the shared parts here.
    openGraph: {
      title: seo.absoluteTitle ?? seo.title,
      description: seo.description,
      siteName: BRAND,
      locale: "et_EE",
      type: slug === "minust" ? "profile" : "website",
      url: path,
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: BRAND }],
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

  // Only pages with a contact form need the list of classes it offers.
  const hasForm = data.sections.some((section) => section.section_type === "contact" || listLayoutElements(section).some((node) => node.elementType === "form"));

  const hasTestimonials = data.sections.some((section) => section.section_type === "testimonials");

  const [offeringRows, media, settings, theme, nav, lessonOptions, testimonials, privacyLabel] = await Promise.all([
    getOfferingsByIds(offeringIds),
    getMediaByIds(collectMediaIds(data.sections)),
    getSiteSettings(),
    getTheme(),
    getNavItems(),
    hasForm ? getLessonOptions() : Promise.resolve(undefined),
    hasTestimonials ? getPublishedTestimonials() : Promise.resolve(undefined),
    getPageLabel("privaatsus"),
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

  // Dates are listed as events only on the class's own page, not wherever the class is linked from.
  const structuredData = buildStructuredData({
    page: data.page,
    seo: resolvePageSeo(data.page, settings.contact_name),
    settings,
    offerings: offeringRows
      .filter((offering) => offering.slug === data.page.slug)
      .map((offering) => ({ offering, events: eventsByOffering[offering.id] ?? [] })),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
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
        lessonOptions={lessonOptions}
        testimonials={testimonials}
        privacy={{ label: privacyLabel ?? "Privaatsus" }}
        pageTitleStyle={theme.pageTitleStyle}
      />
    </>
  );
}
