"use client";

import { useEffect, useState, type PointerEvent } from "react";
import { useEditor } from "@/components/editor/EditorProvider";
import { RichEditor } from "@/components/admin/RichEditor";
import {
  EditorButton,
  EditorCheck,
  EditorCollapse,
  EditorColor,
  EditorContext,
  EditorDivider,
  EditorGroup,
  EditorIconButton,
  EditorSegmented,
  EditorSelect,
  EditorSlider,
  EditorSpinner,
  EditorSwitch,
  EditorTextInput,
  EditorTextarea,
  EditorTooltip,
} from "@/components/editor/ui";
import { findSection, pageSections } from "@/lib/editor/draft";
import { fieldStyle } from "@/lib/editor/appearance";
import { themeColorSwatches } from "@/lib/editor/color";
import { findLayoutNode, getSectionLayoutTree, ratioToLeftPercent, sectionLayoutSummary } from "@/lib/editor/layout-tree";
import { pageLabel } from "@/lib/editor/pages";
import { ADDABLE_SECTIONS } from "@/lib/editor/types";
import { ALL_FONTS, BODY_FONTS, DISPLAY_FONTS } from "@/lib/theme/theme";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/utils/compress-image";
import { mediaPublicUrl } from "@/lib/utils/urls";
import type { AnimationAppearance, HeightPreset, LayoutNode, MediaRow, OfferingRow, SectionRow, SectionStyle, TextAppearance, VerticalAlign } from "@/types/content";
import type { TiptapNode } from "@/types/content";

const FONT_OPTIONS = ALL_FONTS.map((font) => ({
  value: font.id,
  label: font.label,
  fontFamily: font.css,
}));

function createMediaStoragePath(ext: string) {
  return `${Date.now()}-${crypto.randomUUID()}.${ext}`;
}

export function Inspector() {
  const editor = useEditor();
  const { state } = editor;
  const hasContext = Boolean(state.selected || state.themePanel);
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return 320;
    const stored = Number(window.localStorage.getItem("vr.editor.inspectorWidth"));
    return Number.isFinite(stored) ? clampInspectorWidth(stored) : 320;
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--editor-sidebar-width", `${width}px`);
  }, [width]);

  function onResizePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);
    const move = (moveEvent: globalThis.PointerEvent) => {
      const next = clampInspectorWidth(moveEvent.clientX);
      setWidth(next);
      window.localStorage.setItem("vr.editor.inspectorWidth", String(next));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <aside className="vr-inspector" aria-label="Redaktor" style={{ width }}>
      <div className="vr-inspector-top">
        <div className="vr-inspector-tabs">
          <EditorTooltip label="Sisu / elemendid">
            <EditorIconButton
              ariaLabel="Sisu"
              active={state.inspectorTab === "content" && !state.themePanel}
              onClick={() => {
                editor.setThemePanel(false);
                editor.setTab("content");
              }}
            >
              A
            </EditorIconButton>
          </EditorTooltip>
          <EditorTooltip label="Välimus">
            <EditorIconButton
              ariaLabel="Välimus"
              active={state.inspectorTab === "appearance" || state.themePanel}
              onClick={() => {
                editor.setThemePanel(false);
                editor.setTab("appearance");
              }}
            >
              <BrushIcon />
            </EditorIconButton>
          </EditorTooltip>
          <EditorTooltip label="Animatsioon">
            <EditorIconButton
              ariaLabel="Animatsioon"
              active={state.inspectorTab === "animation" && !state.themePanel}
              onClick={() => {
                editor.setThemePanel(false);
                editor.setTab("animation");
              }}
            >
              <PlayIcon />
            </EditorIconButton>
          </EditorTooltip>
          <EditorTooltip label="Seaded">
            <EditorIconButton
              ariaLabel="Seaded"
              active={state.inspectorTab === "settings" && !state.themePanel}
              onClick={() => {
                editor.setThemePanel(false);
                editor.setTab("settings");
              }}
            >
              <GearIcon />
            </EditorIconButton>
          </EditorTooltip>
        </div>
      </div>
      <div className="vr-inspector-contextbar">
        <EditorIconButton
          ariaLabel="Tagasi"
          disabled={!hasContext}
          onClick={() => {
            editor.deselect();
            editor.setThemePanel(false);
            editor.setTab("content");
          }}
        >
          ‹
        </EditorIconButton>
        <span>{state.selected ? selectedKindLabel(state.selected.type) : state.themePanel ? "Üldine välimus" : "Leht"}</span>
        <EditorIconButton
          ariaLabel="Sulge"
          onClick={() => {
            if (hasContext) {
              editor.deselect();
              editor.setThemePanel(false);
            } else {
              editor.closeInspector();
            }
          }}
        >
          ×
        </EditorIconButton>
      </div>
      <div className="vr-inspector-scroll">
        {state.themePanel ? <ThemePanel /> : <SelectionPanels />}
      </div>
      <EditorFooterControls />
      <button
        type="button"
        className="vr-inspector-resize"
        aria-label="Muuda paneeli laiust"
        onPointerDown={onResizePointerDown}
        onDoubleClick={() => {
          setWidth(320);
          window.localStorage.setItem("vr.editor.inspectorWidth", "320");
        }}
      />
    </aside>
  );
}

function clampInspectorWidth(value: number) {
  return Math.min(460, Math.max(270, Math.round(value)));
}

function EditorGlobalBrowser() {
  const editor = useEditor();
  const [addOpen, setAddOpen] = useState(false);
  const page = editor.state.draft.pages.find((item) => item.id === editor.state.pageId);
  const visiblePages = editor.state.draft.pages.filter((item) => item.show_in_nav && item.is_published);
  const hiddenPages = editor.state.draft.pages.filter((item) => !item.show_in_nav || !item.is_published);

  if (!page) return null;

  return (
    <>
      <EditorContext kicker="Pages" title={pageLabel(page)} />
      <div className="vr-ed-pages">
        {visiblePages.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === page.id ? "is-active" : undefined}
            onClick={() => editor.requestSwitchPage(item.id)}
          >
            {pageLabel(item)}
          </button>
        ))}
        {hiddenPages.length ? <hr className="vr-ed-divider" /> : null}
        {hiddenPages.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === page.id ? "is-active" : undefined}
            onClick={() => editor.requestSwitchPage(item.id)}
          >
            {pageLabel(item)}
            <span className="vr-ed-muted">peidetud</span>
          </button>
        ))}
      </div>
      <EditorDivider />
      <EditorContext kicker="Elements" title={`${pageLabel(page)} (${pageSections(editor.state.draft, page.id).length})`} />
      <EditorElementTree />
      <EditorDivider />
      <div className="vr-inspector-add">
        <EditorButton variant="ghost" onClick={() => setAddOpen((open) => !open)}>
          + Lisa sektsioon
        </EditorButton>
        {addOpen ? (
          <div className="vr-editor-menu" onClick={(event) => event.stopPropagation()}>
            {ADDABLE_SECTIONS.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  editor.addSection(item.type);
                  setAddOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

function EditorFooterControls() {
  const editor = useEditor();
  const { state } = editor;
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const saveText = state.saving ? "Salvestan…" : state.saveFlash && !state.dirty ? "Salvestatud" : "Salvesta";

  return (
    <div className="vr-inspector-footer">
      <EditorSegmented
        value={state.breakpoint}
        options={[
          { value: "desktop", label: "Desktop" },
          { value: "tablet", label: "Tahvel" },
          { value: "mobile", label: "Mobiil" },
        ]}
        onChange={(value) => editor.setBreakpoint(value)}
      />
      <div className="vr-inspector-footer-row">
        <EditorIconButton ariaLabel="Võta tagasi" disabled={!canUndo} onClick={() => editor.undo()}>
          ↶
        </EditorIconButton>
        <EditorIconButton ariaLabel="Tee uuesti" disabled={!canRedo} onClick={() => editor.redo()}>
          ↷
        </EditorIconButton>
        <EditorButton variant="secondary" onClick={() => editor.setPreview(!state.preview)}>
          {state.preview ? "Tagasi muutma" : "Eelvaade"}
        </EditorButton>
      </div>
      {state.saveError ? <p className="vr-form-error vr-editor-error">{state.saveError}</p> : null}
      <EditorButton
        variant="primary"
        className="vr-inspector-save"
        disabled={state.saving || !state.dirty}
        onClick={() => void editor.save()}
      >
        {state.saving ? <EditorSpinner /> : null}
        {saveText}
      </EditorButton>
      <div className="vr-inspector-exits">
        <button type="button" onClick={() => editor.requestNavigation("/admin")}>
          Haldus
        </button>
        <button type="button" onClick={() => editor.requestNavigation("/")}>
          Välju
        </button>
      </div>
    </div>
  );
}

function SelectionPanels() {
  const editor = useEditor();
  const tab = editor.state.inspectorTab;
  const selected = editor.state.selected;
  if (!selected) {
    if (tab === "appearance") return <ThemePanel />;
    if (tab === "animation") return <PageAnimationPlaceholder />;
    if (tab === "settings") return <PageOverview mode="settings" />;
    return <PageOverview />;
  }
  if (selected.type === "container") return <ContainerPanel />;
  if (selected.type === "image") return <ImagePanel />;
  if (selected.type === "text" && isStructuredContentSelection(editor)) return <StructuredContentPanel />;
  if (tab === "appearance") return <AppearancePanel />;
  if (tab === "animation") return <AnimationPanel />;
  if (tab === "settings") return <SettingsPanel />;
  if (selected.type === "section") return <SectionPanel />;
  if (selected.type === "header") return <HeaderPanel />;
  if (selected.type === "nav") return <NavItemPanel />;
  return <ContentPanel />;
}

function isStructuredContentSelection(editor: ReturnType<typeof useEditor>) {
  const selected = editor.state.selected;
  if (!selected?.sectionId || !selected.field) return false;
  const section = findSection(editor.state.draft, selected.sectionId);
  const raw = section?.content[selected.field];
  return Boolean(raw && typeof raw === "object" && selected.field.startsWith("custom."));
}

function StructuredContentPanel() {
  const editor = useEditor();
  const selected = editor.state.selected!;
  const raw = selected.sectionId && selected.field ? findSection(editor.state.draft, selected.sectionId)?.content[selected.field] : undefined;
  const [error, setError] = useState("");
  const value = JSON.stringify(raw ?? {}, null, 2);

  function commit(next: string, record: boolean) {
    try {
      setError("");
      editor.setPath(
        { kind: "section-content", sectionId: selected.sectionId!, key: selected.field! },
        JSON.parse(next) as unknown,
        record,
      );
    } catch {
      setError("JSON peab olema korrektne.");
    }
  }

  return (
    <div className="vr-inspector-body">
      <EditorContext kicker="Komponent" title={selected.field?.split(".")[1] ?? "Element"} />
      <EditorGroup label="Seaded">
        <EditorTextarea rows={10} value={value} onChange={(next) => commit(next, false)} onCommit={(next) => commit(next, true)} />
      </EditorGroup>
      {error ? <p className="vr-form-error">{error}</p> : null}
      <p className="vr-ed-help">Selle komponendi sisu salvestub struktureeritud JSON-ina sektsiooni sisusse.</p>
    </div>
  );
}

function PageOverview({ mode = "content" }: { mode?: "content" | "settings" }) {
  const editor = useEditor();
  const page = editor.state.draft.pages.find((item) => item.id === editor.state.pageId);
  if (!page) return null;

  return (
    <div className="vr-inspector-empty">
      {mode === "content" ? (
        <>
          <EditorGlobalBrowser />
          <EditorDivider />
        </>
      ) : null}
      <EditorContext kicker="Leht" title={page.title} />
      <EditorGroup label="Pealkiri">
        <EditorTextInput value={page.title} onChange={(title) => editor.patchPage(page.id, { title }, false)} onCommit={(title) => editor.patchPage(page.id, { title }, true)} />
      </EditorGroup>
      <EditorGroup label="Menüü nimi">
        <EditorTextInput
          value={page.nav_label ?? ""}
          onChange={(nav_label) => editor.patchPage(page.id, { nav_label }, false)}
          onCommit={(nav_label) => editor.patchPage(page.id, { nav_label }, true)}
        />
      </EditorGroup>
      {editor.role === "owner" ? (
        <EditorGroup label="URL">
          <EditorTextInput value={page.slug} onChange={(slug) => editor.patchPage(page.id, { slug }, false)} onCommit={(slug) => editor.patchPage(page.id, { slug }, true)} />
        </EditorGroup>
      ) : null}
      <EditorCheck checked={page.show_in_nav} onChange={(show_in_nav) => editor.patchPage(page.id, { show_in_nav }, true)}>
        Näita menüüs
      </EditorCheck>
      <EditorCheck checked={page.is_published} onChange={(is_published) => editor.patchPage(page.id, { is_published }, true)}>
        Avaldatud
      </EditorCheck>
      <EditorGroup label="SEO pealkiri">
        <EditorTextInput
          value={page.seo_title ?? ""}
          onChange={(seo_title) => editor.patchPage(page.id, { seo_title }, false)}
          onCommit={(seo_title) => editor.patchPage(page.id, { seo_title }, true)}
        />
      </EditorGroup>
      <EditorGroup label="SEO kirjeldus">
        <EditorTextarea
          value={page.seo_description ?? ""}
          onChange={(seo_description) => editor.patchPage(page.id, { seo_description }, false)}
          onCommit={(seo_description) => editor.patchPage(page.id, { seo_description }, true)}
        />
      </EditorGroup>
      <p className="vr-ed-label">Klõpsa lehel mõnel elemendil, et selle sisu või välimust muuta.</p>
    </div>
  );
}

function EditorElementTree() {
  const editor = useEditor();
  const page = editor.state.draft.pages.find((item) => item.id === editor.state.pageId);
  if (!page) return null;
  const sections = pageSections(editor.state.draft, page.id);
  return (
    <div className="vr-element-tree">
      {sections.map((section, sectionIndex) => (
        <details key={section.id} className="vr-element-group" open>
          <summary
            data-selected={editor.state.selected?.id === `section.${section.id}` ? "true" : undefined}
            data-hovered={editor.state.hoveredNodeId === `section.${section.id}` ? "true" : undefined}
            draggable
            onDragStart={(event) => {
              editor.setDraggedNode(`section.${section.id}`);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("application/x-vr-section", JSON.stringify({ sectionId: section.id }));
              event.dataTransfer.setData("text/plain", semanticSectionName(section, page.slug));
            }}
            onDragEnd={() => editor.setDraggedNode(null)}
            onDragOver={(event) => {
              if (!editor.state.draggedNodeId?.startsWith("section.")) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const raw = event.dataTransfer.getData("application/x-vr-section");
              if (!raw) return;
              const dragged = JSON.parse(raw) as { sectionId: string };
              editor.moveSectionToIndex(dragged.sectionId, sectionIndex);
            }}
            onClick={(event) => {
              event.preventDefault();
              editor.select({ id: `section.${section.id}`, type: "section", sectionId: section.id });
            }}
            onMouseEnter={() => editor.setHoveredNode(`section.${section.id}`)}
            onMouseLeave={() => editor.setHoveredNode(null)}
          >
            <span className="vr-element-icon">▣</span>
            <span>
              <strong>{semanticSectionName(section, page.slug)}</strong>
              <small>{sectionLayoutSummary(section)}</small>
            </span>
          </summary>
          <div className="vr-element-children">
            <LayoutTreeNode section={section} node={getSectionLayoutTree(section).root} slug={page.slug} />
          </div>
        </details>
      ))}
    </div>
  );
}

function LayoutTreeNode({ section, node, slug }: { section: SectionRow; node: LayoutNode; slug: string }) {
  const editor = useEditor();
  const selected = editor.state.selected?.id === node.id;

  if (node.type === "columns") {
    return (
      <details className="vr-element-node" open>
        <summary
          data-selected={selected ? "true" : undefined}
          data-hovered={editor.state.hoveredNodeId === node.id ? "true" : undefined}
          onClick={(event) => {
            event.preventDefault();
            editor.select({ id: node.id, type: "container", sectionId: section.id });
          }}
          onMouseEnter={() => editor.setHoveredNode(node.id)}
          onMouseLeave={() => editor.setHoveredNode(null)}
        >
          <span className="vr-element-icon">▥</span>
          <span>
            <strong>{node.label}</strong>
            <small>{sectionLayoutSummary(section)}</small>
          </span>
        </summary>
        <div className="vr-element-children">
          {node.columns.map((column) => (
            <LayoutTreeNode key={column.id} section={section} node={column} slug={slug} />
          ))}
        </div>
      </details>
    );
  }

  if (node.type === "column" || node.type === "group") {
    return (
      <details className="vr-element-node" open>
        <summary
          data-selected={selected ? "true" : undefined}
          data-hovered={editor.state.hoveredNodeId === node.id ? "true" : undefined}
          onClick={(event) => {
            event.preventDefault();
            editor.select({ id: node.id, type: "container", sectionId: section.id });
          }}
          onDragOver={(event) => {
            if (!editor.state.draggedNodeId || editor.state.draggedNodeId.startsWith("section.")) return;
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const raw = event.dataTransfer.getData("application/x-vr-node");
            if (!raw) return;
            const dragged = JSON.parse(raw) as { sectionId: string; nodeId: string };
            if (dragged.sectionId !== section.id) return;
            editor.moveNode(section.id, dragged.nodeId, node.id, node.children.length);
          }}
          onMouseEnter={() => editor.setHoveredNode(node.id)}
          onMouseLeave={() => editor.setHoveredNode(null)}
        >
          <span className="vr-element-icon">{node.type === "column" ? "▤" : "▧"}</span>
          <span>
            <strong>{node.label}</strong>
            <small>{node.children.length} elementi</small>
          </span>
        </summary>
        <div className="vr-element-children">
          {node.children.map((child, index) => (
            <LayoutTreeNodeWithDrop key={child.id} section={section} parentId={node.id} index={index} node={child} slug={slug} />
          ))}
        </div>
      </details>
    );
  }

  const row = layoutElementRow(section, node, slug);
  return (
    <button
      type="button"
      className="vr-element-leaf"
      data-selected={editor.state.selected?.id === row.selection.id ? "true" : undefined}
      data-hovered={editor.state.hoveredNodeId === row.selection.id ? "true" : undefined}
      draggable
      onDragStart={(event) => {
        editor.setDraggedNode(node.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-vr-node", JSON.stringify({ sectionId: section.id, nodeId: node.id, label: node.label }));
        event.dataTransfer.setData("text/plain", node.label);
      }}
      onDragEnd={() => editor.setDraggedNode(null)}
      onClick={() => editor.select(row.selection)}
      onMouseEnter={() => editor.setHoveredNode(row.selection.id)}
      onMouseLeave={() => editor.setHoveredNode(null)}
    >
      <span className="vr-element-icon">{row.icon}</span>
      <span>
        <strong>{row.label}</strong>
        {row.preview ? <small>{row.preview}</small> : null}
      </span>
    </button>
  );
}

function LayoutTreeNodeWithDrop({
  section,
  parentId,
  index,
  node,
  slug,
}: {
  section: SectionRow;
  parentId: string;
  index: number;
  node: LayoutNode;
  slug: string;
}) {
  const editor = useEditor();
  return (
    <div
      onDragOver={(event) => {
        if (!editor.state.draggedNodeId || editor.state.draggedNodeId.startsWith("section.")) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData("application/x-vr-node");
        if (!raw) return;
        const dragged = JSON.parse(raw) as { sectionId: string; nodeId: string };
        if (dragged.sectionId !== section.id) return;
        editor.moveNode(section.id, dragged.nodeId, parentId, index);
      }}
    >
      <LayoutTreeNode section={section} node={node} slug={slug} />
    </div>
  );
}

function layoutElementRow(section: SectionRow, node: Extract<LayoutNode, { type: "element" }>, slug: string) {
  const prefix = `${slug}.${section.section_key}`;
  if (node.elementType === "image") {
    const mediaId = resolveSectionMediaId(section);
    return {
      icon: "◫",
      label: node.label,
      preview: mediaId ? "Pilt" : section.section_type === "hero" ? "emblem-source.svg" : undefined,
      selection: { id: `${section.id}.image`, type: "image" as const, sectionId: section.id, mediaId, field: "image" },
    };
  }
  if (node.elementType === "offering") {
    return {
      icon: "A",
      label: node.label,
      preview: "Tunni info",
      selection: {
        id: `${prefix}.${node.offeringId}.title`,
        type: "text" as const,
        sectionId: section.id,
        offeringId: node.offeringId,
        field: "short_title",
      },
    };
  }
  return {
    icon: node.elementType === "link" ? "↗" : "A",
    label: node.label,
    preview: node.field && typeof section.content[node.field] === "string" ? String(section.content[node.field]).slice(0, 42) : undefined,
    selection: { id: `${prefix}.${node.field ?? node.id}`, type: "text" as const, sectionId: section.id, field: node.field },
  };
}

function resolveSectionMediaId(section: SectionRow): string | undefined {
  if (Object.prototype.hasOwnProperty.call(section.style ?? {}, "mediaId")) {
    return typeof section.style?.mediaId === "string" && section.style.mediaId ? section.style.mediaId : undefined;
  }
  return typeof section.content.mediaId === "string" && section.content.mediaId ? section.content.mediaId : undefined;
}

function semanticSectionName(section: SectionRow, slug = "") {
  if (section.section_key === "hero") return "Hero";
  if (section.section_key === "miina") return "Tutvustus";
  if (section.section_key === "yoga") return "Jooga tutvustus";
  if (section.section_key === "offerings") return "Tunnid";
  if (section.section_key === "contact") return "Kontakt";
  if (slug === "minust" && section.section_key === "bio") return "Minust";
  const heading = section.content.heading || section.content.title || section.content.label;
  if (typeof heading === "string" && heading.trim() && section.section_type !== "hero") return heading.trim().slice(0, 34);
  switch (section.section_type) {
    case "hero":
      return "Hero";
    case "split_media_text":
      return "Pilt ja tekst";
    case "offering_overview":
      return "Tunnid";
    case "private_lessons":
      return "Eratunnid";
    case "faq":
      return "Küsimused ja vastused";
    case "important_info":
      return "Head teada";
    case "contact":
      return "Kontakt";
    default:
      return sectionTitle(section.section_type);
  }
}

function imageLabel(section: SectionRow, slug = "") {
  if (section.section_key === "hero") return "Hero kujund";
  if (section.section_key === "miina") return "Tutvustuse foto";
  if (section.section_key === "yoga") return "Jooga foto";
  if (section.section_key === "offerings") return "Tundide foto";
  if (section.section_key === "contact") return "Kontakti foto";
  if (slug === "minust" && section.section_key === "bio") return "Portree";
  return "Pilt";
}

function PageAnimationPlaceholder() {
  return (
    <div className="vr-inspector-empty">
      <EditorContext kicker="Animatsioon" title="Vali element" />
      <p className="vr-ed-help">Animatsiooni muutmiseks vali lehelt sektsioon, tekst või pilt.</p>
    </div>
  );
}

function ContentPanel() {
  const editor = useEditor();
  const selected = editor.state.selected!;
  const value = readText(editor);
  const kicker =
    selected.type === "nav" ? "Menüülink" : selected.type === "link" ? "Link" : selected.type === "image" ? "Pilt" : "Tekst";

  return (
    <div className="vr-inspector-body">
      <EditorContext kicker={kicker} title={labelFor(selected.id, value)} />
      {isRichTextSelection(editor) ? (
        <>
          <EditorGroup label="Tekst">
            <RichEditor
              value={readRichText(editor)}
              onChange={(next) => writeRichText(editor, next, false)}
              onCommit={(next) => writeRichText(editor, next, true)}
            />
          </EditorGroup>
          <p className="vr-ed-help">Lõuend renderdab tulemust. Sisu salvestub andmebaasi tavalise Salvesta nupuga.</p>
        </>
      ) : (
        <EditorGroup label="Tekst">
          <EditorTextarea
            rows={value.includes("\n") ? 8 : 3}
            value={value}
            onChange={(next) => writeText(editor, next, false)}
            onCommit={(next) => writeText(editor, next, true)}
          />
        </EditorGroup>
      )}
      {selected.type === "nav" ? <NavTarget /> : null}
      {selected.type === "link" ? (
        <EditorGroup label="Sihtkoht">
          <EditorSelect
            value="page"
            options={[
              { value: "page", label: "Leht" },
              { value: "url", label: "URL" },
              { value: "email", label: "E-post" },
              { value: "register", label: "Registreerimine" },
            ]}
            onChange={() => undefined}
          />
        </EditorGroup>
      ) : null}
      {selected.field?.startsWith("q.") || selected.field?.startsWith("a.") ? <FaqItemControls /> : null}
      <EditorButton variant="primary" onClick={() => editor.deselect()}>
        Valmis
      </EditorButton>
    </div>
  );
}

function readRichText(editor: ReturnType<typeof useEditor>): unknown {
  const selected = editor.state.selected;
  if (!selected?.sectionId || !selected.field) return undefined;
  const section = findSection(editor.state.draft, selected.sectionId);
  return section?.content[selected.field];
}

function writeRichText(editor: ReturnType<typeof useEditor>, value: TiptapNode, record: boolean) {
  const selected = editor.state.selected;
  if (!selected?.sectionId || !selected.field) return;
  editor.setPath({ kind: "section-content", sectionId: selected.sectionId, key: selected.field }, value, record);
}

function isRichTextSelection(editor: ReturnType<typeof useEditor>) {
  const selected = editor.state.selected;
  if (!selected?.sectionId || selected.field !== "body") return false;
  const section = findSection(editor.state.draft, selected.sectionId);
  return Boolean(section && typeof section.content.body === "object" && section.content.body !== null);
}

function AppearancePanel() {
  const editor = useEditor();
  const selected = editor.state.selected;
  if (!selected?.sectionId || !selected.field) return <ThemePanel />;
  const section = findSection(editor.state.draft, selected.sectionId);
  if (!section) return <ThemePanel />;
  const appearance = fieldStyle(section, selected.field) ?? {};
  const advanced = editor.state.advanced;
  const sectionId = selected.sectionId;
  const field = selected.field;
  const swatches = themeColorSwatches(editor.state.draft.theme);
  const inherited = !appearance.color;

  function patch(next: Partial<TextAppearance>, record = false) {
    editor.patchFieldStyle(sectionId, field, next, record);
  }

  return (
    <div className="vr-inspector-body">
      <EditorContext kicker="Välimus" title={labelFor(selected.id, readText(editor))} />
      <EditorGroup label="Tüüp">
        <EditorSelect
          value={appearance.role ?? "p"}
          options={[
            { value: "h1", label: "Pealkiri 1" },
            { value: "h2", label: "Pealkiri 2" },
            { value: "h3", label: "Pealkiri 3" },
            { value: "p", label: "Lõik" },
          ]}
          onChange={(role) => patch({ role: role as TextAppearance["role"] }, true)}
        />
      </EditorGroup>
      <EditorColor
        key={`color-${selected.id}`}
        label="Värv"
        value={appearance.color}
        fallback={editor.state.draft.theme.text}
        inheritedLabel={inherited ? "Tekst — põhivärv" : undefined}
        swatches={swatches}
        onChange={(color) => patch({ color })}
      />
      <EditorGroup label="Kirjatüüp">
        <EditorSelect
          value={appearance.fontId ?? "cormorant"}
          options={FONT_OPTIONS}
          previewFont
          onChange={(fontId) => patch({ fontId }, true)}
        />
      </EditorGroup>
      <EditorSlider label="Suurus" min={14} max={96} value={appearance.size ?? 18} onChange={(size) => patch({ size })} unit="px" exact={advanced} />
      <EditorSlider label="Paksus" min={300} max={700} step={50} value={appearance.weight ?? 400} onChange={(weight) => patch({ weight })} exact={advanced} />
      <EditorSlider label="Reavahe" min={1.1} max={2.2} step={0.05} value={appearance.lineHeight ?? 1.7} onChange={(lineHeight) => patch({ lineHeight })} exact={advanced} />
      <EditorSlider label="Tähevahe" min={0} max={0.4} step={0.01} value={appearance.letterSpacing ?? 0} onChange={(letterSpacing) => patch({ letterSpacing })} unit="em" exact={advanced} />
      <EditorGroup label="Joondus">
        <EditorSegmented
          value={appearance.align ?? "left"}
          options={[
            { value: "left", label: "Vasak" },
            { value: "center", label: "Kesk" },
            { value: "right", label: "Parem" },
          ]}
          onChange={(align) => patch({ align: align as TextAppearance["align"] }, true)}
        />
      </EditorGroup>
      <EditorSlider label="Maksimaalne laius" min={240} max={900} value={appearance.width ?? 660} onChange={(width) => patch({ width })} unit="px" exact={advanced} />
      {editor.role === "owner" ? (
        <EditorSwitch checked={editor.state.advanced} onChange={(checked) => editor.setAdvanced(checked)} label="Täpsed väärtused" />
      ) : null}
      <EditorButton variant="ghost" onClick={() => editor.setThemePanel(true)}>
        Üldine välimus
      </EditorButton>
    </div>
  );
}

function SectionPanel() {
  const editor = useEditor();
  const selected = editor.state.selected;
  const sectionId = selected?.sectionId;
  const section = sectionId ? findSection(editor.state.draft, sectionId) : undefined;
  if (!section) return <HeaderPanel />;

  const style = section.style ?? {};
  function patchStyle(next: Partial<SectionStyle>, record = true) {
    editor.patchSection(section!.id, (row) => ({ ...row, style: { ...row.style, ...next } }), record);
  }

  return (
    <div className="vr-inspector-body">
      <EditorContext kicker="Sektsioon" title={semanticSectionName(section)} />
      {section.section_type === "faq" ? <FaqSectionContent sectionId={section.id} /> : null}
      <EditorGroup label="Taust">
        <EditorSelect
          value={style.background ?? "main"}
          options={[
            { value: "main", label: "Põhitaust" },
            { value: "warm", label: "Soe" },
            { value: "soft", label: "Pehme" },
          ]}
          onChange={(background) => patchStyle({ background: background as SectionStyle["background"] })}
        />
      </EditorGroup>
      <EditorSwitch checked={style.specks !== false} onChange={(specks) => patchStyle({ specks })} label="Taustatäpid" />
          <EditorGroup label="Kõrgus">
            <EditorSelect
              value={style.height ?? "screen"}
              options={[
                { value: "screen", label: "Ekraani kõrgune" },
                { value: "large", label: "Suur" },
                { value: "auto", label: "Automaatne" },
              ]}
              onChange={(height) => patchStyle({ height: height as HeightPreset })}
            />
          </EditorGroup>
          <EditorGroup label="Vertikaalne joondus">
            <EditorSelect
              value={style.verticalAlign ?? "center"}
              options={[
                { value: "start", label: "Üleval" },
                { value: "center", label: "Keskel" },
                { value: "end", label: "All" },
              ]}
              onChange={(verticalAlign) => patchStyle({ verticalAlign: verticalAlign as VerticalAlign })}
            />
          </EditorGroup>
          <EditorGroup label="Paigutus">
            <EditorSelect
              value={style.layout ?? ""}
              options={[
                { value: "", label: "Vaikimisi" },
                { value: "image-left", label: "Pilt vasakul" },
                { value: "image-right", label: "Pilt paremal" },
                { value: "centered", label: "Keskel tekst" },
                { value: "text-only", label: "Ainult tekst" },
                { value: "image-only", label: "Ainult pilt" },
              ]}
              onChange={(layout) => patchStyle({ layout: (layout || undefined) as SectionStyle["layout"] })}
            />
          </EditorGroup>
          <EditorGroup label="Veergude suhe">
            <EditorSelect
              value={style.columnBalance ?? "50-50"}
              options={[
                { value: "40-60", label: "40 / 60" },
                { value: "45-55", label: "45 / 55" },
                { value: "50-50", label: "50 / 50" },
                { value: "55-45", label: "55 / 45" },
                { value: "60-40", label: "60 / 40" },
              ]}
              onChange={(columnBalance) => patchStyle({ columnBalance: columnBalance as SectionStyle["columnBalance"] })}
            />
          </EditorGroup>
          <EditorSlider
            label="Veergude vahe"
            min={24}
            max={180}
            value={style.splitGap ?? editor.state.draft.theme.splitGap}
            onChange={(splitGap) => patchStyle({ splitGap }, false)}
            unit="px"
            exact={editor.state.advanced}
          />
          <EditorSlider
            label="Sisu laius"
            min={720}
            max={1440}
            value={style.contentWidth ?? editor.state.draft.theme.contentMaxWidth}
            onChange={(contentWidth) => patchStyle({ contentWidth }, false)}
            unit="px"
            exact={editor.state.advanced}
          />
          <EditorGroup label="Teksti joondus">
            <EditorSegmented
              value={style.textAlign ?? "center"}
              options={[
                { value: "left", label: "Vasak" },
                { value: "center", label: "Kesk" },
                { value: "right", label: "Parem" },
              ]}
              onChange={(textAlign) => patchStyle({ textAlign: textAlign as SectionStyle["textAlign"] })}
            />
          </EditorGroup>
          <EditorSlider label="Ülemine vahe" min={0} max={160} value={style.topSpace ?? 64} onChange={(topSpace) => patchStyle({ topSpace }, false)} unit="px" exact={editor.state.advanced} />
          <EditorSlider label="Alumine vahe" min={0} max={160} value={style.bottomSpace ?? 64} onChange={(bottomSpace) => patchStyle({ bottomSpace }, false)} unit="px" exact={editor.state.advanced} />
          <EditorGroup label="Mobiili järjekord">
            <EditorSelect
              value={style.mobileOrder ?? "image-first"}
              options={[
                { value: "image-first", label: "Pilt ees" },
                { value: "text-first", label: "Tekst ees" },
              ]}
              onChange={(mobileOrder) => patchStyle({ mobileOrder: mobileOrder as SectionStyle["mobileOrder"] })}
            />
          </EditorGroup>
      <EditorCheck checked={section.enabled} onChange={(enabled) => editor.patchSection(section.id, (row) => ({ ...row, enabled }))}>
        Nähtav
      </EditorCheck>
      <div className="vr-inspector-row">
        <EditorIconButton ariaLabel="Liiguta üles" onClick={() => editor.moveSection(section.id, -1)}>
          ↑
        </EditorIconButton>
        <EditorIconButton ariaLabel="Liiguta alla" onClick={() => editor.moveSection(section.id, 1)}>
          ↓
        </EditorIconButton>
        <EditorButton variant="danger" onClick={() => editor.removeSection(section.id)}>
          Kustuta
        </EditorButton>
      </div>
    </div>
  );
}

function ContainerPanel() {
  const editor = useEditor();
  const sectionId = editor.state.selected?.sectionId;
  const nodeId = editor.state.selected?.id;
  const section = sectionId ? findSection(editor.state.draft, sectionId) : undefined;
  const tree = section ? getSectionLayoutTree(section) : undefined;
  const node = tree && nodeId ? findLayoutNode(tree.root, nodeId) : null;
  if (!section || !tree || !node) return <SectionPanel />;
  const selectedSection = section;

  const root = tree.root.type === "columns" ? tree.root : null;
  const currentRatio = root ? ratioToLeftPercent(root.ratio, root.customRatio ?? selectedSection.style?.columnRatio) : 50;
  const style = selectedSection.style ?? {};

  function patchStyle(next: Partial<SectionStyle>, record = true) {
    const selectedSectionId = selectedSection.id;
    editor.patchSection(selectedSectionId, (row) => ({ ...row, style: { ...row.style, ...next } }), record);
  }

  return (
    <div className="vr-inspector-body">
      <EditorContext kicker={node.type === "column" ? "Veerg" : node.type === "columns" ? "Container" : "Grupp"} title={node.label} />
      {root ? (
        <>
          <EditorGroup label="Layout">
            <EditorSelect
              value="columns"
              options={[
                { value: "columns", label: "Columns" },
                { value: "single", label: "Single column" },
              ]}
              onChange={() => undefined}
            />
          </EditorGroup>
          <EditorGroup label="Veergude suhe">
            <EditorSelect
              value={style.columnRatio ? "custom" : style.columnBalance ?? "50-50"}
              options={[
                { value: "40-60", label: "40 / 60" },
                { value: "45-55", label: "45 / 55" },
                { value: "50-50", label: "50 / 50" },
                { value: "55-45", label: "55 / 45" },
                { value: "60-40", label: "60 / 40" },
                { value: "custom", label: `Custom (${currentRatio} / ${100 - currentRatio})` },
              ]}
              onChange={(value) => {
                if (value === "custom") {
                  editor.resizeColumns(section.id, currentRatio, true);
                  return;
                }
                const left = Number(String(value).slice(0, 2));
                editor.resizeColumns(section.id, left, true);
              }}
            />
          </EditorGroup>
          <EditorSlider
            label="Täpne suhe"
            min={30}
            max={70}
            value={currentRatio}
            onChange={(left) => editor.resizeColumns(section.id, left, false)}
            unit="%"
            exact
          />
          <EditorSlider
            label="Veergude vahe"
            min={24}
            max={180}
            value={style.splitGap ?? editor.state.draft.theme.splitGap}
            onChange={(splitGap) => patchStyle({ splitGap }, false)}
            unit="px"
            exact={editor.state.advanced}
          />
          <EditorGroup label="Vertikaalne joondus">
            <EditorSelect
              value={style.verticalAlign ?? "center"}
              options={[
                { value: "start", label: "Üleval" },
                { value: "center", label: "Keskel" },
                { value: "end", label: "All" },
              ]}
              onChange={(verticalAlign) => patchStyle({ verticalAlign: verticalAlign as VerticalAlign })}
            />
          </EditorGroup>
          <EditorGroup label="Mobiil">
            <EditorSelect
              value={style.mobileOrder ?? "image-first"}
              options={[
                { value: "image-first", label: "Stack, pilt ees" },
                { value: "text-first", label: "Stack, tekst ees" },
              ]}
              onChange={(mobileOrder) => patchStyle({ mobileOrder: mobileOrder as SectionStyle["mobileOrder"] })}
            />
          </EditorGroup>
        </>
      ) : null}
      <EditorSlider
        label="Sisu laius"
        min={720}
        max={1500}
        value={style.contentWidth ?? editor.state.draft.theme.contentMaxWidth}
        onChange={(contentWidth) => patchStyle({ contentWidth }, false)}
        unit="px"
        exact={editor.state.advanced}
      />
      <EditorGroup label="Liiguta valikut">
        <div className="vr-inspector-row">
          <EditorButton variant="ghost" onClick={() => editor.moveSection(section.id, -1)}>
            Sektsioon üles
          </EditorButton>
          <EditorButton variant="ghost" onClick={() => editor.moveSection(section.id, 1)}>
            Sektsioon alla
          </EditorButton>
        </div>
      </EditorGroup>
    </div>
  );
}

function HeaderPanel() {
  const editor = useEditor();
  const theme = editor.state.draft.theme;
  const swatches = themeColorSwatches(theme);
  const pages = [...editor.state.draft.pages].sort((a, b) => a.nav_order - b.nav_order);

  return (
    <div className="vr-inspector-body">
      <EditorContext kicker="Päis" title="Vaikusruum" />
      <EditorColor label="Taust" value={theme.bgMain} fallback={theme.bgMain} swatches={swatches} onChange={(bgMain) => editor.patchTheme({ bgMain })} />
      <EditorSlider label="Kõrgus" min={56} max={140} value={theme.headerHeight} onChange={(headerHeight) => editor.patchTheme({ headerHeight })} unit="px" exact={editor.state.advanced} />
      <EditorSlider label="Logo suurus" min={24} max={96} value={theme.wordmarkSize} onChange={(wordmarkSize) => editor.patchTheme({ wordmarkSize })} unit="px" exact={editor.state.advanced} />
      <EditorSlider label="Logo tähevahe" min={0.08} max={0.4} step={0.01} value={theme.wordmarkTracking} onChange={(wordmarkTracking) => editor.patchTheme({ wordmarkTracking })} unit="em" exact={editor.state.advanced} />
      <EditorSlider label="Sisu laius" min={720} max={1600} value={theme.contentMaxWidth} onChange={(contentMaxWidth) => editor.patchTheme({ contentMaxWidth })} unit="px" exact={editor.state.advanced} />
      <EditorSwitch checked={theme.headerSticky} onChange={(headerSticky) => editor.patchTheme({ headerSticky }, true)} label="Sticky" />
      <EditorDivider />
      <EditorContext kicker="Menüü" title="Lingid" />
      <div className="vr-ed-menu-list">
        {pages.map((item) => (
          <EditorGroup key={item.id} label={pageLabel(item)}>
            <EditorTextInput
              value={item.nav_label || item.title}
              onChange={(nav_label) => editor.patchPage(item.id, { nav_label }, false)}
              onCommit={(nav_label) => editor.patchPage(item.id, { nav_label }, true)}
            />
          </EditorGroup>
        ))}
      </div>
    </div>
  );
}

function NavItemPanel() {
  const editor = useEditor();
  const slug = editor.state.selected?.navSlug;
  const page = editor.state.draft.pages.find((item) => item.slug === slug);
  if (!page) return null;
  return (
    <div className="vr-inspector-body">
      <EditorContext kicker="Menüülink" title={pageLabel(page)} />
      <EditorGroup label="Tekst">
        <EditorTextInput
          value={page.nav_label || page.title}
          onChange={(nav_label) => editor.patchPage(page.id, { nav_label }, false)}
          onCommit={(nav_label) => editor.patchPage(page.id, { nav_label }, true)}
        />
      </EditorGroup>
      <EditorGroup label="Leht">
        <EditorTextInput value={`/${page.slug === "avaleht" ? "" : page.slug}`} onChange={() => undefined} />
      </EditorGroup>
      <EditorSwitch checked={page.show_in_nav} onChange={(show_in_nav) => editor.patchPage(page.id, { show_in_nav }, true)} label="Näita" />
    </div>
  );
}

function ImagePanel() {
  const editor = useEditor();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const selected = editor.state.selected;
  const section = selected?.sectionId ? findSection(editor.state.draft, selected.sectionId) : undefined;
  const mediaId = section ? resolveSectionMediaId(section) || selected?.mediaId || "" : selected?.mediaId || "";
  const media = mediaId ? editor.state.draft.media[mediaId] : undefined;
  const image = section?.style?.image ?? {};

  async function upload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !section) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Kasuta JPEG, PNG või WebP pilti.");
      return;
    }
    setUploading(true);
    setUploadError("");
    const blob = await compressImage(file);
    const ext = blob.type === "image/webp" ? "webp" : file.name.split(".").pop() || "jpg";
    const path = createMediaStoragePath(ext);
    const supabase = createBrowserSupabase();
    const { error: uploadErr } = await supabase.storage.from("site-media").upload(path, blob, {
      contentType: blob.type || file.type,
    });
    if (uploadErr) {
      setUploading(false);
      setUploadError("Üleslaadimine ebaõnnestus.");
      return;
    }
    const { data, error } = await supabase
      .from("media")
      .insert({ storage_path: path, alt_text: file.name.replace(/\.[^.]+$/, "") })
      .select("*")
      .single();
    setUploading(false);
    if (error || !data) {
      setUploadError("Pildi salvestamine ebaõnnestus.");
      return;
    }
    const item = data as MediaRow;
    editor.addMedia(item);
    editor.patchSection(section.id, (row) => ({ ...row, style: { ...row.style, mediaId: item.id } }));
  }

  return (
    <div className="vr-inspector-body">
      <EditorContext kicker="Image" title={section ? imageLabel(section) : media?.alt_text || "Pilt"} />
      {media ? (
        <>
          <div className="vr-image-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaPublicUrl(media.storage_path)} alt="" />
          </div>
          <p className="vr-ed-help">{media.storage_path.split("/").pop()}</p>
          <EditorGroup label="Alternatiivtekst">
            <EditorTextInput
              value={media.alt_text ?? ""}
              onChange={(alt_text) => editor.patchMedia(media.id, { alt_text }, false)}
              onCommit={(alt_text) => editor.patchMedia(media.id, { alt_text }, true)}
            />
          </EditorGroup>
          <EditorDivider />
          <EditorContext kicker="Pildid" title="Vaheta pilti" />
          <label className="vr-ed-upload">
            {uploading ? "Laen üles…" : "Laadi üles"}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files)} />
          </label>
          {uploadError ? <p className="vr-form-error">{uploadError}</p> : null}
          <div className="vr-media-picker-grid">
            {Object.values(editor.state.draft.media).map((item) => (
              <button
                key={item.id}
                type="button"
                data-selected={item.id === mediaId ? "true" : undefined}
                onClick={() => {
                  if (!section) return;
                  editor.patchSection(section.id, (row) => ({ ...row, style: { ...row.style, mediaId: item.id } }));
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaPublicUrl(item.storage_path)} alt="" />
              </button>
            ))}
          </div>
          <p className="vr-ed-label">Fookuspunkt</p>
          <button
            type="button"
            className="vr-focal"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
              const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
              editor.patchMedia(media.id, { focal_x: x, focal_y: y }, true);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaPublicUrl(media.storage_path)} alt="" />
            <span className="vr-focal-point" style={{ left: `${media.focal_x}%`, top: `${media.focal_y}%` }} />
          </button>
        </>
      ) : (
        <>
          <div className="vr-image-preview vr-image-preview--empty">
            {section?.section_type === "hero" && section.content.showEmblem !== false ? <span>Vaikimisi hero kujund</span> : "Pilt puudub"}
          </div>
          <label className="vr-ed-upload">
            {uploading ? "Laen üles…" : "Laadi üles"}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files)} />
          </label>
          {uploadError ? <p className="vr-form-error">{uploadError}</p> : null}
          <div className="vr-media-picker-grid">
            {Object.values(editor.state.draft.media).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!section) return;
                  editor.patchSection(section.id, (row) => ({ ...row, style: { ...row.style, mediaId: item.id } }));
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaPublicUrl(item.storage_path)} alt="" />
              </button>
            ))}
          </div>
        </>
      )}
      <EditorDivider />
      <EditorContext kicker="Välimus" title="Pilt" />
      <EditorGroup label="Kärpimine">
        <EditorSelect
          value={image.crop ?? "landscape"}
          options={[
            { value: "original", label: "Algne" },
            { value: "landscape", label: "Rõhtne" },
            { value: "portrait", label: "Püstine" },
            { value: "square", label: "Ruut" },
          ]}
          onChange={(crop) =>
            section &&
            editor.patchSection(section.id, (row) => ({
              ...row,
              style: { ...row.style, image: { ...row.style?.image, crop: crop as NonNullable<SectionStyle["image"]>["crop"] } },
            }))
          }
        />
      </EditorGroup>
      <EditorSlider
        label="Laius"
        min={40}
        max={100}
        value={image.width ?? 100}
        onChange={(width) =>
          section &&
          editor.patchSection(section.id, (row) => ({ ...row, style: { ...row.style, image: { ...row.style?.image, width } } }), false)
        }
        unit="%"
        exact={editor.state.advanced}
      />
      <EditorSlider
        label="Raadius"
        min={0}
        max={40}
        value={image.radius ?? 0}
        onChange={(radius) =>
          section &&
          editor.patchSection(section.id, (row) => ({ ...row, style: { ...row.style, image: { ...row.style?.image, radius } } }), false)
        }
        unit="px"
        exact={editor.state.advanced}
      />
      <EditorGroup label="Joondus">
        <EditorSegmented
          value={image.align ?? "center"}
          options={[
            { value: "left", label: "Vasakul" },
            { value: "center", label: "Keskel" },
            { value: "right", label: "Paremal" },
          ]}
          onChange={(align) =>
            section &&
            editor.patchSection(section.id, (row) => ({
              ...row,
              style: { ...row.style, image: { ...row.style?.image, align: align as "left" | "right" | "center" } },
            }))
          }
        />
      </EditorGroup>
      {mediaId ? (
        <EditorButton
          variant="danger"
          onClick={() =>
            section &&
            editor.patchSection(section.id, (row) => ({
              ...row,
              style: { ...row.style, mediaId: null },
            }))
          }
        >
          Eemalda pilt
        </EditorButton>
      ) : null}
    </div>
  );
}

function AnimationPanel() {
  const editor = useEditor();
  const selected = editor.state.selected;
  const section = selected?.sectionId ? findSection(editor.state.draft, selected.sectionId) : undefined;
  if (!section) {
    return (
      <div className="vr-inspector-body">
        <EditorContext kicker="Animatsioon" title={selected ? selectedKindLabel(selected.type) : "Element"} />
        <EditorGroup label="Tüüp">
          <EditorSelect value="none" options={[{ value: "none", label: "Puudub" }]} onChange={() => undefined} />
        </EditorGroup>
        <EditorGroup label="Kestus">
          <EditorTextInput value="" placeholder="Vali animatsioon" onChange={() => undefined} />
        </EditorGroup>
        <p className="vr-ed-help">Selle elemendi animatsioon pärineb sektsioonilt.</p>
      </div>
    );
  }

  const animation = section.style?.animation ?? {};
  const animationSectionId = section.id;
  function patch(next: Partial<AnimationAppearance>, record = true) {
    editor.patchSection(animationSectionId, (row) => ({
      ...row,
      style: { ...row.style, animation: { ...row.style?.animation, ...next } },
    }), record);
  }
  const active = animation.preset && animation.preset !== "none";

  return (
    <div className="vr-inspector-body">
      <EditorContext kicker="Animatsioon" title={labelFor(selected?.id ?? section.id, readText(editor)) || sectionTitle(section.section_type)} />
      <EditorGroup label="Tüüp">
        <div className="vr-ed-inline">
          <EditorSelect
            value={animation.preset ?? "none"}
            options={[
              { value: "none", label: "Puudub" },
              { value: "fade-in", label: "Fade in" },
              { value: "fade-up", label: "Fade up" },
              { value: "fade-down", label: "Fade down" },
              { value: "fade-left", label: "Fade left" },
              { value: "fade-right", label: "Fade right" },
              { value: "scale-in", label: "Scale in" },
            ]}
            onChange={(preset) => patch({ preset: preset as AnimationAppearance["preset"] })}
          />
          <EditorButton variant="secondary" disabled={!active} onClick={() => undefined}>Replay</EditorButton>
        </div>
      </EditorGroup>
      {active ? (
        <>
          <EditorSlider label="Kestus" min={0.2} max={3} step={0.1} value={animation.duration ?? 1} onChange={(duration) => patch({ duration }, false)} unit="s" exact />
          <EditorSlider label="Viivitus" min={0} max={2} step={0.1} value={animation.delay ?? 0} onChange={(delay) => patch({ delay }, false)} unit="s" exact />
          <EditorSlider label="Künnis" min={0} max={1} step={0.05} value={animation.threshold ?? 0.35} onChange={(threshold) => patch({ threshold }, false)} exact />
          <EditorCheck checked={Boolean(animation.replayable)} onChange={(replayable) => patch({ replayable })}>
            Korda
          </EditorCheck>
        </>
      ) : (
        <p className="vr-ed-help">Vali animatsioon, et kestust ja viivitust muuta.</p>
      )}
      <p className="vr-ed-help">Avalik leht austab `prefers-reduced-motion` eelistust.</p>
    </div>
  );
}

function SettingsPanel() {
  const editor = useEditor();
  const selected = editor.state.selected;
  if (!selected) return <PageOverview mode="settings" />;
  if (editor.role !== "owner") {
    return (
      <div className="vr-inspector-body">
        <EditorContext kicker="Seaded" title={selectedKindLabel(selected.type)} />
        <p className="vr-ed-help">Tehnilised seaded on nähtavad ainult omanikule.</p>
      </div>
    );
  }
  const section = selected.sectionId ? findSection(editor.state.draft, selected.sectionId) : undefined;
  return (
    <div className="vr-inspector-body">
      <EditorContext kicker="Settings" title={selectedKindLabel(selected.type)} />
      <div className="vr-ed-tabs-line">
        <span className="is-active">Element</span>
        <span>Styles</span>
      </div>
      <EditorGroup label="ID">
        <EditorTextInput value={selected.id} onChange={() => undefined} />
      </EditorGroup>
      {section ? (
        <>
          <EditorGroup label="Section key">
            <EditorTextInput value={section.section_key} onChange={() => undefined} />
          </EditorGroup>
          <EditorGroup label="Type">
            <EditorTextInput value={section.section_type} onChange={() => undefined} />
          </EditorGroup>
        </>
      ) : null}
      <EditorGroup label="Classes">
        <EditorButton variant="ghost" disabled>+ Add class</EditorButton>
      </EditorGroup>
      <EditorGroup label="Attributes">
        <EditorButton variant="ghost" disabled>+ Add attribute</EditorButton>
      </EditorGroup>
      <EditorGroup label="Tag">
        <EditorSelect
          value="default"
          options={[{ value: "default", label: "Default" }]}
          onChange={() => undefined}
        />
      </EditorGroup>
    </div>
  );
}

function ThemePanel() {
  const editor = useEditor();
  const theme = editor.state.draft.theme;
  const swatches = themeColorSwatches(theme);
  const exact = editor.state.advanced;

  return (
    <div className="vr-inspector-body">
      <EditorContext kicker="Üldine välimus" title="Vaikusruum" />
      <EditorCollapse title="Värvid" defaultOpen>
        <EditorColor label="Põhitaust" value={theme.bgMain} fallback={theme.bgMain} swatches={swatches} onChange={(bgMain) => editor.patchTheme({ bgMain })} />
        <EditorColor label="Soe taust" value={theme.bgWarm} fallback={theme.bgWarm} swatches={swatches} onChange={(bgWarm) => editor.patchTheme({ bgWarm })} />
        <EditorColor label="Tekst" value={theme.text} fallback={theme.text} swatches={swatches} onChange={(text) => editor.patchTheme({ text })} />
        <EditorColor label="Sekundaarne tekst" value={theme.textMuted} fallback={theme.textMuted} swatches={swatches} onChange={(textMuted) => editor.patchTheme({ textMuted })} />
        <EditorColor label="Oranž aktsent" value={theme.accentOrange} fallback={theme.accentOrange} swatches={swatches} onChange={(accentOrange) => editor.patchTheme({ accentOrange })} />
        <EditorColor label="Sinakashall aktsent" value={theme.accentBluegray} fallback={theme.accentBluegray} swatches={swatches} onChange={(accentBluegray) => editor.patchTheme({ accentBluegray })} />
        <EditorColor label="Jooned" value={theme.line} fallback={theme.line} swatches={swatches} onChange={(line) => editor.patchTheme({ line })} />
        <EditorColor label="Taustatäpid" value={theme.specksColor} fallback={theme.specksColor} swatches={swatches} onChange={(specksColor) => editor.patchTheme({ specksColor })} />
      </EditorCollapse>
      <EditorCollapse title="Kirjatüübid" defaultOpen>
        <EditorGroup label="Pealkiri">
          <EditorSelect
            value={theme.displayFont}
            options={DISPLAY_FONTS.map((font) => ({ value: font.id, label: font.label, fontFamily: font.css }))}
            previewFont
            onChange={(displayFont) => editor.patchTheme({ displayFont: displayFont as typeof theme.displayFont }, true)}
          />
        </EditorGroup>
        <EditorGroup label="Põhitekst">
          <EditorSelect
            value={theme.bodyFont}
            options={BODY_FONTS.map((font) => ({ value: font.id, label: font.label, fontFamily: font.css }))}
            previewFont
            onChange={(bodyFont) => editor.patchTheme({ bodyFont: bodyFont as typeof theme.bodyFont }, true)}
          />
        </EditorGroup>
        <EditorGroup label="Logo">
          <EditorSelect
            value={theme.wordmarkFont}
            options={DISPLAY_FONTS.map((font) => ({ value: font.id, label: font.label, fontFamily: font.css }))}
            previewFont
            onChange={(wordmarkFont) => editor.patchTheme({ wordmarkFont: wordmarkFont as typeof theme.wordmarkFont }, true)}
          />
        </EditorGroup>
      </EditorCollapse>
      <EditorCollapse title="Lehe laius">
        <EditorSlider label="Sisu maksimaalne laius" min={720} max={1600} value={theme.contentMaxWidth} onChange={(contentMaxWidth) => editor.patchTheme({ contentMaxWidth })} unit="px" exact={exact} />
        <EditorSlider label="Lehe küljevahe" min={24} max={140} value={theme.gutterDesktop} onChange={(gutterDesktop) => editor.patchTheme({ gutterDesktop })} unit="px" exact={exact} />
      </EditorCollapse>
      <EditorCollapse title="Üldine tekst">
        <EditorSlider label="Põhisuurus" min={14} max={24} value={theme.bodySize} onChange={(bodySize) => editor.patchTheme({ bodySize })} unit="px" exact={exact} />
        <EditorSlider label="Reavahe" min={1.3} max={2.2} step={0.05} value={theme.bodyLineHeight} onChange={(bodyLineHeight) => editor.patchTheme({ bodyLineHeight })} exact={exact} />
        <EditorSlider label="Pealkirjade skaala" min={0.8} max={1.4} step={0.05} value={theme.headingScale} onChange={(headingScale) => editor.patchTheme({ headingScale })} exact={exact} />
      </EditorCollapse>
      <EditorCollapse title="Vahed">
        <EditorSlider label="Sektsiooni vertikaalne vahe" min={48} max={160} value={theme.sectionSpace} onChange={(sectionSpace) => editor.patchTheme({ sectionSpace })} unit="px" exact={exact} />
        <EditorSlider label="Kahe veeru vahe" min={16} max={180} value={theme.splitGap} onChange={(splitGap) => editor.patchTheme({ splitGap })} unit="px" exact={exact} />
      </EditorCollapse>
      <EditorCollapse title="Nupud">
        <EditorColor label="Taust" value={theme.buttonBg} fallback={theme.buttonBg} swatches={swatches} onChange={(buttonBg) => editor.patchTheme({ buttonBg })} />
        <EditorColor label="Tekst" value={theme.buttonText} fallback={theme.buttonText} swatches={swatches} onChange={(buttonText) => editor.patchTheme({ buttonText })} />
        <EditorSlider label="Kõrgus" min={36} max={72} value={theme.buttonHeight} onChange={(buttonHeight) => editor.patchTheme({ buttonHeight })} unit="px" exact={exact} />
        <EditorSlider label="Raadius" min={0} max={40} value={theme.buttonRadius >= 999 ? 40 : theme.buttonRadius} onChange={(buttonRadius) => editor.patchTheme({ buttonRadius })} unit="px" exact={exact} />
        <EditorSlider label="Tähevahe" min={0} max={0.2} step={0.01} value={theme.buttonTracking} onChange={(buttonTracking) => editor.patchTheme({ buttonTracking })} unit="em" exact={exact} />
      </EditorCollapse>
      <EditorCollapse title="Taust">
        <EditorSwitch checked={theme.specksEnabled} onChange={(specksEnabled) => editor.patchTheme({ specksEnabled }, true)} label="Täpid" />
        <EditorGroup label="Tihedus">
          <EditorSelect
            value={theme.specksDensity}
            options={[
              { value: "off", label: "Väljas" },
              { value: "very-low", label: "Väga hõre" },
              { value: "low", label: "Hõre" },
            ]}
            onChange={(specksDensity) => editor.patchTheme({ specksDensity: specksDensity as typeof theme.specksDensity }, true)}
          />
        </EditorGroup>
        <EditorSlider label="Läbipaistvus" min={0} max={1} step={0.01} value={theme.specksOpacity} onChange={(specksOpacity) => editor.patchTheme({ specksOpacity })} exact={exact} />
      </EditorCollapse>
      {editor.role === "owner" ? (
        <EditorSwitch checked={editor.state.advanced} onChange={(checked) => editor.setAdvanced(checked)} label="Täpsed väärtused" />
      ) : null}
    </div>
  );
}

function NavTarget() {
  const editor = useEditor();
  const slug = editor.state.selected?.navSlug;
  const page = editor.state.draft.pages.find((item) => item.slug === slug);
  if (!page) return null;
  return (
    <EditorCheck checked={page.show_in_nav} onChange={(show_in_nav) => editor.patchPage(page.id, { show_in_nav }, true)}>
      Näita menüüs
    </EditorCheck>
  );
}

function FaqItemControls() {
  const editor = useEditor();
  const selected = editor.state.selected;
  if (!selected?.sectionId || !selected.field) return null;
  const index = Number(selected.field.slice(2));
  const section = findSection(editor.state.draft, selected.sectionId);
  if (!section) return null;
  return (
    <>
      <EditorButton
        variant="danger"
        onClick={() => {
          const items = [...((section.content.items as unknown[]) ?? [])];
          items.splice(index, 1);
          editor.patchSection(section.id, (row) => ({ ...row, content: { ...row.content, items } }));
          editor.deselect();
        }}
      >
        Kustuta küsimus
      </EditorButton>
    </>
  );
}

function FaqSectionContent({ sectionId }: { sectionId: string }) {
  const editor = useEditor();
  const section = findSection(editor.state.draft, sectionId);
  const items = Array.isArray(section?.content.items) ? (section.content.items as Array<{ question?: string }>) : [];
  return (
    <div className="vr-ed-pages">
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          onClick={() =>
            editor.select({
              id: `faq.${sectionId}.q.${index}`,
              type: "text",
              sectionId,
              field: `q.${index}`,
            })
          }
        >
          {item.question || `Küsimus ${index + 1}`}
        </button>
      ))}
      <EditorButton
        variant="secondary"
        onClick={() => {
          if (!section) return;
          const next = [...((section.content.items as unknown[]) ?? []), { question: "Küsimus", answer: "Vastus" }];
          editor.patchSection(section.id, (row) => ({ ...row, content: { ...row.content, items: next } }));
        }}
      >
        Lisa küsimus
      </EditorButton>
    </div>
  );
}

function readText(editor: ReturnType<typeof useEditor>): string {
  const selected = editor.state.selected;
  if (!selected) return "";
  if (selected.id === "header.wordmark" || selected.field === "site_name") return editor.state.draft.settings.site_name;
  if (selected.id === "footer.text") return editor.state.draft.settings.footer_text ?? "";
  if (selected.type === "nav" && selected.navSlug) {
    const page = editor.state.draft.pages.find((item) => item.slug === selected.navSlug);
    return page?.nav_label || page?.title || "";
  }
  if (selected.offeringId && selected.field) {
    const offering = editor.state.draft.offerings[selected.offeringId];
    return String((offering as Record<string, unknown> | undefined)?.[selected.field] ?? "");
  }
  if (selected.sectionId && selected.field) {
    const section = findSection(editor.state.draft, selected.sectionId);
    if (!section) return "";
    if (selected.field.startsWith("q.")) {
      const index = Number(selected.field.slice(2));
      return String((section.content.items as Array<{ question: string }>)[index]?.question ?? "");
    }
    if (selected.field.startsWith("a.")) {
      const index = Number(selected.field.slice(2));
      return String((section.content.items as Array<{ answer: string }>)[index]?.answer ?? "");
    }
    if (selected.field.startsWith("item.")) {
      const index = Number(selected.field.slice(5));
      return String((section.content.items as string[])[index] ?? "");
    }
    if (selected.field.startsWith("quote.")) {
      const index = Number(selected.field.slice(6));
      return String((section.content.items as Array<{ quote: string }>)[index]?.quote ?? "");
    }
    const raw = section.content[selected.field];
    if (typeof raw === "string") return raw;
    return "";
  }
  if (selected.field === "title") {
    const page = editor.state.draft.pages.find((item) => item.id === editor.state.pageId);
    return page?.title ?? "";
  }
  return "";
}

function writeText(editor: ReturnType<typeof useEditor>, value: string, record: boolean) {
  const selected = editor.state.selected;
  if (!selected) return;
  if (selected.id === "header.wordmark" || selected.field === "site_name") {
    editor.setPath({ kind: "settings", key: "site_name" }, value, record);
    return;
  }
  if (selected.id === "footer.text") {
    editor.setPath({ kind: "settings", key: "footer_text" }, value, record);
    return;
  }
  if (selected.type === "nav" && selected.navSlug) {
    const page = editor.state.draft.pages.find((item) => item.slug === selected.navSlug);
    if (page) editor.setPath({ kind: "nav-label", pageId: page.id }, value, record);
    return;
  }
  if (selected.offeringId && selected.field) {
    editor.setPath({ kind: "offering", offeringId: selected.offeringId, key: selected.field as keyof OfferingRow }, value, record);
    return;
  }
  if (selected.sectionId && selected.field?.startsWith("q.")) {
    editor.setPath({ kind: "faq", sectionId: selected.sectionId, index: Number(selected.field.slice(2)), field: "question" }, value, record);
    return;
  }
  if (selected.sectionId && selected.field?.startsWith("a.")) {
    editor.setPath({ kind: "faq", sectionId: selected.sectionId, index: Number(selected.field.slice(2)), field: "answer" }, value, record);
    return;
  }
  if (selected.sectionId && selected.field?.startsWith("item.")) {
    editor.setPath({ kind: "list-item", sectionId: selected.sectionId, index: Number(selected.field.slice(5)) }, value, record);
    return;
  }
  if (selected.sectionId && selected.field?.startsWith("quote.")) {
    editor.setPath({ kind: "testimonial", sectionId: selected.sectionId, index: Number(selected.field.slice(6)), field: "quote" }, value, record);
    return;
  }
  if (selected.field === "title" && !selected.sectionId) {
    editor.setPath({ kind: "page-title", pageId: editor.state.pageId }, value, record);
    return;
  }
  if (selected.sectionId && selected.field) {
    editor.setPath({ kind: "section-content", sectionId: selected.sectionId, key: selected.field }, value, record);
  }
}

function labelFor(id: string, value?: string) {
  if (value && value.trim()) return value.trim().slice(0, 42);
  if (id.includes("title")) return "Pealkiri";
  if (id.includes("intro")) return "Sissejuhatus";
  if (id.includes("wordmark")) return "Vaikusruum";
  return "Sisu";
}

function sectionTitle(type: string) {
  switch (type) {
    case "hero":
      return "Avalehe avasektsioon";
    case "split_media_text":
      return "Pilt + tekst";
    case "rich_text":
      return "Tekst";
    case "faq":
      return "KKK";
    case "contact":
      return "Kontakt";
    default:
      return "Sektsioon";
  }
}

function selectedKindLabel(type: string) {
  switch (type) {
    case "section":
      return "Sektsioon";
    case "image":
      return "Pilt";
    case "nav":
      return "Menüülink";
    case "link":
      return "Link";
    case "header":
      return "Päis";
    case "text":
      return "Tekst";
    default:
      return "Element";
  }
}

function BrushIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20c2-1 3-3 3-5 0-3 3-6 7-6 1 0 3 1 4 2l-8 8c-1 1-4 2-6 1Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 5.5v13l10-6.5-10-6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.8 13.4v-2.8l2-.5.8-1.9-1-1.8 2-2 1.8 1 1.9-.8.5-2h2.8l.5 2 1.9.8 1.8-1 2 2-1 1.8.8 1.9 2 .5v2.8l-2 .5-.8 1.9 1 1.8-2 2-1.8-1-1.9.8-.5 2h-2.8l-.5-2-1.9-.8-1.8 1-2-2 1-1.8-.8-1.9-2-.5Z" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}
