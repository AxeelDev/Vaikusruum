"use client";

import Link from "next/link";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Emblem } from "@/components/public/Emblem";
import { SiteImage } from "@/components/public/SiteImage";
import { Specks } from "@/components/public/Specks";
import { ContactForm } from "@/components/forms/ContactForm";
import { RegistrationBlock } from "@/components/forms/RegistrationBlock";
import { EditableNode, EditableText } from "@/components/site/Editable";
import { EditableRichText } from "@/components/site/EditableRichText";
import { MediaFrame, ScreenSection, SectionInner, SplitLayout, isHomeSceneSection } from "@/components/layout/primitives";
import { useOptionalEditor } from "@/components/editor/EditorProvider";
import { fieldStyle, photoClassName } from "@/lib/editor/appearance";
import { PAGE_COPY_DEFAULTS, indexedFieldValue, parseIndexedField, readBoundSectionValue, textSelection } from "@/lib/editor/content-binding";
import { readImageAppearance, resolveImageMediaId } from "@/lib/editor/image-style";
import { textStyleKey } from "@/lib/editor/text-style";
import { getSectionLayoutTree, isReadingSection, isSplitLayout, ratioToLeftPercent } from "@/lib/editor/layout-tree";
import { pageHref } from "@/lib/utils/urls";
import { docHasText, isTiptapDoc } from "@/lib/content/rich-text";
import type { EventRow, LayoutColumnNode, LayoutElementNode, LayoutGroupNode, LayoutNode, MediaRow, OfferingRow, SectionRow, SiteSettings } from "@/types/content";

function SectionShell({
  section,
  specksOn,
  themeDensity,
  slug,
  children,
}: {
  section: SectionRow;
  specksOn: boolean;
  themeDensity: string;
  slug?: string;
  children: ReactNode;
}) {
  const editor = useOptionalEditor();
  const selected = editor?.state.selected?.id === `section.${section.id}` && !editor.state.preview;
  const disabled = editor && !section.enabled;
  const className = [
    disabled ? "vr-section--disabled" : "",
    slug && isHomeSceneSection(section, slug) ? "vr-home-scene" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ScreenSection
      section={section}
      className={className || undefined}
      data-vr-animation={section.style?.animation?.preset && section.style.animation.preset !== "none" ? section.style.animation.preset : undefined}
      style={{
        "--vr-anim-duration": `${section.style?.animation?.duration ?? 1}s`,
        "--vr-anim-delay": `${section.style?.animation?.delay ?? 0}s`,
      } as CSSProperties}
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
    </ScreenSection>
  );
}

function SectionImage({
  section,
  image,
  field = "image",
  fallback,
  className,
}: {
  section: SectionRow;
  image?: MediaRow;
  field?: string;
  fallback?: ReactNode;
  className?: string;
}) {
  const editor = useOptionalEditor();
  const appearance = readImageAppearance(section, field);
  const crop = appearance.crop;
  const selection = {
    id: `${section.id}.${field}`,
    type: "image" as const,
    sectionId: section.id,
    mediaId: image?.id,
    field,
  };

  const frame = (
    <MediaFrame crop={crop} size={appearance.size} align={appearance.align}>
      {image ? (
        <SiteImage media={image} className={photoClassName(crop)} draggable={editor && !editor.state.preview ? false : undefined} />
      ) : (
        fallback
      )}
    </MediaFrame>
  );

  if (!editor) return <div className={["vr-split-media", className].filter(Boolean).join(" ")}>{frame}</div>;

  return (
    <EditableNode selection={selection} className={["vr-split-media", className].filter(Boolean).join(" ")}>
      {frame}
    </EditableNode>
  );
}

function layoutAlignClass(node: LayoutColumnNode | LayoutGroupNode) {
  const align = node.horizontalAlign ?? ("textAlign" in node ? node.textAlign : undefined);
  if (align === "left") return "vr-layout-align--left";
  if (align === "right") return "vr-layout-align--right";
  return "";
}

function LayoutContainer({
  section,
  node,
  className,
  children,
}: {
  section: SectionRow;
  node: LayoutColumnNode | LayoutGroupNode;
  className?: string;
  children: ReactNode;
}) {
  const editor = useOptionalEditor();
  const selected = editor?.state.selected?.id === node.id && !editor.state.preview;
  return (
    <div
      className={["vr-layout-node", layoutAlignClass(node), className].filter(Boolean).join(" ")}
      data-vr-edit-id={editor && !editor.state.preview ? node.id : undefined}
      data-vr-editable={editor && !editor.state.preview ? "" : undefined}
      data-vr-selected={selected ? "" : undefined}
      data-vr-drop-container={editor && !editor.state.preview ? node.id : undefined}
      data-vr-section-id={editor && !editor.state.preview ? section.id : undefined}
      data-vr-node-kind={editor && !editor.state.preview ? node.type : undefined}
      data-vr-orientation="vertical"
      onClick={(event) => {
        if (!editor || editor.state.preview) return;
        if (event.target !== event.currentTarget) return;
        event.stopPropagation();
        editor.select({ id: node.id, type: "container", sectionId: section.id });
      }}
    >
      {children}
    </div>
  );
}

function ColumnResizeHandle({ section, columnsId }: { section: SectionRow; columnsId: string }) {
  const editor = useOptionalEditor();
  const [live, setLive] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  if (!editor || editor.state.preview) return null;
  const selected = editor.state.selected?.id === columnsId;
  const active = selected || live !== null;

  return (
    <button
      type="button"
      className="vr-column-resize"
      data-vr-column-resize=""
      data-active={active || hovered ? "" : undefined}
      aria-label="Muuda veergude suhet"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        if (live === null) setHovered(false);
      }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const grid = (event.currentTarget.parentElement as HTMLElement | null);
        const rect = grid?.getBoundingClientRect();
        if (!rect) return;
        const pointerId = event.pointerId;
        event.currentTarget.setPointerCapture(pointerId);
        const move = (moveEvent: PointerEvent) => {
          const left = ((moveEvent.clientX - rect.left) / rect.width) * 100;
          const clamped = Math.min(70, Math.max(30, Math.round(left)));
          setLive(clamped);
          editor.resizeColumns(section.id, clamped, false);
        };
        const up = (upEvent: PointerEvent) => {
          const left = ((upEvent.clientX - rect.left) / rect.width) * 100;
          const clamped = Math.min(70, Math.max(30, Math.round(left)));
          setLive(null);
          editor.resizeColumns(section.id, clamped, true);
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
    >
      <span>{live != null ? `${live} / ${100 - live}` : ""}</span>
    </button>
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
  const mediaId = resolveImageMediaId(section);
  const image = mediaId ? media[mediaId] : undefined;
  const layout = section.style?.layout;
  const align = section.style?.textAlign;
  const prefix = `${slug}.${section.section_key}`;
  const tree = getSectionLayoutTree(section);

  function renderLayoutNode(node: LayoutNode): ReactNode {
    if (node.type === "columns") {
      const left = ratioToLeftPercent(node.ratio, node.customRatio ?? section.style?.columnRatio);
      const renderedColumns = node.columns
        .map((columnNode) => ({
          node: columnNode,
          children: renderContainerChildren(columnNode),
        }))
        .filter((column) => column.children.length > 0);

      if (renderedColumns.length === 0) return null;

      if (renderedColumns.length === 1) {
        const only = renderedColumns[0];
        return (
          <LayoutContainer section={section} node={only.node} className="vr-layout-column vr-layout-column--single">
            {only.children}
          </LayoutContainer>
        );
      }

      const columnsSelected = editor?.state.selected?.id === node.id && !editor.state.preview;
      const splitVars = {
        "--vr-left-column": `${left}%`,
        "--vr-right-column": `${100 - left}%`,
      } as CSSProperties;
      return (
        <div
          className={["vr-layout-columns", columnsSelected ? "is-split-selected" : ""].filter(Boolean).join(" ")}
          style={splitVars}
        >
          <SplitLayout
            section={section}
            hasMedia
            className={section.section_type === "hero" ? "vr-hero-layout" : undefined}
            data-vr-edit-id={editor && !editor.state.preview ? node.id : undefined}
            data-vr-editable={editor && !editor.state.preview ? "" : undefined}
            data-vr-selected={columnsSelected ? "" : undefined}
            data-vr-node-id={editor && !editor.state.preview ? node.id : undefined}
            data-vr-section-id={editor && !editor.state.preview ? section.id : undefined}
            data-vr-node-kind={editor && !editor.state.preview ? "columns" : undefined}
            onClick={(event) => {
              if (!editor || editor.state.preview) return;
              if (event.target !== event.currentTarget) return;
              event.stopPropagation();
              editor.select({ id: node.id, type: "container", sectionId: section.id, layoutNodeId: node.id });
            }}
          >
            {renderedColumns.map(({ node: columnNode, children }) => (
              <LayoutContainer key={columnNode.id} section={section} node={columnNode} className="vr-layout-column">
                {children}
              </LayoutContainer>
            ))}
          </SplitLayout>
          <ColumnResizeHandle section={section} columnsId={node.id} />
        </div>
      );
    }
    if (node.type === "group") {
      if (isFaqItemGroup(section, node)) return renderFaqItemGroup(node);
      if (isTestimonialGroup(section, node)) return renderTestimonialGroup(node);
      const children = renderContainerChildren(node);
      if (children.length === 0 && (!editor || editor.state.preview)) return null;
      return (
        <LayoutContainer
          section={section}
          node={node}
          className={`vr-layout-group vr-layout-group--${node.gap ?? "medium"}`}
        >
          {children}
        </LayoutContainer>
      );
    }
    if (node.type === "column") {
      const children = renderContainerChildren(node);
      if (children.length === 0) return null;
      return (
        <LayoutContainer section={section} node={node} className="vr-layout-column">
          {children}
        </LayoutContainer>
      );
    }
    return renderLayoutElement(node);
  }

  function renderContainerChildren(node: LayoutColumnNode | LayoutGroupNode): ReactNode[] {
    return node.children.flatMap((child) => {
      const rendered = renderLayoutNode(child);
      if (!rendered) return [];
      const selection = layoutSelectionForNode(child);
      return (
        <div
          key={child.id}
          className="vr-layout-child"
          data-vr-node-id={editor && !editor.state.preview ? child.id : undefined}
          data-vr-section-id={editor && !editor.state.preview ? section.id : undefined}
          data-vr-drag-label={editor && !editor.state.preview ? child.label : undefined}
          data-vr-draggable-node={editor && !editor.state.preview ? "" : undefined}
          data-vr-just-added={editor?.state.lastInsertedNodeId === child.id ? "" : undefined}
          data-vr-selection-id={editor && !editor.state.preview ? selection.id : undefined}
          data-vr-selection-type={editor && !editor.state.preview ? selection.type : undefined}
          data-vr-selection-section-id={editor && !editor.state.preview ? section.id : undefined}
          data-vr-selection-field={editor && !editor.state.preview ? selection.field : undefined}
          data-vr-selection-media-id={editor && !editor.state.preview ? selection.mediaId : undefined}
          data-vr-selection-offering-id={editor && !editor.state.preview ? selection.offeringId : undefined}
        >
          {rendered}
        </div>
      );
    });
  }

  function layoutSelectionForNode(node: LayoutNode): { id: string; type: "container" | "text" | "image"; field?: string; mediaId?: string; offeringId?: string } {
    if (node.type === "column" || node.type === "group" || node.type === "columns") {
      return { id: node.id, type: "container" };
    }
    if (node.elementType === "image") return { id: `${section.id}.${node.field ?? "image"}`, type: "image", field: node.field ?? "image", mediaId: resolveImageMediaId(section, node.field) };
    if (node.elementType === "text" && node.field) {
      return { id: node.field === "body" ? `${prefix}.body` : `${prefix}.${node.field}`, type: "text", field: node.field };
    }
    if (node.elementType === "offering") return { id: `${prefix}.${node.offeringId}.title`, type: "text", field: "short_title", offeringId: node.offeringId };
    if (node.field) return { id: `${prefix}.${node.field}`, type: "text", field: node.field };
    return { id: node.id, type: "container" };
  }

  function renderLayoutElement(node: LayoutElementNode): ReactNode {
    if (node.elementType === "image") {
      const field = node.field ?? "image";
      const nodeMediaId = resolveImageMediaId(section, field);
      const nodeImage = nodeMediaId ? media[nodeMediaId] : field.startsWith("custom.") ? undefined : image;
      const implicit = !field.startsWith("custom.");
      if (section.section_type === "hero" && !nodeImage && implicit) {
        if (section.content.showEmblem === false) return null;
        return (
          <div className="vr-layout-element vr-layout-element--hero-art">
            <SectionImage section={section} field={field} fallback={<Emblem className="vr-emblem" />} className="vr-hero-artwork" />
          </div>
        );
      }
      if (!nodeImage) {
        const hideImplicit = implicit && (layout === "text-only" || layout === "centered" || !isSplitLayout(section));
        if (!editor || editor.state.preview || hideImplicit) return null;
        return (
          <div className="vr-layout-element vr-layout-element--media">
            <EditableNode selection={{ id: `${section.id}.${field}`, type: "image", sectionId: section.id, field, layoutNodeId: node.id }} className="vr-editorial-placeholder vr-editorial-placeholder--image" as="div">
              Pilt
            </EditableNode>
          </div>
        );
      }
      return (
        <div className={["vr-layout-element vr-layout-element--media", section.section_type === "hero" && implicit ? "vr-layout-element--hero-art" : ""].filter(Boolean).join(" ")}>
          <SectionImage section={section} image={nodeImage} field={field} className={section.section_type === "hero" && implicit ? "vr-hero-artwork" : undefined} />
        </div>
      );
    }
    if (node.elementType === "offering") {
      const offering = node.offeringId ? offerings[node.offeringId] : undefined;
      if (!offering) return null;
      return <div className="vr-layout-element vr-layout-element--card">{renderOfferingCard(offering)}</div>;
    }
    if (node.elementType === "form" && section.section_type === "contact") {
      return (
        <ContactForm
          kind={section.content.defaultKind === "private_lesson" ? "private_lesson" : "contact"}
          email={settings.contact_email}
          social={settings.social}
        />
      );
    }
    if (node.elementType === "list") return renderListElement(node);
    if (node.elementType === "buttons") return renderButtonsElement(node);
    if (node.elementType === "link") return renderLinksElement(node);
    if (node.elementType === "video") return renderMediaPlaceholder(node, "Video");
    if (node.elementType === "audio") return renderMediaPlaceholder(node, "Audio");
    if (node.elementType === "icons") return renderIconElement(node);
    if (node.elementType === "gallery") return renderMediaPlaceholder(node, "Gallery");
    if (node.elementType === "table") return renderTableElement(node);
    if (node.elementType === "timer") return renderTimerElement(node);
    if (node.elementType === "divider") return renderDividerElement(node);
    if (node.elementType === "slideshow") return renderMediaPlaceholder(node, "Slideshow");
    if (node.elementType === "widget") return renderWidgetElement(node);
    if (node.elementType === "embed") return renderMediaPlaceholder(node, "Embed");
    if (node.elementType === "control") return renderControlElement(node);
    if (!node.field) return null;
    return renderTextField(node.field);
  }

  function renderGenericSelection(node: LayoutElementNode, type: "text" | "link" = "text") {
    return {
      id: `${prefix}.${node.field ?? node.id}`,
      type,
      sectionId: section.id,
      field: node.field,
    };
  }

  function renderListElement(node: LayoutElementNode): ReactNode {
    const raw = node.field ? section.content[node.field] : null;
    const config = raw && typeof raw === "object" ? raw as { style?: string; items?: string[] } : {};
    const items = Array.isArray(config.items) ? config.items : [];
    const Tag = config.style === "numbered" ? "ol" : "ul";
    return (
      <div className="vr-layout-element vr-layout-element--text">
        <EditableNode selection={renderGenericSelection(node)} className="vr-list-element" as="div">
          <Tag>
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </Tag>
        </EditableNode>
      </div>
    );
  }

  function renderButtonsElement(node: LayoutElementNode): ReactNode {
    const raw = node.field ? section.content[node.field] : null;
    const config = raw && typeof raw === "object" ? raw as { buttons?: Array<{ label?: string; href?: string }>; direction?: string } : {};
    const buttons = Array.isArray(config.buttons) ? config.buttons : [];
    return (
      <div className="vr-layout-element">
        <EditableNode selection={renderGenericSelection(node)} className={`vr-button-group vr-button-group--${config.direction === "vertical" ? "vertical" : "horizontal"}`} as="div">
          {buttons.map((button, index) => (
            <Link key={index} className="vr-cta" href={button.href || "/"}>
              {button.label || "Nupp"}
            </Link>
          ))}
        </EditableNode>
      </div>
    );
  }

  function renderLinksElement(node: LayoutElementNode): ReactNode {
    const raw = node.field ? section.content[node.field] : null;
    const config = raw && typeof raw === "object" ? raw as { items?: Array<{ label?: string; href?: string }>; direction?: string } : {};
    const items = Array.isArray(config.items) ? config.items : [];
    return (
      <div className="vr-layout-element">
        <EditableNode selection={renderGenericSelection(node, "link")} className={`vr-links-group vr-links-group--${config.direction === "vertical" ? "vertical" : "horizontal"}`} as="div">
          {items.map((item, index) => (
            <Link key={index} className="vr-text-link" href={item.href || "/"}>
              {item.label || "Link"}
            </Link>
          ))}
        </EditableNode>
      </div>
    );
  }

  function renderMediaPlaceholder(node: LayoutElementNode, label: string): ReactNode {
    return (
      <div className="vr-layout-element">
        <EditableNode selection={renderGenericSelection(node)} className="vr-editorial-placeholder" as="div">
          {label}
        </EditableNode>
      </div>
    );
  }

  function renderIconElement(node: LayoutElementNode): ReactNode {
    return (
      <div className="vr-layout-element">
        <EditableNode selection={renderGenericSelection(node)} className="vr-icon-element" as="div">
          ○
        </EditableNode>
      </div>
    );
  }

  function renderTableElement(node: LayoutElementNode): ReactNode {
    const raw = node.field ? section.content[node.field] : null;
    const config = raw && typeof raw === "object" ? raw as { rows?: string[][] } : {};
    const rows = Array.isArray(config.rows) ? config.rows : [];
    return (
      <div className="vr-layout-element vr-layout-element--text">
        <EditableNode selection={renderGenericSelection(node)} className="vr-simple-table-wrap" as="div">
          <table className="vr-simple-table">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </EditableNode>
      </div>
    );
  }

  function renderTimerElement(node: LayoutElementNode): ReactNode {
    const raw = node.field ? section.content[node.field] : null;
    const config = raw && typeof raw === "object" ? raw as { label?: string; target?: string } : {};
    return (
      <div className="vr-layout-element">
        <EditableNode selection={renderGenericSelection(node)} className="vr-timer-element" as="div">
          <span>{config.label || "Aeg"}</span>
          <strong>{config.target || "Vali kuupäev"}</strong>
        </EditableNode>
      </div>
    );
  }

  function renderDividerElement(node: LayoutElementNode): ReactNode {
    return (
      <div className="vr-layout-element vr-layout-element--divider">
        <EditableNode selection={renderGenericSelection(node)} className="vr-divider-element" as="div">
          <span aria-hidden="true" />
        </EditableNode>
      </div>
    );
  }

  function renderWidgetElement(node: LayoutElementNode): ReactNode {
    return (
      <div className="vr-layout-element">
        <EditableNode selection={renderGenericSelection(node)} className="vr-widget-element" as="address">
          {settings.contact_email || settings.contact_phone || "Kontakt"}
        </EditableNode>
      </div>
    );
  }

  function renderControlElement(node: LayoutElementNode): ReactNode {
    return (
      <div className="vr-layout-element">
        <EditableNode selection={renderGenericSelection(node)} className="vr-control-element" as="div">
          Anchor
        </EditableNode>
      </div>
    );
  }

  function isFaqItemGroup(current: SectionRow, node: LayoutNode): boolean {
    return (
      current.section_type === "faq" &&
      node.type === "group" &&
      node.children.some((child) => child.type === "element" && child.field?.startsWith("q."))
    );
  }

  function isTestimonialGroup(current: SectionRow, node: LayoutNode): boolean {
    return (
      current.section_type === "testimonials" &&
      node.type === "group" &&
      node.children.some((child) => child.type === "element" && child.field?.startsWith("quote."))
    );
  }

  function renderFaqItemGroup(node: LayoutGroupNode): ReactNode {
    const question = node.children.find((child) => child.type === "element" && child.field?.startsWith("q."));
    const answer = node.children.find((child) => child.type === "element" && child.field?.startsWith("a."));
    const questionField = question && question.type === "element" ? question.field : undefined;
    const answerField = answer && answer.type === "element" ? answer.field : undefined;
    const indexed = parseIndexedField(questionField);
    const questionValue = indexed ? indexedFieldValue(section, indexed) : "";
    const answerIndexed = parseIndexedField(answerField);
    const answerValue = answerIndexed ? indexedFieldValue(section, answerIndexed) : "";
    if (!questionValue && !answerValue && (!editor || editor.state.preview)) return null;
    return (
      <LayoutContainer section={section} node={node} className="vr-layout-group vr-layout-group--small">
        <details>
          <summary>
            {questionField ? renderTextField(questionField, { as: "span", hideIfEmpty: false }) : null}
          </summary>
          {answerField ? renderTextField(answerField, { multiline: true, hideIfEmpty: false }) : null}
        </details>
      </LayoutContainer>
    );
  }

  function renderTestimonialGroup(node: LayoutGroupNode): ReactNode {
    const quote = node.children.find((child) => child.type === "element" && child.field?.startsWith("quote."));
    const name = node.children.find((child) => child.type === "element" && child.field?.startsWith("name."));
    const quoteField = quote && quote.type === "element" ? quote.field : undefined;
    const nameField = name && name.type === "element" ? name.field : undefined;
    const quoteValue = quoteField ? String(readBoundSectionValue(section, quoteField) ?? "") : "";
    if (!quoteValue && (!editor || editor.state.preview)) return null;
    return (
      <LayoutContainer section={section} node={node} className="vr-layout-group vr-layout-group--small">
        <blockquote>
          {quoteField ? renderTextField(quoteField, { multiline: true, hideIfEmpty: false }) : null}
          {nameField ? renderTextField(nameField, { as: "p", className: "vr-muted" }) : null}
        </blockquote>
      </LayoutContainer>
    );
  }

  function renderTextField(
    field: string,
    options: {
      as?: "h1" | "h2" | "h3" | "p" | "div" | "span";
      className?: string;
      multiline?: boolean;
      hideIfEmpty?: boolean;
      clickMode?: "select" | "defer";
      type?: "text" | "link";
    } = {},
  ): ReactNode {
    const selection = textSelection(slug, section, field, { type: options.type });
    const editing = Boolean(editor && !editor.state.preview);
    const hideIfEmpty = options.hideIfEmpty ?? !editing;
    const raw = readBoundSectionValue(section, field);
    const appearance = fieldStyle(section, field);

    if (field === "body" || isTiptapDoc(raw)) {
      const body = raw ?? section.content.body ?? section.content.text;
      if (!docHasText(body) && !editing) return null;
      return (
        <div className="vr-layout-element vr-layout-element--rich vr-body">
          <EditableRichText
            className={options.className ?? "vr-rich"}
            selection={selection}
            value={body}
            appearance={appearance}
          />
        </div>
      );
    }

    let value = typeof raw === "string" ? raw : raw == null ? "" : "";
    if (field === "title" && section.section_type === "hero" && !value) {
      value = String(settings.site_name || PAGE_COPY_DEFAULTS.heroTitle);
    }
    if (field === "heading" && section.section_type === "contact" && !value) value = PAGE_COPY_DEFAULTS.contactHeading;
    if (field === "label" && section.section_type === "private_lessons" && !value) value = PAGE_COPY_DEFAULTS.privateLabel;
    if (field === "actionLabel" && section.section_type === "private_lessons" && !value) value = PAGE_COPY_DEFAULTS.privateAction;
    if (field === "moreInfoLabel" && !value) value = PAGE_COPY_DEFAULTS.moreInfoLabel;
    if (field === "datesLabel" && !value) value = PAGE_COPY_DEFAULTS.datesLabel;
    if (field === "headTeadaLabel" && !value) value = PAGE_COPY_DEFAULTS.headTeadaLabel;
    if (field === "tasakaalLabel" && !value) value = PAGE_COPY_DEFAULTS.tasakaalLabel;
    if (field === "registerHeading" && !value) value = PAGE_COPY_DEFAULTS.registerHeading;

    if (field === "headTeadaLabel" && !section.content.headTeadaLink && !editing) return null;
    if (field === "datesLabel" && !section.content.showDates && !editing) return null;
    if (field === "tasakaalLabel") {
      const offeringId = String(section.content.offeringId ?? "");
      const tasakaal = offeringId ? offerings[offeringId]?.tasakaal : "";
      if (!tasakaal && !editing) return null;
      const label = value || PAGE_COPY_DEFAULTS.tasakaalLabel;
      return (
        <div className="vr-layout-element vr-layout-element--text">
          <p>
            <EditableText
              as="span"
              selection={selection}
              path={{ kind: "section-content", sectionId: section.id, key: field }}
              value={label}
              appearance={appearance}
            />
            {tasakaal ? `: ${tasakaal}` : editing ? ": " : null}
          </p>
        </div>
      );
    }
    if (field === "datesLabel") {
      const offeringId = String(section.content.offeringId ?? "");
      const events = eventsByOffering[offeringId] ?? [];
      if (!events.length && !editing) return null;
      return (
        <div className="vr-layout-element">
          <EditableText
            as="p"
            selection={selection}
            path={{ kind: "section-content", sectionId: section.id, key: field }}
            value={value}
            appearance={appearance}
          />
          {events.length > 0 ? (
            <ul className="vr-dates">
              {events.map((event) => (
                <li key={event.id}>{event.display_date}</li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    }
    if (field === "headTeadaLabel") {
      return (
        <p>
          <Link className="vr-text-link" href="/hea-teada">
            <EditableText
              as="span"
              className="vr-text-link"
              selection={selection}
              path={{ kind: "section-content", sectionId: section.id, key: field }}
              value={value}
              clickMode="defer"
            />
          </Link>
        </p>
      );
    }
    if (field === "registerHeading") {
      const offeringId = String(section.content.offeringId ?? "");
      const offering = offeringId ? offerings[offeringId] : undefined;
      if (!offering && !editing) return null;
      return (
        <div className="vr-layout-element">
          {offering ? (
            <RegistrationBlock
              offering={offering}
              fallbackEmail={settings.default_registration_email ?? settings.contact_email}
              heading={
                <EditableText
                  as="h2"
                  className="vr-heading"
                  selection={selection}
                  path={{ kind: "section-content", sectionId: section.id, key: field }}
                  value={value}
                  appearance={appearance}
                />
              }
            />
          ) : editing ? (
            <EditableText
              as="h2"
              className="vr-heading"
              selection={selection}
              path={{ kind: "section-content", sectionId: section.id, key: field }}
              value={value}
              appearance={appearance}
            />
          ) : null}
        </div>
      );
    }
    if (field === "actionLabel") {
      return (
        <div className="vr-layout-element">
          <Link className="vr-cta" href="/kontakt?teema=eratund">
            <EditableText
              as="span"
              selection={{ ...selection, type: "link" }}
              path={{ kind: "section-content", sectionId: section.id, key: field }}
              value={value}
              clickMode="defer"
            />
          </Link>
        </div>
      );
    }

    if (!value && hideIfEmpty) return null;
    if (raw && typeof raw === "object" && !isTiptapDoc(raw)) {
      return renderMediaPlaceholder({ id: `${prefix}.${field}`, type: "element", elementType: "text", label: "Komponent", field }, "Komponent");
    }

    const isHeroTitle = field === "title" && section.section_type === "hero";
    const isHeading = field === "heading" || field === "title";
    const Tag = options.as ?? (isHeroTitle ? "h1" : isHeading ? (section.section_type === "contact" ? "h1" : "h2") : "div");
    const className =
      options.className ??
      (isHeroTitle ? "vr-wordmark vr-wordmark--hero" : isHeading ? (section.section_type === "contact" ? "vr-page-title" : "vr-heading") : "vr-body");

    return (
      <div className={["vr-layout-element", Tag === "span" ? "" : "vr-layout-element--text"].filter(Boolean).join(" ")}>
        <EditableText
          as={Tag}
          className={className}
          selection={selection}
          path={{ kind: "section-content", sectionId: section.id, key: field }}
          value={value}
          appearance={appearance}
          multiline={options.multiline ?? (field === "intro" || field === "plain" || field === "scheduleText" || field === "notes" || field === "bring" || field === "clothing" || Boolean(parseIndexedField(field)))}
          clickMode={options.clickMode}
        />
      </div>
    );
  }

  function renderOfferingCard(offering: OfferingRow): ReactNode {
    const label = String(section.content.moreInfoLabel ?? PAGE_COPY_DEFAULTS.moreInfoLabel);
    const editing = Boolean(editor && !editor.state.preview);
    return (
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
          appearance={fieldStyle(section, textStyleKey({ field: "short_title", offeringId: offering.id }) ?? `${offering.id}.short_title`)}
        />
        {offering.schedule_summary || editing ? (
          <EditableText
            selection={{
              id: `${prefix}.${offering.id}.schedule`,
              type: "text",
              sectionId: section.id,
              offeringId: offering.id,
              field: "schedule_summary",
            }}
            path={{ kind: "offering", offeringId: offering.id, key: "schedule_summary" }}
            value={offering.schedule_summary ?? ""}
            appearance={fieldStyle(section, textStyleKey({ field: "schedule_summary", offeringId: offering.id }) ?? `${offering.id}.schedule_summary`)}
          />
        ) : null}
        {offering.location_name || editing ? (
          <EditableText
            selection={{
              id: `${prefix}.${offering.id}.location`,
              type: "text",
              sectionId: section.id,
              offeringId: offering.id,
              field: "location_name",
            }}
            path={{ kind: "offering", offeringId: offering.id, key: "location_name" }}
            value={offering.location_name ?? ""}
            appearance={fieldStyle(section, textStyleKey({ field: "location_name", offeringId: offering.id }) ?? `${offering.id}.location_name`)}
          />
        ) : null}
        {offering.address || editing ? (
          <EditableText
            selection={{
              id: `${prefix}.${offering.id}.address`,
              type: "text",
              sectionId: section.id,
              offeringId: offering.id,
              field: "address",
            }}
            path={{ kind: "offering", offeringId: offering.id, key: "address" }}
            value={offering.address ?? ""}
            appearance={fieldStyle(section, textStyleKey({ field: "address", offeringId: offering.id }) ?? `${offering.id}.address`)}
          />
        ) : null}
        <p>
          <Link className="vr-text-link" href={pageHref(offering.slug)}>
            <EditableText
              as="span"
              className="vr-text-link"
              selection={{
                id: `${prefix}.${offering.id}.moreInfo`,
                type: "text",
                sectionId: section.id,
                field: "moreInfoLabel",
              }}
              path={{ kind: "section-content", sectionId: section.id, key: "moreInfoLabel" }}
              value={label}
              clickMode="defer"
            />
          </Link>
        </p>
      </article>
    );
  }

  if (section.section_type === "spacer") {
    return <SectionShell section={section} slug={slug} specksOn={false} themeDensity={themeDensity}>{null}</SectionShell>;
  }

  const reading = slug !== "avaleht" && isReadingSection(section);
  const innerClass = [
    section.section_type === "hero" ? "vr-section-inner--hero" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const contentClass = [
    reading ? "vr-reading vr-body" : "",
    section.section_type === "rich_text" && slug === "avaleht" && !isSplitLayout(section) ? "vr-centered vr-body" : "",
    section.section_type === "faq" ? "vr-faq" : "",
    section.section_type === "private_lessons" ? "vr-centered vr-private" : "",
    section.section_type === "contact" && !isSplitLayout(section) ? "vr-centered" : "",
    section.section_type === "offering_overview" && !isSplitLayout(section) ? "vr-offering-group" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SectionShell section={section} slug={slug} specksOn={specksOn} themeDensity={themeDensity}>
      <SectionInner className={innerClass || undefined}>
        <div className={contentClass || undefined} style={align ? { textAlign: align } : undefined}>
          {renderLayoutNode(tree.root)}
        </div>
      </SectionInner>
    </SectionShell>
  );
}

