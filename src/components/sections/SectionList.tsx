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
import { MediaFrame, ScreenSection, SectionInner, SplitLayout } from "@/components/layout/primitives";
import { useOptionalEditor } from "@/components/editor/EditorProvider";
import { fieldStyle, photoClassName } from "@/lib/editor/appearance";
import { textStyleKey } from "@/lib/editor/text-style";
import { getSectionLayoutTree, ratioToLeftPercent } from "@/lib/editor/layout-tree";
import { pageHref } from "@/lib/utils/urls";
import { docHasText } from "@/lib/content/rich-text";
import type { EventRow, LayoutColumnNode, LayoutElementNode, LayoutGroupNode, LayoutNode, MediaRow, OfferingRow, SectionRow, SiteSettings } from "@/types/content";

function resolveNodeMediaId(section: SectionRow, node: { field?: string }, fallback?: string): string | undefined {
  if (node.field && node.field.startsWith("custom.")) {
    const raw = section.content[node.field];
    if (raw && typeof raw === "object" && typeof (raw as { mediaId?: unknown }).mediaId === "string") {
      return (raw as { mediaId: string }).mediaId || undefined;
    }
    return undefined;
  }
  return fallback;
}

function resolveSectionMediaId(section: SectionRow): string | undefined {
  if (Object.prototype.hasOwnProperty.call(section.style ?? {}, "mediaId")) {
    return typeof section.style?.mediaId === "string" && section.style.mediaId ? section.style.mediaId : undefined;
  }
  return typeof section.content.mediaId === "string" && section.content.mediaId ? section.content.mediaId : undefined;
}

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
  fallback,
  className,
}: {
  section: SectionRow;
  image?: MediaRow;
  fallback?: ReactNode;
  className?: string;
}) {
  const editor = useOptionalEditor();
  const crop = section.style?.image?.crop ?? (section.section_type === "hero" ? "original" : "landscape");
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
      width={section.section_type === "hero" ? undefined : section.style?.image?.width}
      radius={section.style?.image?.radius}
      align={section.style?.image?.align}
    >
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
      className={["vr-layout-node", className].filter(Boolean).join(" ")}
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
  const mediaId = resolveSectionMediaId(section);
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
    if (node.elementType === "image") return { id: `${section.id}.${node.field ?? "image"}`, type: "image", field: node.field ?? "image", mediaId: resolveNodeMediaId(section, node, mediaId) };
    if (node.elementType === "text" && node.field) {
      return { id: node.field === "body" ? `${prefix}.body` : `${prefix}.${node.field}`, type: "text", field: node.field };
    }
    if (node.elementType === "offering") return { id: node.id, type: "text", offeringId: node.offeringId };
    if (node.field) return { id: `${prefix}.${node.field}`, type: "text", field: node.field };
    return { id: node.id, type: "container" };
  }

  function renderLayoutElement(node: LayoutElementNode): ReactNode {
    if (node.elementType === "image") {
      const nodeMediaId = resolveNodeMediaId(section, node, image?.id);
      const nodeImage = nodeMediaId ? media[nodeMediaId] : node.field?.startsWith("custom.") ? undefined : image;
      if (section.section_type === "hero" && !nodeImage && !node.field?.startsWith("custom.")) {
        if (section.content.showEmblem === false) return null;
        return (
          <div className="vr-layout-element vr-layout-element--hero-art">
            <SectionImage section={section} fallback={<Emblem className="vr-emblem" />} className="vr-hero-artwork" />
          </div>
        );
      }
      if (!nodeImage) {
        if (!editor || editor.state.preview) return null;
        return (
          <div className="vr-layout-element vr-layout-element--media">
            <EditableNode selection={{ id: `${section.id}.${node.field ?? "image"}`, type: "image", sectionId: section.id, field: node.field ?? "image", layoutNodeId: node.id }} className="vr-editorial-placeholder vr-editorial-placeholder--image" as="div">
              Vali pilt
            </EditableNode>
          </div>
        );
      }
      return (
        <div className={["vr-layout-element vr-layout-element--media", section.section_type === "hero" && !node.field?.startsWith("custom.") ? "vr-layout-element--hero-art" : ""].filter(Boolean).join(" ")}>
          <SectionImage section={section} image={nodeImage} className={section.section_type === "hero" && !node.field?.startsWith("custom.") ? "vr-hero-artwork" : undefined} />
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

  function renderTextField(field: string): ReactNode {
    const selection = { id: field === "body" ? `${prefix}.body` : `${prefix}.${field}`, type: "text" as const, sectionId: section.id, field };
    if (field === "title") {
      const titleAppearance = fieldStyle(section, field);
      return (
        <div className="vr-layout-element vr-layout-element--text">
          <EditableText
            as={section.section_type === "hero" ? "h1" : "h2"}
            className={section.section_type === "hero" ? "vr-wordmark vr-wordmark--hero" : "vr-heading"}
            selection={selection}
            path={{ kind: "section-content", sectionId: section.id, key: field }}
            value={typeof section.content.title === "string" && section.content.title ? section.content.title : String(settings.site_name || "VAIKUSRUUM")}
            appearance={titleAppearance}
          />
        </div>
      );
    }
    if (field === "heading") {
      const value = typeof section.content.heading === "string" ? section.content.heading : "";
      if (!value && !editor) return null;
      return (
        <div className="vr-layout-element">
          <EditableText
            as={section.section_type === "contact" ? "h1" : "h2"}
            className={section.section_type === "contact" ? "vr-page-title" : "vr-heading"}
            selection={selection}
            path={{ kind: "section-content", sectionId: section.id, key: field }}
            value={value}
            appearance={fieldStyle(section, field)}
          />
        </div>
      );
    }
    if (field === "intro" || field === "plain") {
      const value = typeof section.content[field] === "string" ? section.content[field] : "";
      if (!value && !editor) return null;
      return (
        <div className="vr-layout-element">
          <EditableText
            as="div"
            className="vr-body"
            selection={selection}
            path={{ kind: "section-content", sectionId: section.id, key: field }}
            value={value}
            appearance={fieldStyle(section, field)}
            multiline
          />
        </div>
      );
    }
    if (field === "body") {
      const body = section.content.body ?? section.content.text;
      return (
        <div className="vr-layout-element vr-layout-element--rich vr-body">
          <EditableRichText
            className="vr-rich"
            selection={selection}
            value={body}
            appearance={fieldStyle(section, field)}
          />
        </div>
      );
    }
    const raw = section.content[field];
    if (typeof raw === "string") {
      return (
        <div className="vr-layout-element vr-layout-element--text">
          <EditableText
            as="div"
            className="vr-body"
            selection={selection}
            path={{ kind: "section-content", sectionId: section.id, key: field }}
            value={raw}
            appearance={fieldStyle(section, field)}
            multiline
          />
        </div>
      );
    }
    if (raw && typeof raw === "object") {
      return renderMediaPlaceholder({ id: `${prefix}.${field}`, type: "element", elementType: "text", label: "Komponent", field }, "Komponent");
    }
    if (editor && !editor.state.preview) {
      return (
        <div className="vr-layout-element vr-layout-element--text">
          <EditableText
            as="div"
            className="vr-body"
            selection={selection}
            path={{ kind: "section-content", sectionId: section.id, key: field }}
            value=""
            appearance={fieldStyle(section, field)}
            multiline
          />
        </div>
      );
    }
    return null;
  }

  function renderOfferingCard(offering: OfferingRow): ReactNode {
    const label = String(section.content.moreInfoLabel ?? "rohkem infot");
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
              clickMode="defer"
            />
          </Link>
        </p>
      </article>
    );
  }

  if (section.section_type === "spacer") {
    return <SectionShell section={section} specksOn={false} themeDensity={themeDensity}>{null}</SectionShell>;
  }

  if (section.section_type === "hero") {
    return (
      <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
        <SectionInner className="vr-section-inner--hero">
          {renderLayoutNode(tree.root)}
        </SectionInner>
      </SectionShell>
    );
  }

  if (section.section_type === "split_media_text" || section.section_type === "rich_text") {
    if (tree.root.type === "columns" && (slug === "avaleht" || section.section_type === "split_media_text")) {
      return (
        <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
          <SectionInner>
            {renderLayoutNode(tree.root)}
          </SectionInner>
        </SectionShell>
      );
    }
    const heading = typeof section.content.heading === "string" ? section.content.heading : "";
    const body = section.content.body ?? section.content.text;
    const textOnly = layout === "text-only" || layout === "centered" || (!image && layout !== "image-only");
    const hasMedia = Boolean(image) && layout !== "text-only" && layout !== "centered";
    const reading = layout === "centered" || textOnly;
    const longForm = slug !== "avaleht" && (section.section_type === "rich_text" || textOnly);
    const textClass = longForm ? "vr-reading vr-body" : reading ? "vr-centered vr-body" : "vr-narrow vr-body";
    const defaultTextAlign = longForm ? "left" : reading ? "center" : "left";

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
        style={{ textAlign: align ?? defaultTextAlign }}
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
    if (tree.root.type === "columns") {
      return (
        <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
          <SectionInner>
            {renderLayoutNode(tree.root)}
          </SectionInner>
        </SectionShell>
      );
    }
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
                appearance={fieldStyle(section, textStyleKey({ field: "short_title", offeringId: offering.id }) ?? `${offering.id}.short_title`)}
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
                    clickMode="defer"
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
                    clickMode="defer"
                  />
            </Link>
          </div>
        </SectionInner>
      </SectionShell>
    );
  }

  if (section.section_type === "contact") {
    if (slug === "avaleht" && tree.root.type === "columns") {
      return (
        <SectionShell section={section} specksOn={specksOn} themeDensity={themeDensity}>
          <SectionInner>
            {renderLayoutNode(tree.root)}
          </SectionInner>
        </SectionShell>
      );
    }
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
