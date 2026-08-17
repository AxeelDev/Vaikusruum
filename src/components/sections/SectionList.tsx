import Link from "next/link";
import { Emblem } from "@/components/public/Emblem";
import { RichText } from "@/components/public/RichText";
import { SiteImage } from "@/components/public/SiteImage";
import { Specks } from "@/components/public/Specks";
import { ContactForm } from "@/components/forms/ContactForm";
import { RegistrationBlock } from "@/components/forms/RegistrationBlock";
import { pageHref } from "@/lib/content/queries";
import { docHasText } from "@/lib/content/rich-text";
import type { EventRow, MediaRow, OfferingRow, SectionRow, SiteSettings } from "@/types/content";

function sectionClass(section: SectionRow): string {
  const bg = section.style?.background;
  const min = section.style?.minHeight;
  const parts = ["vr-section"];
  if (bg === "warm") parts.push("vr-section--warm");
  if (bg === "soft") parts.push("vr-section--soft");
  if (min === "viewport" || section.section_type === "hero") parts.push("vr-section--hero");
  if (min === "compact") parts.push("vr-section--compact");
  return parts.join(" ");
}

function splitClass(section: SectionRow, hasMedia: boolean): string {
  const layout = section.style?.layout;
  const mobile = section.style?.mobileOrder;
  const parts = ["vr-split"];
  if (section.style?.verticalAlign === "start") parts.push("vr-split--start");
  if (layout === "image-right" || (!layout && hasMedia)) parts.push("vr-split--image-right");
  if (mobile === "text-first") parts.push("vr-split--text-first");
  return parts.join(" ");
}

export function SectionList({
  sections,
  offerings,
  eventsByOffering,
  media,
  settings,
  themeDensity,
}: {
  sections: SectionRow[];
  offerings: Record<string, OfferingRow>;
  eventsByOffering: Record<string, EventRow[]>;
  media: Record<string, MediaRow>;
  settings: SiteSettings;
  themeDensity: string;
}) {
  return (
    <>
      {sections.map((section) => (
        <SectionView
          key={section.id}
          section={section}
          offerings={offerings}
          eventsByOffering={eventsByOffering}
          media={media}
          settings={settings}
          themeDensity={themeDensity}
        />
      ))}
    </>
  );
}

function SectionView({
  section,
  offerings,
  eventsByOffering,
  media,
  settings,
  themeDensity,
}: {
  section: SectionRow;
  offerings: Record<string, OfferingRow>;
  eventsByOffering: Record<string, EventRow[]>;
  media: Record<string, MediaRow>;
  settings: SiteSettings;
  themeDensity: string;
}) {
  const specksOn = section.style?.specks !== false;
  const mediaId = (section.style?.mediaId || section.content.mediaId) as string | undefined;
  const image = mediaId ? media[mediaId] : undefined;
  const layout = section.style?.layout;

  if (section.section_type === "spacer") {
    return <div className="vr-section vr-section--compact" aria-hidden="true" />;
  }

  if (section.section_type === "hero") {
    const intro = String(section.content.intro ?? "");
    const showEmblem = section.content.showEmblem !== false;
    return (
      <section className={`${sectionClass(section)} vr-section--hero`}>
        {specksOn ? <Specks density={themeDensity} /> : null}
        <div className="vr-split">
          <div className="vr-split-text">
            <div className="vr-hero-copy">
              <h1 className="vr-wordmark vr-wordmark--hero">VAIKUSRUUM</h1>
              <div className="vr-body">
                {intro.split("\n").map((line, i) => (
                  <p key={i}>{line || "\u00a0"}</p>
                ))}
              </div>
            </div>
          </div>
          {showEmblem || image ? (
            <div className="vr-split-media">
              {image ? <SiteImage media={image} /> : <Emblem />}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (section.section_type === "split_media_text" || section.section_type === "rich_text") {
    const heading = typeof section.content.heading === "string" ? section.content.heading : "";
    const body = section.content.body ?? section.content.text;
    const textOnly = layout === "text-only" || layout === "centered" || (!image && layout !== "image-only");
    const hasMedia = Boolean(image) && layout !== "text-only" && layout !== "centered";

    if (layout === "image-only" && image) {
      return (
        <section className={sectionClass(section)}>
          {specksOn ? <Specks density={themeDensity} /> : null}
          <div className="vr-centered">
            <SiteImage media={image} />
          </div>
        </section>
      );
    }

    const text = (
      <div className={layout === "centered" || textOnly ? "vr-centered vr-body" : "vr-narrow vr-body"}>
        {heading ? <h2 className="vr-heading">{heading}</h2> : null}
        {section.section_type === "split_media_text" && typeof section.content.plain === "string" ? (
          <div className="vr-body">
            {section.content.plain.split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <RichText value={body} />
        )}
      </div>
    );

    if (!hasMedia) {
      return (
        <section className={sectionClass(section)}>
          {specksOn ? <Specks density={themeDensity} /> : null}
          {text}
        </section>
      );
    }

    return (
      <section className={sectionClass(section)}>
        {specksOn ? <Specks density={themeDensity} /> : null}
        <div className={splitClass(section, true)}>
          <div className="vr-split-media">
            <SiteImage media={image!} className="vr-photo vr-photo--portrait" />
          </div>
          <div className="vr-split-text">{text}</div>
        </div>
      </section>
    );
  }

  if (section.section_type === "offering_overview") {
    const ids = Array.isArray(section.content.offeringIds) ? (section.content.offeringIds as string[]) : [];
    const label = String(section.content.moreInfoLabel ?? "rohkem infot");
    const listed = ids.map((id) => offerings[id]).filter(Boolean);
    const hasMedia = Boolean(image);
    const list = (
      <div className={hasMedia ? "vr-split-text" : "vr-centered"}>
        {listed.map((offering) => (
          <article key={offering.id} className="vr-offering">
            <h2 className="vr-heading">{offering.short_title || offering.title}</h2>
            {offering.schedule_summary ? <p>{offering.schedule_summary}</p> : null}
            {offering.location_name ? <p>{offering.location_name}</p> : null}
            {offering.address ? <p>{offering.address}</p> : null}
            <p>
              <Link className="vr-text-link" href={pageHref(offering.slug)}>
                {label}
              </Link>
            </p>
          </article>
        ))}
      </div>
    );
    return (
      <section className={sectionClass(section)}>
        {specksOn ? <Specks density={themeDensity} /> : null}
        {hasMedia ? (
          <div className={splitClass(section, true)}>
            {list}
            <div className="vr-split-media">
              <SiteImage media={image!} />
            </div>
          </div>
        ) : (
          list
        )}
      </section>
    );
  }

  if (section.section_type === "private_lessons") {
    const label = String(section.content.label ?? "Eratunnid kokkuleppel");
    const action = String(section.content.actionLabel ?? "Võta ühendust");
    return (
      <section className={sectionClass(section)}>
        {specksOn ? <Specks density={themeDensity} /> : null}
        <div className="vr-centered vr-private">
          <p className="vr-heading">{label}</p>
          <Link className="vr-cta" href="/kontakt?teema=eratund">
            {action}
          </Link>
        </div>
      </section>
    );
  }

  if (section.section_type === "contact") {
    const heading = String(section.content.heading ?? "VÕTA KONTAKTI");
    const intro = typeof section.content.intro === "string" ? section.content.intro : "";
    const hasMedia = Boolean(image);
    const content = (
      <div className={hasMedia ? "vr-split-text" : "vr-centered"}>
        <h1 className="vr-page-title" style={{ letterSpacing: "0.18em" }}>
          {heading}
        </h1>
        {intro ? <p>{intro}</p> : null}
        <ContactForm
          kind={section.content.defaultKind === "private_lesson" ? "private_lesson" : "contact"}
          email={settings.contact_email}
          social={settings.social}
        />
      </div>
    );
    return (
      <section className={sectionClass(section)}>
        {specksOn ? <Specks density={themeDensity} /> : null}
        {hasMedia ? (
          <div className={splitClass(section, true)}>
            {content}
            <div className="vr-split-media">
              <SiteImage media={image!} />
            </div>
          </div>
        ) : (
          content
        )}
      </section>
    );
  }

  if (section.section_type === "offering_practical_info") {
    const offeringId = String(section.content.offeringId ?? "");
    const offering = offerings[offeringId];
    const events = eventsByOffering[offeringId] ?? [];
    const bring = typeof section.content.bring === "string" ? section.content.bring : "";
    const clothing = typeof section.content.clothing === "string" ? section.content.clothing : "";
    const notes = typeof section.content.notes === "string" ? section.content.notes : "";
    const scheduleText = typeof section.content.scheduleText === "string" ? section.content.scheduleText : "";
    return (
      <section className={sectionClass(section)}>
        {specksOn ? <Specks density={themeDensity} /> : null}
        <div className="vr-centered vr-body">
          {scheduleText
            ? scheduleText.split("\n\n").map((p, i) => <p key={i}>{p}</p>)
            : null}
          {bring ? <p>{bring}</p> : null}
          {clothing ? <p>{clothing}</p> : null}
          {notes ? <p>{notes}</p> : null}
          {offering?.tasakaal ? <p>Tasakaal: {offering.tasakaal}</p> : null}
          {events.length > 0 && section.content.showDates ? (
            <div>
              <p>Kuupäevad:</p>
              <ul className="vr-dates">
                {events.map((event) => (
                  <li key={event.id}>{event.display_date}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {offering ? (
            <RegistrationBlock
              offering={offering}
              fallbackEmail={settings.default_registration_email ?? settings.contact_email}
            />
          ) : null}
          {section.content.headTeadaLink ? (
            <p>
              <Link className="vr-text-link" href="/hea-teada">
                Hea teada
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  if (section.section_type === "faq") {
    const items = Array.isArray(section.content.items) ? section.content.items : [];
    return (
      <section className={sectionClass(section)}>
        {specksOn ? <Specks density={themeDensity} /> : null}
        <div className="vr-centered">
          <div className="vr-faq">
            {items.map((item, i) => {
              const row = item as { question?: string; answer?: string };
              if (!row.question || !row.answer) return null;
              return (
                <details key={i}>
                  <summary>{row.question}</summary>
                  <p>{row.answer}</p>
                </details>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (section.section_type === "important_info") {
    const items = Array.isArray(section.content.items) ? (section.content.items as string[]) : [];
    return (
      <section className={sectionClass(section)}>
        {specksOn ? <Specks density={themeDensity} /> : null}
        <div className="vr-centered vr-body">
          {items.map((item, i) => (
            <p key={i}>{item}</p>
          ))}
        </div>
      </section>
    );
  }

  if (section.section_type === "testimonials") {
    const items = Array.isArray(section.content.items) ? section.content.items : [];
    const usable = items.filter((item) => {
      const row = item as { quote?: string; name?: string };
      return Boolean(row.quote);
    });
    if (usable.length === 0) return null;
    return (
      <section className={sectionClass(section)}>
        <div className="vr-centered vr-body">
          {usable.map((item, i) => {
            const row = item as { quote?: string; name?: string };
            return (
              <blockquote key={i}>
                <p>{row.quote}</p>
                {row.name ? <p className="vr-muted">{row.name}</p> : null}
              </blockquote>
            );
          })}
        </div>
      </section>
    );
  }

  if (!docHasText(section.content.body) && !section.content.heading) return null;
  return null;
}
