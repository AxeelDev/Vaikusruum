import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SectionList } from "@/components/sections/SectionList";
import {
  collectMediaIds,
  getEventsForOffering,
  getMediaByIds,
  getOfferingsByIds,
  getPublishedPage,
  getSiteSettings,
  getTheme,
} from "@/lib/content/queries";
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
    openGraph: { title, description, locale: "et_EE", type: "website" },
  };
}

export async function CmsPage({ slug, teema }: { slug: string; teema?: string }) {
  const data = await getPublishedPage(slug);
  if (!data) notFound();

  const offeringIds = data.sections.flatMap((section) => {
    const ids: string[] = [];
    if (typeof section.content.offeringId === "string") ids.push(section.content.offeringId);
    if (Array.isArray(section.content.offeringIds)) ids.push(...(section.content.offeringIds as string[]));
    return ids;
  });

  const [offeringRows, media, settings, theme] = await Promise.all([
    getOfferingsByIds(offeringIds),
    getMediaByIds(collectMediaIds(data.sections)),
    getSiteSettings(),
    getTheme(),
  ]);

  const offerings: Record<string, OfferingRow> = {};
  for (const row of offeringRows) offerings[row.id] = row;

  const eventsByOffering: Record<string, EventRow[]> = {};
  await Promise.all(
    offeringRows.map(async (offering) => {
      eventsByOffering[offering.id] = await getEventsForOffering(offering.id);
    }),
  );

  const sections =
    slug === "kontakt" && teema === "eratund"
      ? data.sections.map((section) =>
          section.section_type === "contact"
            ? { ...section, content: { ...section.content, defaultKind: "private_lesson" } }
            : section,
        )
      : data.sections;

  return (
    <>
      {slug !== "avaleht" && slug !== "kontakt" ? (
        <section className="vr-section vr-section--compact">
          <div className="vr-centered">
            <h1 className="vr-page-title">{data.page.title}</h1>
          </div>
        </section>
      ) : null}
      <SectionList
        sections={sections}
        offerings={offerings}
        eventsByOffering={eventsByOffering}
        media={media}
        settings={settings}
        themeDensity={theme.specksDensity}
      />
    </>
  );
}
