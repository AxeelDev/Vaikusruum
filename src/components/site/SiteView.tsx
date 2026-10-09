"use client";

import Link from "next/link";

import { PublicHeader } from "@/components/public/PublicHeader";
import { SectionList } from "@/components/sections/SectionList";
import { EditableText } from "@/components/site/Editable";
import type { LessonOption } from "@/lib/content/lesson-options";
import { pageHref } from "@/lib/utils/urls";
import type { EventRow, MediaRow, OfferingRow, PageRow, SectionRow, SiteSettings, TestimonialWithPhoto } from "@/types/content";

export function SiteView({
  page,
  sections,
  offerings,
  eventsByOffering,
  media,
  settings,
  nav,
  themeDensity,
  headerSticky = true,
  lessonOptions,
  testimonials,
}: {
  page: PageRow;
  sections: SectionRow[];
  offerings: Record<string, OfferingRow>;
  eventsByOffering: Record<string, EventRow[]>;
  media: Record<string, MediaRow>;
  settings: SiteSettings;
  nav: { href: string; label: string; slug: string }[];
  themeDensity: string;
  headerSticky?: boolean;
  lessonOptions?: LessonOption[];
  testimonials?: TestimonialWithPhoto[];
}) {
  const showTitle = page.slug !== "avaleht" && page.slug !== "kontakt";

  return (
    <div className="vr-site" data-header-sticky={headerSticky ? "true" : "false"}>
      <PublicHeader items={nav} siteName={settings.site_name} currentHref={pageHref(page.slug)} />
      <main className="vr-main">
        {showTitle ? (
          <section className="vr-page-heading">
            <div className="vr-section-inner">
              <div className="vr-reading">
                <EditableText
                  as="h1"
                  className="vr-page-title"
                  selection={{ id: `${page.slug}.title`, type: "text", field: "title" }}
                  path={{ kind: "page-title", pageId: page.id }}
                  value={page.title}
                />
              </div>
            </div>
          </section>
        ) : null}
        <SectionList
          slug={page.slug}
          sections={sections}
          offerings={offerings}
          eventsByOffering={eventsByOffering}
          media={media}
          settings={settings}
          themeDensity={themeDensity}
          lessonOptions={lessonOptions}
          testimonials={testimonials}
        />
      </main>
      <footer className="vr-footer">
        <EditableText
          as="p"
          selection={{ id: "footer.text", type: "text", field: "footer_text" }}
          path={{ kind: "settings", key: "footer_text" }}
          value={settings.footer_text ?? settings.site_name}
        />
        <p className="vr-footer-links">
          <Link href="/privaatsus">Privaatsus</Link>
        </p>
      </footer>
    </div>
  );
}
