"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Emblem } from "@/components/public/Emblem";
import { SiteImage } from "@/components/public/SiteImage";
import { Specks } from "@/components/public/Specks";
import { ContactForm } from "@/components/forms/ContactForm";
import { RegistrationBlock } from "@/components/forms/RegistrationBlock";
import { EditableNode, EditableText } from "@/components/site/Editable";
import { EditableRichText } from "@/components/site/EditableRichText";
import { MediaFrame, ScreenSection, SectionInner, SplitLayout } from "@/components/layout/primitives";
import { useOptionalEditor } from "@/components/editor/EditorProvider";
import { fieldStyle, photoClassName } from "@/lib/editor/appearance";
import { pageHref } from "@/lib/utils/urls";
import { docHasText } from "@/lib/content/rich-text";
import type { EventRow, MediaRow, OfferingRow, SectionRow, SiteSettings } from "@/types/content";

function SectionShell({
  section,
  specksOn,
  themeDensity,
  children,
}: {
  section: SectionRow;
  specksOn: boolean;
  themeDensity: string;
  children: ReactNode;
}) {
  const editor = useOptionalEditor();
  const selected = editor?.state.selected?.id === `section.${section.id}` && !editor.state.preview;
  const disabled = editor && !section.enabled;

  return (
    <ScreenSection
      section={section}
      className={disabled ? "vr-section--disabled" : undefined}
      data-vr-edit-id={editor && !editor.state.preview ? `section.${section.id}` : undefined}
      data-vr-editable={editor && !editor.state.preview ? "" : undefined}
      data-vr-selected={selected ? "" : undefined}
      onClick={(event) => {
        if (!editor) return;
        event.stopPropagation();
        editor.select({ id: `section.${section.id}`, type: "section", sectionId: section.id });
      }}
    >
      {specksOn ? <Specks density={themeDensity} /> : null}
      {children}
      {selected ? (
        <div className="vr-section-move">
          <button
            type="button"
            aria-label="Liiguta üles"
            onClick={(event) => {
              event.stopPropagation();
              editor?.moveSection(section.id, -1);
            }}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Liiguta alla"
            onClick={(event) => {
              event.stopPropagation();
              editor?.moveSection(section.id, 1);
            }}
          >
            ↓
          </button>
        </div>
      ) : null}
    </ScreenSection>
  );
}

function SectionImage({
  section,
  image,
  fallback,
}: {
  section: SectionRow;
  image?: MediaRow;
  fallback?: ReactNode;
}) {
  const editor = useOptionalEditor();
  const crop = section.style?.image?.crop ?? (section.section_type === "split_media_text" ? "portrait" : "landscape");
  const selection = {
    id: `${section.id}.image`,
    type: "image" as const,
    sectionId: section.id,
    mediaId: image?.id,
    field: "image",
  };

  const frame = (
    <MediaFrame
      crop={crop}
      width={section.style?.image?.width}
      radius={section.style?.image?.radius}
      align={section.style?.image?.align}
    >
      {image ? (
        <SiteImage media={image} className={photoClassName(crop)} />
      ) : (
        fallback
      )}
    </MediaFrame>
  );

  if (!editor) return <div className="vr-split-media">{frame}</div>;

  return (
    <EditableNode selection={selection} className="vr-split-media">
      {frame}
    </EditableNode>
  );
}

export function SectionList({
  slug,
  sections,
  offerings,
  eventsByOffering,
  media,
  settings,
  themeDensity,
}: {
  slug: string;
  sections: SectionRow[];
  offerings: Record<string, OfferingRow>;
  eventsByOffering: Record<string, EventRow[]>;
  media: Record<string, MediaRow>;
  settings: SiteSettings;
  themeDensity: string;
}) {
  const editor = useOptionalEditor();
  const visible = editor ? sections : sections.filter((section) => section.enabled);

  return (
    <>
      {visible.map((section) => (
        <SectionView
          key={section.id}
          slug={slug}
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
  slug,
  section,
  offerings,
  eventsByOffering,
  media,
  settings,
  themeDensity,
}: {
  slug: string;
  section: SectionRow;
  offerings: Record<string, OfferingRow>;
  eventsByOffering: Record<string, EventRow[]>;
  media: Record<string, MediaRow>;
  settings: SiteSettings;
  themeDensity: string;
}) {
  const editor = useOptionalEditor();
  const specksOn = section.style?.specks !== false;
  const mediaId = (section.style?.mediaId || section.content.mediaId) as string | undefined;
  const image = mediaId ? media[mediaId] : undefined;
  const layout = section.style?.layout;
  const align = section.style?.textAlign;
  const prefix = `${slug}.${section.section_key}`;

  if (section.section_type === "spacer") {
    return <SectionShell section={section} specksOn={false} themeDensity={themeDensity}>{null}</SectionShell>;
  }

  if (section.section_type === "hero") {
    const intro = String(section.content.intro ?? "");
    const showEmblem = section.content.showEmblem !== false;
    const wordmark = String(section.content.title ?? "VAIKUSRUUM");
    return (
      <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
        <SectionInner>
          <SplitLayout section={section} hasMedia={showEmblem || Boolean(image)}>
            <div className="vr-split-text">
              <div className="vr-hero-copy" style={{ textAlign: align ?? "center" }}>
                <EditableText
                  as="h1"
                  className="vr-wordmark vr-wordmark--hero"
                  selection={{ id: `${prefix}.title`, type: "text", sectionId: section.id, field: "title" }}
                  path={{ kind: "section-content", sectionId: section.id, key: "title" }}
                  value={wordmark}
                  appearance={fieldStyle(section, "title")}
                />
                <EditableText
                  as="div"
                  className="vr-body"
                  selection={{ id: `${prefix}.intro`, type: "text", sectionId: section.id, field: "intro" }}
                  path={{ kind: "section-content", sectionId: section.id, key: "intro" }}
                  value={intro}
                  appearance={fieldStyle(section, "intro")}
                  multiline
                />
              </div>
            </div>
            {showEmblem || image ? (
              image ? (
                <SectionImage section={section} image={image} />
              ) : (
                <div className="vr-split-media">
                  <Emblem />
                </div>
              )
            ) : null}
          </SplitLayout>
        </SectionInner>
      </SectionShell>
    );
  }

  if (section.section_type === "split_media_text" || section.section_type === "rich_text") {
    const heading = typeof section.content.heading === "string" ? section.content.heading : "";
    const body = section.content.body ?? section.content.text;
    const textOnly = layout === "text-only" || layout === "centered" || (!image && layout !== "image-only");
    const hasMedia = Boolean(image) && layout !== "text-only" && layout !== "centered";
    const reading = layout === "centered" || textOnly;
    const longForm = section.section_type === "rich_text" && slug !== "avaleht";
    const textClass = longForm ? "vr-reading vr-body" : reading ? "vr-centered vr-body" : "vr-narrow vr-body";

    if (layout === "image-only" && image) {
      return (
        <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
          <SectionInner>
            <SectionImage section={section} image={image} />
          </SectionInner>
        </SectionShell>
      );
    }

    const text = (
      <div
        className={textClass}
        style={{ textAlign: align ?? (reading ? "center" : "left") }}
      >
        {heading ? (
          <EditableText
            as="h2"
            className="vr-heading"
            selection={{ id: `${prefix}.heading`, type: "text", sectionId: section.id, field: "heading" }}
            path={{ kind: "section-content", sectionId: section.id, key: "heading" }}
            value={heading}
            appearance={fieldStyle(section, "heading")}
          />
        ) : null}
        {section.section_type === "split_media_text" && typeof section.content.plain === "string" ? (
          <EditableText
            as="div"
            className="vr-body"
            selection={{ id: `${prefix}.plain`, type: "text", sectionId: section.id, field: "plain" }}
            path={{ kind: "section-content", sectionId: section.id, key: "plain" }}
            value={section.content.plain}
            appearance={fieldStyle(section, "plain")}
            multiline
          />
        ) : (
          <EditableRichText
            className="vr-rich"
            selection={{ id: `${prefix}.body`, type: "text", sectionId: section.id, field: "body" }}
            value={body}
          />
        )}
      </div>
    );

    if (!hasMedia) {
      return (
        <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
          <SectionInner>{text}</SectionInner>
        </SectionShell>
      );
    }

    return (
      <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
        <SectionInner>
          <SplitLayout section={section} hasMedia>
            <SectionImage section={section} image={image} />
            <div className="vr-split-text">{text}</div>
          </SplitLayout>
        </SectionInner>
      </SectionShell>
    );
  }

  if (section.section_type === "offering_overview") {
    const ids = Array.isArray(section.content.offeringIds) ? (section.content.offeringIds as string[]) : [];
    const label = String(section.content.moreInfoLabel ?? "rohkem infot");
    const listed = ids.map((id) => offerings[id]).filter(Boolean);
    const hasMedia = Boolean(image);
    const list = (
      <div className={hasMedia ? "vr-split-text" : undefined}>
        <div className="vr-offering-group" style={{ textAlign: align ?? "center" }}>
          {listed.map((offering) => (
            <article key={offering.id} className="vr-offering">
              <EditableText
                as="h2"
                className="vr-heading"
                selection={{
                  id: `${prefix}.${offering.id}.title`,
                  type: "text",
                  sectionId: section.id,
                  offeringId: offering.id,
                  field: "short_title",
                }}
                path={{ kind: "offering", offeringId: offering.id, key: "short_title" }}
                value={offering.short_title || offering.title}
                appearance={fieldStyle(section, `${offering.id}.title`)}
              />
              {offering.schedule_summary ? (
                <EditableText
                  selection={{
                    id: `${prefix}.${offering.id}.schedule`,
                    type: "text",
                    offeringId: offering.id,
                    field: "schedule_summary",
                  }}
                  path={{ kind: "offering", offeringId: offering.id, key: "schedule_summary" }}
                  value={offering.schedule_summary}
                />
              ) : null}
              {offering.location_name ? (
                <EditableText
                  selection={{
                    id: `${prefix}.${offering.id}.location`,
                    type: "text",
                    offeringId: offering.id,
                    field: "location_name",
                  }}
                  path={{ kind: "offering", offeringId: offering.id, key: "location_name" }}
                  value={offering.location_name}
                />
              ) : null}
              {offering.address ? (
                <EditableText
                  selection={{
                    id: `${prefix}.${offering.id}.address`,
                    type: "text",
                    offeringId: offering.id,
                    field: "address",
                  }}
                  path={{ kind: "offering", offeringId: offering.id, key: "address" }}
                  value={offering.address}
                />
              ) : null}
              <p>
                <Link className="vr-text-link" href={pageHref(offering.slug)}>
                  <EditableText
                    as="span"
                    className="vr-text-link"
                    selection={{
                      id: `${prefix}.moreInfo`,
                      type: "link",
                      sectionId: section.id,
                      field: "moreInfoLabel",
                    }}
                    path={{ kind: "section-content", sectionId: section.id, key: "moreInfoLabel" }}
                    value={label}
                  />
                </Link>
              </p>
            </article>
          ))}
        </div>
      </div>
    );
    return (
      <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
        <SectionInner>
          {hasMedia ? (
            <SplitLayout section={section} hasMedia>
              {list}
              <SectionImage section={section} image={image} />
            </SplitLayout>
          ) : (
            list
          )}
        </SectionInner>
      </SectionShell>
    );
  }

  if (section.section_type === "private_lessons") {
    const label = String(section.content.label ?? "Eratunnid kokkuleppel");
    const action = String(section.content.actionLabel ?? "Võta ühendust");
    return (
      <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
        <SectionInner>
          <div className="vr-centered vr-private">
            <EditableText
              as="p"
              className="vr-heading"
              selection={{ id: `${prefix}.label`, type: "text", sectionId: section.id, field: "label" }}
              path={{ kind: "section-content", sectionId: section.id, key: "label" }}
              value={label}
              appearance={fieldStyle(section, "label")}
            />
            <Link className="vr-cta" href="/kontakt?teema=eratund">
              <EditableText
                as="span"
                selection={{ id: `${prefix}.action`, type: "link", sectionId: section.id, field: "actionLabel" }}
                path={{ kind: "section-content", sectionId: section.id, key: "actionLabel" }}
                value={action}
              />
            </Link>
          </div>
        </SectionInner>
      </SectionShell>
    );
  }

  if (section.section_type === "contact") {
    const heading = String(section.content.heading ?? "VÕTA KONTAKTI");
    const intro = typeof section.content.intro === "string" ? section.content.intro : "";
    const hasMedia = Boolean(image);
    const content = (
      <div className={hasMedia ? "vr-split-text" : "vr-centered"} style={{ textAlign: align ?? "center" }}>
        <EditableText
          as="h1"
          className="vr-page-title"
          style={{ letterSpacing: "0.18em" }}
          selection={{ id: `${prefix}.heading`, type: "text", sectionId: section.id, field: "heading" }}
          path={{ kind: "section-content", sectionId: section.id, key: "heading" }}
          value={heading}
          appearance={fieldStyle(section, "heading")}
        />
        {intro ? (
          <EditableText
            selection={{ id: `${prefix}.intro`, type: "text", sectionId: section.id, field: "intro" }}
            path={{ kind: "section-content", sectionId: section.id, key: "intro" }}
            value={intro}
            multiline
          />
        ) : null}
        <ContactForm
          kind={section.content.defaultKind === "private_lesson" ? "private_lesson" : "contact"}
          email={settings.contact_email}
          social={settings.social}
        />
      </div>
    );
    return (
      <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
        <SectionInner>
          {hasMedia ? (
            <SplitLayout section={section} hasMedia>
              {content}
              <SectionImage section={section} image={image} />
            </SplitLayout>
          ) : (
            content
          )}
        </SectionInner>
      </SectionShell>
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
      <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
        <SectionInner>
          <div className="vr-reading vr-body">
            {scheduleText ? (
              <EditableText
                as="div"
                selection={{ id: `${prefix}.scheduleText`, type: "text", sectionId: section.id, field: "scheduleText" }}
                path={{ kind: "section-content", sectionId: section.id, key: "scheduleText" }}
                value={scheduleText}
                multiline
              />
            ) : null}
            {bring ? (
              <EditableText
                selection={{ id: `${prefix}.bring`, type: "text", sectionId: section.id, field: "bring" }}
                path={{ kind: "section-content", sectionId: section.id, key: "bring" }}
                value={bring}
              />
            ) : null}
            {clothing ? (
              <EditableText
                selection={{ id: `${prefix}.clothing`, type: "text", sectionId: section.id, field: "clothing" }}
                path={{ kind: "section-content", sectionId: section.id, key: "clothing" }}
                value={clothing}
              />
            ) : null}
            {notes ? (
              <EditableText
                selection={{ id: `${prefix}.notes`, type: "text", sectionId: section.id, field: "notes" }}
                path={{ kind: "section-content", sectionId: section.id, key: "notes" }}
                value={notes}
              />
            ) : null}
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
        </SectionInner>
      </SectionShell>
    );
  }

  if (section.section_type === "faq") {
    const items = Array.isArray(section.content.items) ? section.content.items : [];
    return (
      <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
        <SectionInner>
          <div className="vr-reading">
            <div className="vr-faq">
              {items.map((item, i) => {
                const row = item as { question?: string; answer?: string };
                if (!row.question || !row.answer) return null;
                return (
                  <details key={i}>
                    <summary>
                      <EditableText
                        as="span"
                        selection={{ id: `${prefix}.q.${i}`, type: "text", sectionId: section.id, field: `q.${i}` }}
                        path={{ kind: "faq", sectionId: section.id, index: i, field: "question" }}
                        value={row.question}
                      />
                    </summary>
                    <EditableText
                      selection={{ id: `${prefix}.a.${i}`, type: "text", sectionId: section.id, field: `a.${i}` }}
                      path={{ kind: "faq", sectionId: section.id, index: i, field: "answer" }}
                      value={row.answer}
                      multiline
                    />
                  </details>
                );
              })}
            </div>
          </div>
        </SectionInner>
      </SectionShell>
    );
  }

  if (section.section_type === "important_info") {
    const items = Array.isArray(section.content.items) ? (section.content.items as string[]) : [];
    return (
      <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
        <SectionInner>
          <div className="vr-reading vr-body">
            {items.map((item, i) => (
              <EditableText
                key={i}
                selection={{ id: `${prefix}.item.${i}`, type: "text", sectionId: section.id, field: `item.${i}` }}
                path={{ kind: "list-item", sectionId: section.id, index: i }}
                value={item}
                multiline
              />
            ))}
          </div>
        </SectionInner>
      </SectionShell>
    );
  }

  if (section.section_type === "testimonials") {
    const items = Array.isArray(section.content.items) ? section.content.items : [];
    const usable = items.filter((item) => {
      const row = item as { quote?: string; name?: string };
      return Boolean(row.quote);
    });
    if (usable.length === 0 && !editor) return null;
    return (
      <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
        <SectionInner>
          <div className="vr-reading vr-body">
            {usable.map((item, i) => {
              const row = item as { quote?: string; name?: string };
              return (
                <blockquote key={i}>
                  <EditableText
                    selection={{ id: `${prefix}.quote.${i}`, type: "text", sectionId: section.id, field: `quote.${i}` }}
                    path={{ kind: "testimonial", sectionId: section.id, index: i, field: "quote" }}
                    value={row.quote ?? ""}
                    multiline
                  />
                  {row.name ? (
                    <EditableText
                      as="p"
                      className="vr-muted"
                      selection={{ id: `${prefix}.name.${i}`, type: "text", sectionId: section.id, field: `name.${i}` }}
                      path={{ kind: "testimonial", sectionId: section.id, index: i, field: "name" }}
                      value={row.name}
                    />
                  ) : null}
                </blockquote>
              );
            })}
          </div>
        </SectionInner>
      </SectionShell>
    );
  }

  if (!docHasText(section.content.body) && !section.content.heading) return null;
  return null;
}
