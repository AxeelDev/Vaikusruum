"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Inspector } from "@/components/editor/Inspector";
import { useEditor } from "@/components/editor/EditorProvider";
import { EditorButton } from "@/components/editor/ui";
import { SiteView } from "@/components/site/SiteView";
import { BREAKPOINT_WIDTH } from "@/lib/editor/types";
import { pageSections } from "@/lib/editor/draft";
import { hrefToSlug } from "@/lib/editor/pages";
import { sanitizeCustomCss, themeToCssVars } from "@/lib/theme/theme";
import { pageHref } from "@/lib/utils/urls";

export function VisualEditor({ debug = false }: { debug?: boolean }) {
  const editor = useEditor();
  const { state } = editor;
  const [ctx, setCtx] = useState<{ x: number; y: number; sectionId: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const page = state.draft.pages.find((item) => item.id === state.pageId) ?? state.draft.pages[0];
  const sections = page ? pageSections(state.draft, page.id) : [];
  const nav = useMemo(
    () =>
      state.draft.pages
        .filter((item) => item.show_in_nav)
        .sort((a, b) => a.nav_order - b.nav_order)
        .map((item) => ({
          href: pageHref(item.slug),
          label: item.nav_label || item.title,
          slug: item.slug,
        })),
    [state.draft.pages],
  );
  useEffect(() => {
    document.documentElement.classList.add("vr-editor-lock");
    return () => document.documentElement.classList.remove("vr-editor-lock");
  }, []);

  useEffect(() => {
    canvasRef.current?.scrollTo({ top: 0 });
    const timer = window.setTimeout(() => {
      setCtx(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [state.pageId]);

  useEffect(() => {
    if (!ctx) return;
    function close() {
      setCtx(null);
    }
    const timer = window.setTimeout(() => window.addEventListener("click", close), 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("click", close);
    };
  }, [ctx]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.closest("input, textarea, select, [contenteditable='true']"));
      if (event.key === "Escape") {
        if (state.preview) {
          editor.setPreview(false);
          return;
        }
        if (state.inlineEditingId) {
          editor.stopInlineEdit();
          return;
        }
        if (state.selected) editor.deselect();
        return;
      }
      if (event.key === "Enter" && !typing && state.selected && !state.inlineEditingId) {
        const type = state.selected.type;
        if (type === "text" || type === "nav" || type === "link") {
          event.preventDefault();
          editor.startInlineEdit(state.selected.id);
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        if (typing) return;
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (state.dirty && !state.saving) void editor.save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, state.dirty, state.inlineEditingId, state.preview, state.saving, state.selected]);

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [state.dirty]);

  if (!page) {
    return (
      <div className="vr-editor-boot-error">
        <p className="vr-wordmark vr-wordmark--header">VAIKUSRUUM</p>
        <p>Sisu laadimine ebaõnnestus.</p>
      </div>
    );
  }

  return (
    <div className="vr-editor-app" style={themeToCssVars(state.draft.theme)}>
      {state.draft.customCss ? <style>{sanitizeCustomCss(state.draft.customCss)}</style> : null}
      <div
        className="vr-editor-root"
        data-inspector-open={state.inspectorOpen ? "true" : "false"}
        data-has-selection={state.selected || state.themePanel ? "true" : "false"}
      >
        <Inspector />
        <main className="vr-editor-workspace">
          <div
            ref={canvasRef}
            className={`vr-editor-canvas vr-editor-canvas--${state.breakpoint}${state.preview ? " is-preview" : ""}`}
            data-vr-edit-mode={state.preview ? "false" : "true"}
            onContextMenu={(event) => {
              if (state.preview) return;
              const target = (event.target as HTMLElement).closest("[data-vr-edit-id]");
              const id = target?.getAttribute("data-vr-edit-id") ?? "";
              if (!id.startsWith("section.")) return;
              event.preventDefault();
              setCtx({ x: event.clientX, y: event.clientY, sectionId: id.slice("section.".length) });
            }}
            onClickCapture={(event) => {
              const target = event.target as HTMLElement;
              const link = target.closest("a");
              if (link) {
                event.preventDefault();
                if (event.shiftKey || state.preview) return;
                const href = link.getAttribute("href");
                if (!href) return;
                const slug = hrefToSlug(href);
                if (slug) editor.requestSwitchPageBySlug(slug);
              }
              if (target.closest("button[type='submit']")) event.preventDefault();
            }}
            onSubmitCapture={(event) => event.preventDefault()}
          >
            <div className="vr-editor-frame" style={{ width: BREAKPOINT_WIDTH[state.breakpoint] }}>
              <SiteView
                page={page}
                sections={sections}
                offerings={state.draft.offerings}
                eventsByOffering={state.draft.eventsByOffering}
                media={state.draft.media}
                settings={state.draft.settings}
                nav={nav}
                themeDensity={state.draft.theme.specksDensity}
                headerSticky={state.draft.theme.headerSticky}
              />
            </div>
          </div>
        </main>
      </div>
      {state.pendingPageId || state.pendingNavigationHref ? (
        <div className="vr-ed-modal-backdrop">
          <div className="vr-ed-modal" role="dialog" aria-modal="true">
            <p>Sul on salvestamata muudatusi.</p>
            <div className="vr-ed-modal-actions">
              <EditorButton variant="ghost" onClick={() => editor.cancelPendingNavigation()}>
                Tagasi
              </EditorButton>
              <EditorButton
                variant="secondary"
                onClick={() =>
                  void (state.pendingNavigationHref
                    ? editor.confirmPendingNavigation("discard")
                    : editor.confirmPendingPage("discard"))
                }
              >
                Jätka salvestamata
              </EditorButton>
              <EditorButton
                variant="primary"
                onClick={() =>
                  void (state.pendingNavigationHref
                    ? editor.confirmPendingNavigation("save")
                    : editor.confirmPendingPage("save"))
                }
              >
                Salvesta ja jätka
              </EditorButton>
            </div>
          </div>
        </div>
      ) : null}
      {ctx ? (
        <div className="vr-ed-ctx" style={{ left: ctx.x, top: ctx.y }} onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              editor.select({ id: `section.${ctx.sectionId}`, type: "section", sectionId: ctx.sectionId });
              editor.setTab("content");
              setCtx(null);
            }}
          >
            Muuda
          </button>
          <button
            type="button"
            onClick={() => {
              editor.duplicateSection(ctx.sectionId);
              setCtx(null);
            }}
          >
            Dubleeri
          </button>
          <button type="button" onClick={() => { editor.moveSection(ctx.sectionId, -1); setCtx(null); }}>
            Liiguta üles
          </button>
          <button type="button" onClick={() => { editor.moveSection(ctx.sectionId, 1); setCtx(null); }}>
            Liiguta alla
          </button>
          <button
            type="button"
            onClick={() => {
              editor.patchSection(ctx.sectionId, (row) => ({ ...row, enabled: !row.enabled }));
              setCtx(null);
            }}
          >
            Peida
          </button>
          <button
            type="button"
            className="vr-ed-danger"
            onClick={() => {
              editor.removeSection(ctx.sectionId);
              setCtx(null);
            }}
          >
            Kustuta
          </button>
        </div>
      ) : null}
      {debug ? (
        <EditorDebug
          pageSlug={page.slug}
          selectedId={state.selected?.id ?? null}
          inspectorOpen={state.inspectorOpen}
        />
      ) : null}
    </div>
  );
}

function EditorDebug({
  pageSlug,
  selectedId,
  inspectorOpen,
}: {
  pageSlug: string;
  selectedId: string | null;
  inspectorOpen: boolean;
}) {
  const [metrics, setMetrics] = useState({ sidebar: 0, workspace: 0, canvas: 0, root: 0 });

  useEffect(() => {
    function measure() {
      const root = document.querySelector(".vr-editor-root");
      const sidebar = document.querySelector(".vr-inspector");
      const workspace = document.querySelector(".vr-editor-workspace");
      const canvas = document.querySelector(".vr-editor-canvas");
      setMetrics({
        root: Math.round(root?.getBoundingClientRect().width ?? 0),
        sidebar: Math.round(sidebar?.getBoundingClientRect().width ?? 0),
        workspace: Math.round(workspace?.getBoundingClientRect().width ?? 0),
        canvas: Math.round(canvas?.getBoundingClientRect().width ?? 0),
      });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [inspectorOpen]);

  return (
    <div className="vr-editor-debug">
      <div>root: {metrics.root}</div>
      <div>sidebar: {metrics.sidebar}</div>
      <div>workspace: {metrics.workspace}</div>
      <div>canvas: {metrics.canvas}</div>
      <div>page: {pageSlug}</div>
      <div>selected: {selectedId ?? "—"}</div>
    </div>
  );
}
