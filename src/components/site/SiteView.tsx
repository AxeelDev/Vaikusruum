"use client";

import { PublicHeader } from "@/components/public/PublicHeader";
import { SectionList } from "@/components/sections/SectionList";
import { EditableText } from "@/components/site/Editable";
import { pageHref } from "@/lib/utils/urls";
import type { EventRow, MediaRow, OfferingRow, PageRow, SectionRow, SiteSettings } from "@/types/content";

export function SiteView({
  page,
  sections,
  offerings,
  eventsByOffering,
  media,
  settings,
  nav,
  themeDensity,
}: {
  page: PageRow;
  sections: SectionRow[];
  offerings: Record<string, OfferingRow>;
  eventsByOffering: Record<string, EventRow[]>;
  media: Record<string, MediaRow>;
  settings: SiteSettings;
  nav: { href: string; label: string; slug: string }[];
  themeDensity: string;
}) {
  const showTitle = page.slug !== "avaleht" && page.slug !== "kontakt";

  return (
    <div className="vr-site">
      <PublicHeader items={nav} siteName={settings.site_name} currentHref={pageHref(page.slug)} />
      <main className="vr-main">
        {showTitle ? (
          <section className="vr-section vr-screen-section vr-screen-section--auto vr-page-heading">
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
        />
      </main>
      <footer className="vr-footer">
        <EditableText
          as="p"
          selection={{ id: "footer.text", type: "text", field: "footer_text" }}
          path={{ kind: "settings", key: "footer_text" }}
          value={settings.footer_text ?? settings.site_name}
        />
      </footer>
    </div>
  );
}
