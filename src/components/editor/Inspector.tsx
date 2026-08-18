"use client";

import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { useDragRuntime, useEditor } from "@/components/editor/EditorProvider";
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
  EditorSwitch,
  EditorTextInput,
  EditorTextarea,
  EditorTooltip,
} from "@/components/editor/ui";
import { findSection, pageSections } from "@/lib/editor/draft";
import { fieldStyle } from "@/lib/editor/appearance";
import { themeColorSwatches } from "@/lib/editor/color";
import { findLayoutNode, getSectionLayoutTree, listLayoutElements, parentOfNode, ratioToLeftPercent, resolveLayoutNodeId, sectionLayoutSummary } from "@/lib/editor/layout-tree";
import { pageLabel } from "@/lib/editor/pages";
import { ADDABLE_SECTIONS } from "@/lib/editor/types";
import { ALL_FONTS, BODY_FONTS, DISPLAY_FONTS } from "@/lib/theme/theme";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/utils/compress-image";
import { mediaPublicUrl } from "@/lib/utils/urls";
import { buildInspectorModel, INSPECTOR_TAB_LABELS, SITE_DESIGN_TABS } from "@/lib/editor/inspector";
import { readEditorContent } from "@/lib/editor/content-binding";
import { clientLayoutLabel, imageLabel, semanticSectionName } from "@/lib/editor/labels";
import type { EditorSelection, InspectorTabId } from "@/lib/editor/types";
import type { AnimationAppearance, HeightPreset, LayoutNode, MediaRow, SectionRow, SectionStyle, TextAppearance, VerticalAlign } from "@/types/content";
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
  const model = useMemo(
    () =>
      buildInspectorModel({
        draft: state.draft,
        selection: state.selected,
        context: state.inspectorContext,
        tab: state.inspectorTab,
        role: editor.role,
        pageId: state.pageId,
      }),
    [editor.role, state.draft, state.inspectorContext, state.inspectorTab, state.pageId, state.selected],
  );
  const hasContext = model.context.kind !== "none";
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return 316;
    const stored = Number(window.localStorage.getItem("vr.editor.inspectorWidth"));
    return Number.isFinite(stored) ? clampInspectorWidth(stored) : 316;
  });
  const [moreOpen, setMoreOpen] = useState(false);

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
      {model.tabs.length ? (
        <div className="vr-inspector-modes" role="tablist" aria-label="Inspektori vaated">
          {model.tabs.map((tab) => (
            <EditorTooltip key={tab} label={INSPECTOR_TAB_LABELS[tab]}>
              <button
                type="button"
                role="tab"
                aria-selected={model.tab === tab}
                aria-label={INSPECTOR_TAB_LABELS[tab]}
                className={model.tab === tab ? "is-active" : undefined}
                onClick={() => editor.setTab(tab)}
              >
                <InspectorModeIcon tab={tab} />
              </button>
            </EditorTooltip>
          ))}
        </div>
      ) : null}
      <div className="vr-inspector-contextbar">
        <EditorIconButton ariaLabel="Tagasi" disabled={!hasContext} onClick={() => editor.goBack()}>
          ←
        </EditorIconButton>
        <span>{hasContext ? model.kicker : ""}</span>
        {canMoveSelected(state.selected) ? (
          <div className="vr-inspector-more">
            <EditorIconButton ariaLabel="Rohkem" active={moreOpen} onClick={() => setMoreOpen((open) => !open)}>
              ⋯
            </EditorIconButton>
            {moreOpen ? (
              <div className="vr-editor-menu">
                <MoveActions asMenu />
                {canDeleteSelection(state.selected, state.inspectorContext.kind) ? (
                  <button type="button" className="vr-ed-danger" onClick={() => editor.removeSelected()}>
                    Kustuta
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <span />
        )}
        <EditorIconButton
          ariaLabel="Sulge"
          onClick={() => {
            if (hasContext) editor.goBack();
            else editor.closeInspector();
          }}
        >
          ×
        </EditorIconButton>
      </div>
      <div className="vr-inspector-scroll">
        {hasContext ? (
          <div className="vr-inspector-heading">
            <p className="vr-ed-context-label">{model.kicker}</p>
            <p className="vr-ed-context-title">{model.title}</p>
          </div>
        ) : null}
        {model.context.kind === "site" ? <SiteDesignInspector /> : <SelectionPanels tab={model.tab} />}
      </div>
      <EditorFooterControls />
      <button
        type="button"
        className="vr-inspector-resize"
        aria-label="Muuda paneeli laiust"
        onPointerDown={onResizePointerDown}
        onDoubleClick={() => {
          setWidth(316);
          window.localStorage.setItem("vr.editor.inspectorWidth", "316");
        }}
      />
    </aside>
  );
}

function clampInspectorWidth(value: number) {
  return Math.min(450, Math.max(310, Math.round(value)));
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

  return (
    <div className="vr-inspector-footer">
      {state.saveError ? <p className="vr-form-error vr-editor-error">{state.saveError}</p> : null}
      <EditorButton
        variant="primary"
        className="vr-inspector-done"
        onClick={() => {
          if (state.selected || state.inspectorContext.kind !== "none") editor.deselect();
          else editor.closeInspector();
        }}
      >
        Valmis
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

function SelectionPanels({ tab }: { tab: InspectorTabId }) {
  const editor = useEditor();
  const selected = editor.state.selected;
  if (!selected) return <PageOverview />;
  if (tab === "animation") return <AnimationPanel />;
  if (tab === "advanced" || tab === ("settings" as InspectorTabId)) return <SettingsPanel />;
  if (tab === "layout" || (tab === "content" && (selected.type === "container" || selected.type === "section"))) {
    if (selected.type === "container") return <ContainerPanel />;
    if (selected.type === "section") return <SectionPanel mode="content" />;
  }
  if (tab === "appearance") return <NodeAppearanceInspector />;
  if (selected.type === "container") return <ContainerPanel />;
  if (selected.type === "image") return <ImagePanel mode="content" />;
  if (selected.type === "section") return <SectionPanel mode="content" />;
  if (selected.type === "header") return <HeaderPanel />;
  if (selected.type === "nav") return <NavItemPanel />;
  if (isStructuredContentSelection(editor)) return <StructuredContentPanel />;
  return <NodeContentInspector />;
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
  const drag = useDragRuntime();
  const page = editor.state.draft.pages.find((item) => item.id === editor.state.pageId);
  if (!page) return null;
  const sections = pageSections(editor.state.draft, page.id);
  return (
    <div className="vr-element-tree">
      {sections.map((section, sectionIndex) => (
        <details key={section.id} className="vr-element-group" open>
          <summary
            data-selected={editor.state.selected?.id === `section.${section.id}` ? "true" : undefined}
            data-hovered={drag.hoveredNodeId === `section.${section.id}` ? "true" : undefined}
            draggable
            onDragStart={(event) => {
              drag.setDraggedNode(`section.${section.id}`);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("application/x-vr-section", JSON.stringify({ sectionId: section.id }));
              event.dataTransfer.setData("text/plain", semanticSectionName(section, page.slug));
            }}
            onDragEnd={() => drag.setDraggedNode(null)}
            onDragOver={(event) => {
              if (!drag.draggedNodeId?.startsWith("section.")) return;
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
            onMouseEnter={() => drag.setHoveredNode(`section.${section.id}`)}
            onMouseLeave={() => drag.setHoveredNode(null)}
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
  const drag = useDragRuntime();
  const selected = editor.state.selected?.id === node.id;

  if (node.type === "columns") {
    return (
      <details className="vr-element-node" open>
        <summary
          data-selected={selected ? "true" : undefined}
          data-hovered={drag.hoveredNodeId === node.id ? "true" : undefined}
          onClick={(event) => {
            event.preventDefault();
            editor.select({ id: node.id, type: "container", sectionId: section.id });
          }}
          onMouseEnter={() => drag.setHoveredNode(node.id)}
          onMouseLeave={() => drag.setHoveredNode(null)}
        >
          <span className="vr-element-icon">▥</span>
          <span>
            <strong>{clientLayoutLabel(section, node, slug)}</strong>
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
          data-hovered={drag.hoveredNodeId === node.id ? "true" : undefined}
          onClick={(event) => {
            event.preventDefault();
            editor.select({ id: node.id, type: "container", sectionId: section.id });
          }}
          onDragOver={(event) => {
            if (!drag.draggedNodeId || drag.draggedNodeId.startsWith("section.")) return;
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
          onMouseEnter={() => drag.setHoveredNode(node.id)}
          onMouseLeave={() => drag.setHoveredNode(null)}
        >
          <span className="vr-element-icon">{node.type === "column" ? "▤" : "▧"}</span>
          <span>
            <strong>{clientLayoutLabel(section, node, slug)}</strong>
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
      data-hovered={drag.hoveredNodeId === row.selection.id ? "true" : undefined}
      draggable
      onDragStart={(event) => {
        drag.setDraggedNode(node.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-vr-node", JSON.stringify({ sectionId: section.id, nodeId: node.id, label: node.label }));
        event.dataTransfer.setData("text/plain", node.label);
      }}
      onDragEnd={() => drag.setDraggedNode(null)}
      onClick={() => editor.select(row.selection)}
      onMouseEnter={() => drag.setHoveredNode(row.selection.id)}
      onMouseLeave={() => drag.setHoveredNode(null)}
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
  const drag = useDragRuntime();
  return (
    <div
      onDragOver={(event) => {
        if (!drag.draggedNodeId || drag.draggedNodeId.startsWith("section.")) return;
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
      label: clientLayoutLabel(section, node, slug),
      preview: mediaId ? "Pilt" : section.section_type === "hero" ? "emblem-source.svg" : undefined,
    selection: { id: `${section.id}.image`, type: "image" as const, sectionId: section.id, mediaId, field: "image", layoutNodeId: node.id },
    };
  }
  if (node.elementType === "offering") {
    return {
      icon: "A",
      label: clientLayoutLabel(section, node, slug),
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
    label: clientLayoutLabel(section, node, slug),
    preview: node.field && typeof section.content[node.field] === "string" ? String(section.content[node.field]).slice(0, 42) : undefined,
    selection: { id: `${prefix}.${node.field ?? node.id}`, type: "text" as const, sectionId: section.id, field: node.field, layoutNodeId: node.id },
  };
}

function resolveSectionMediaId(section: SectionRow): string | undefined {
  if (Object.prototype.hasOwnProperty.call(section.style ?? {}, "mediaId")) {
    return typeof section.style?.mediaId === "string" && section.style.mediaId ? section.style.mediaId : undefined;
  }
  return typeof section.content.mediaId === "string" && section.content.mediaId ? section.content.mediaId : undefined;
}

function NodeContentInspector() {
  const editor = useEditor();
  const selected = editor.state.selected!;
  const content = readEditorContent(editor.state.draft, selected);

  function writePlain(next: string, record: boolean) {
    if (!content.path) return;
    editor.setPath(content.path, next, record);
  }

  function writeRich(next: TiptapNode, record: boolean) {
    if (!content.path) return;
    editor.setPath(content.path, next, record);
  }

  return (
    <div className="vr-inspector-body">
      {content.format === "rich" ? (
        <>
          <EditorGroup label="Tekst">
            <RichEditor value={content.value} onChange={(next) => writeRich(next, false)} onCommit={(next) => writeRich(next, true)} />
          </EditorGroup>
        </>
      ) : content.format === "structured" ? (
        <StructuredContentPanel />
      ) : (
        <EditorGroup label="Tekst">
          <EditorTextarea
            key={selected.id}
            rows={Math.max(4, content.value.split("\n").length + 1)}
            value={content.value}
            onChange={(next) => writePlain(next, false)}
            onCommit={(next) => writePlain(next, true)}
          />
        </EditorGroup>
      )}
      {selected.type === "nav" ? <NavTarget /> : null}
      {selected.field?.startsWith("q.") || selected.field?.startsWith("a.") ? <FaqItemControls /> : null}
    </div>
  );
}

function NodeAppearanceInspector() {
  const editor = useEditor();
  const selected = editor.state.selected;
  if (!selected) return <PageOverview />;
  if (selected.type === "image") return <ImagePanel mode="appearance" />;
  if (selected.type === "section") return <SectionPanel mode="appearance" />;
  if (selected.type === "container") return <ContainerPanel />;
  if (selected.type === "header") return <HeaderPanel />;
  if (!selected.sectionId || !selected.field) {
    return (
      <div className="vr-inspector-body">
        <EditorContext kicker="Välimus" title={selectedKindLabel(selected.type)} />
        <p className="vr-ed-help">Selle elemendi välimust muudetakse valitud objekti kaudu, mitte saidi üldise kujunduse kaudu.</p>
      </div>
    );
  }
  const section = findSection(editor.state.draft, selected.sectionId);
  if (!section) {
    return (
      <div className="vr-inspector-body">
        <EditorContext kicker="Välimus" title={selectedKindLabel(selected.type)} />
        <p className="vr-ed-help">Valitud elemendi välimust ei õnnestunud laadida.</p>
      </div>
    );
  }
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
      <EditorSelect
        value={appearance.role ?? (selected.field === "title" || selected.field === "heading" ? "h1" : "p")}
        options={[
          { value: "h1", label: "Pealkiri 1" },
          { value: "h2", label: "Pealkiri 2" },
          { value: "h3", label: "Pealkiri 3" },
          { value: "p", label: "Lõik" },
        ]}
        onChange={(role) => patch({ role: role as TextAppearance["role"] }, true)}
      />
      <p className="vr-ed-section-label">Kiri</p>
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
      <EditorSlider
        label="Paksus"
        min={300}
        max={700}
        step={50}
        value={appearance.weight ?? 400}
        onChange={(weight) => patch({ weight })}
        exact={advanced}
        displayValue={weightLabel(appearance.weight ?? 400)}
      />
      <hr className="vr-ed-divider" />
      <p className="vr-ed-section-label">Vahed</p>
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
      {editor.role === "owner" ? (
        <>
          <hr className="vr-ed-divider" />
          <EditorSlider label="Maksimaalne laius" min={240} max={900} value={appearance.width ?? 660} onChange={(width) => patch({ width })} unit="px" exact={advanced} />
          <EditorSwitch checked={editor.state.advanced} onChange={(checked) => editor.setAdvanced(checked)} label="Täpsed väärtused" />
        </>
      ) : null}
    </div>
  );
}

function SectionPanel({ mode = "content" }: { mode?: "content" | "appearance" | "layout" }) {
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
      {mode === "content" && section.section_type === "faq" ? <FaqSectionContent sectionId={section.id} /> : null}
      {mode === "appearance" ? (
        <>
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
        </>
      ) : null}
      {mode === "layout" || mode === "content" ? (
        <>
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
              value={style.columnBalance ?? (section.section_type === "hero" ? "46-54" : "50-50")}
              options={[
                { value: "40-60", label: "40 / 60" },
                { value: "45-55", label: "45 / 55" },
                { value: "46-54", label: "46 / 54" },
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
        </>
      ) : null}
      {mode === "content" ? (
        <>
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
        </>
      ) : null}
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
      {root ? (
        <>
          <p className="vr-ed-section-label">Paigutus</p>
          <EditorGroup label="Tüüp">
            <EditorSelect
              value="columns"
              options={[
                { value: "columns", label: "Kaks veergu" },
                { value: "single", label: "Üks veerg" },
              ]}
              onChange={() => undefined}
            />
          </EditorGroup>
          <EditorGroup label="Veergude suhe">
            <EditorSelect
              value={style.columnRatio ? "custom" : style.columnBalance ?? (selectedSection.section_type === "hero" ? "46-54" : "50-50")}
              options={[
                { value: "40-60", label: "40 / 60" },
                { value: "45-55", label: "45 / 55" },
                { value: "46-54", label: "46 / 54" },
                { value: "50-50", label: "50 / 50" },
                { value: "55-45", label: "55 / 45" },
                { value: "60-40", label: "60 / 40" },
                { value: "custom", label: `${currentRatio} / ${100 - currentRatio}` },
              ]}
              onChange={(value) => {
                if (value === "custom") {
                  editor.resizeColumns(section.id, currentRatio, true);
                  return;
                }
                const left = Number(String(value).split("-")[0]);
                editor.resizeColumns(section.id, left, true);
              }}
            />
          </EditorGroup>
          <EditorSlider
            label="Vahe"
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
          <EditorGroup label="Sisu joondus">
            <EditorSelect
              value={style.textAlign ?? "center"}
              options={[
                { value: "left", label: "Vasakul" },
                { value: "center", label: "Keskel" },
                { value: "right", label: "Paremal" },
              ]}
              onChange={(textAlign) => patchStyle({ textAlign: textAlign as SectionStyle["textAlign"] })}
            />
          </EditorGroup>
          <EditorGroup label="Mobiilis">
            <EditorSelect
              value="stack"
              options={[{ value: "stack", label: "Üksteise all" }]}
              onChange={() => undefined}
            />
          </EditorGroup>
          <EditorGroup label="Mobiili järjekord">
            <EditorSelect
              value={style.mobileOrder ?? "image-first"}
              options={[
                { value: "image-first", label: "Vasak enne" },
                { value: "text-first", label: "Parem enne" },
              ]}
              onChange={(mobileOrder) => patchStyle({ mobileOrder: mobileOrder as SectionStyle["mobileOrder"] })}
            />
          </EditorGroup>
        </>
      ) : null}
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

function ImagePanel({ mode = "content" }: { mode?: "content" | "appearance" }) {
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
      <EditorContext kicker="Pilt" title={section ? imageLabel(section) : media?.alt_text || "Pilt"} />
      {mode === "content" && media ? (
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
      ) : mode === "content" ? (
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
          <MoveActions />
        </>
      ) : null}
      {mode === "appearance" ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}

function MoveActions({ asMenu = false }: { asMenu?: boolean }) {
  const editor = useEditor();
  const selected = editor.state.selected;
  const [picking, setPicking] = useState<"left" | "right" | null>(null);
  if (!selected?.sectionId) return null;
  const section = findSection(editor.state.draft, selected.sectionId);
  if (!section) return null;
  const nodeId = selected.layoutNodeId ?? resolveLayoutNodeId(section, selected);
  if (!nodeId) return null;
  const layoutId = nodeId;
  const parent = parentOfNode(section, layoutId);
  if (!parent) return null;
  const owner = parent;
  const sectionId = section.id;
  const elements = listLayoutElements(section).filter((item) => item.id !== layoutId);

  function move(placement: "before" | "after" | "left" | "right", targetNodeId?: string) {
    const target = targetNodeId ?? owner.parent.children[placement === "before" || placement === "left" ? Math.max(0, owner.index - 1) : owner.index]?.id;
    editor.moveNode(sectionId, layoutId, owner.parent.id, placement === "before" || placement === "left" ? owner.index : owner.index + 1, placement, target);
    setPicking(null);
  }

  const actions = (
    <>
      <button type="button" onClick={() => setPicking("left")}>Kõrvale vasakule…</button>
      <button type="button" onClick={() => setPicking("right")}>Kõrvale paremale…</button>
      <button type="button" onClick={() => move("before")}>Üles</button>
      <button type="button" onClick={() => move("after")}>Alla</button>
      {picking ? (
        <div className="vr-ed-pages">
          <p className="vr-ed-help">Vali element, millest {picking === "left" ? "vasakule" : "paremale"} asetada.</p>
          {elements.map((item) => (
            <button key={item.id} type="button" onClick={() => move(picking, item.id)}>
              {clientLayoutLabel(section, item)}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );

  if (asMenu) return actions;
  return <EditorGroup label="Paigutus">{actions}</EditorGroup>;
}

function AnimationPanel() {
  const editor = useEditor();
  const selected = editor.state.selected;
  const section = selected?.sectionId ? findSection(editor.state.draft, selected.sectionId) : undefined;
  if (!section) {
    return (
      <div className="vr-inspector-body">
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
      <EditorGroup label="Nähtavaks saades">
        <EditorSelect
          value={animation.preset ?? "none"}
          options={[
            { value: "none", label: "Puudub" },
            { value: "fade-in", label: "Hajub sisse" },
            { value: "fade-up", label: "Hajub alt" },
            { value: "fade-down", label: "Hajub ülevalt" },
            { value: "fade-left", label: "Hajub vasakult" },
            { value: "fade-right", label: "Hajub paremalt" },
            { value: "scale-in", label: "Suureneb sisse" },
          ]}
          onChange={(preset) => patch({ preset: preset as AnimationAppearance["preset"] })}
        />
      </EditorGroup>
      {active ? (
        <>
          <EditorSlider label="Kestus" min={0.2} max={3} step={0.1} value={animation.duration ?? 0.8} onChange={(duration) => patch({ duration }, false)} unit="s" exact displayValue={`${(animation.duration ?? 0.8).toFixed(1)}s`} />
          <EditorSlider label="Viivitus" min={0} max={2} step={0.1} value={animation.delay ?? 0} onChange={(delay) => patch({ delay }, false)} unit="s" exact displayValue={`${(animation.delay ?? 0).toFixed(1)}s`} />
          <EditorSlider label="Künnis" min={0} max={1} step={0.05} value={animation.threshold ?? 0.35} onChange={(threshold) => patch({ threshold }, false)} displayValue="Tavaline" />
          <EditorCheck checked={Boolean(animation.replayable)} onChange={(replayable) => patch({ replayable })}>
            Korda
          </EditorCheck>
        </>
      ) : null}
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
      <EditorGroup label="ID">
        <EditorTextInput value={selected.id} onChange={() => undefined} />
      </EditorGroup>
      {section ? (
        <>
          <EditorGroup label="Sektsiooni võti">
            <EditorTextInput value={section.section_key} onChange={() => undefined} />
          </EditorGroup>
          <EditorGroup label="Tüüp">
            <EditorTextInput value={section.section_type} onChange={() => undefined} />
          </EditorGroup>
        </>
      ) : null}
      <EditorGroup label="Klassid">
        <EditorButton variant="ghost" disabled>+ Lisa klass</EditorButton>
      </EditorGroup>
      <EditorGroup label="Atribuudid">
        <EditorButton variant="ghost" disabled>+ Lisa atribuut</EditorButton>
      </EditorGroup>
      <MoveActions />
    </div>
  );
}

function SiteDesignInspector() {
  const editor = useEditor();
  const theme = editor.state.draft.theme;
  const swatches = themeColorSwatches(theme);
  const exact = editor.state.advanced;
  const [tab, setTab] = useState<(typeof SITE_DESIGN_TABS)[number]["id"]>("colors");
  const tabs = SITE_DESIGN_TABS;

  return (
    <div className="vr-inspector-body">
      <EditorContext kicker="Sait" title="Saidi kujundus" />
      <div className="vr-inspector-tabs" data-mode="labels" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? "is-active" : undefined} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
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

function canMoveSelected(selected: EditorSelection | null) {
  if (!selected) return false;
  if (selected.type === "header" || selected.type === "nav" || selected.type === "page" || selected.type === "theme") return false;
  return Boolean(selected.sectionId || selected.type === "text" || selected.type === "image" || selected.type === "container");
}

function weightLabel(weight: number) {
  if (weight <= 300) return "Peenike";
  if (weight <= 400) return "Tavaline";
  if (weight <= 500) return "Keskmine";
  if (weight <= 600) return "Poolpaks";
  return "Paks";
}

function InspectorModeIcon({ tab }: { tab: InspectorTabId }) {
  if (tab === "content") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 6.5h9M5 12h14M5 17.5h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (tab === "appearance") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 16.5 14.2 6.3a2.2 2.2 0 0 1 3.1 0l.4.4a2.2 2.2 0 0 1 0 3.1L7.5 19.5H4v-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tab === "animation") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 6.5v11l10-5.5L8 6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.7 6.7l1.6 1.6M15.7 15.7l1.6 1.6M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function canDeleteSelection(selected: EditorSelection | null, contextKind: string) {
  if (contextKind === "site" || contextKind === "none" || !selected) return false;
  if (selected.type === "header" || selected.type === "nav" || selected.type === "page" || selected.type === "theme") return false;
  if (selected.id === "header.wordmark" || selected.id === "footer.text") return false;
  return Boolean(selected.sectionId || selected.type === "section" || selected.type === "container" || selected.type === "image" || selected.type === "text" || selected.type === "link");
}
