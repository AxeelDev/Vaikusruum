"use client";

import { useEffect, useMemo, useState } from "react";
import { Inspector } from "@/components/editor/Inspector";
import { useEditor } from "@/components/editor/EditorProvider";
import { SiteView } from "@/components/site/SiteView";
import { ADDABLE_SECTIONS, BREAKPOINT_WIDTH } from "@/lib/editor/types";
import { pageSections } from "@/lib/editor/draft";
import { sanitizeCustomCss, themeToCssVars } from "@/lib/theme/theme";
import { pageHref } from "@/lib/utils/urls";

export function VisualEditor({ debug = false }: { debug?: boolean }) {
  const editor = useEditor();
  const { state } = editor;
  const [addOpen, setAddOpen] = useState(false);
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
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (state.inlineEditingId) {
          editor.stopInlineEdit();
          return;
        }
        if (state.selected) editor.deselect();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void editor.save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, state.inlineEditingId, state.selected]);

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
      <div className="vr-editor-root" data-inspector-open={state.inspectorOpen ? "true" : "false"}>
        <Inspector />
        <main className="vr-editor-workspace">
        <div className="vr-editor-toolbar">
          <div className="vr-editor-tools">
            <div className="vr-editor-add">
              <button type="button" aria-label="Lisa sektsioon" onClick={() => setAddOpen((open) => !open)}>
                +
              </button>
              {addOpen ? (
                <div className="vr-editor-menu">
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
            <button type="button" aria-label="Võta tagasi" disabled={state.historyIndex <= 0} onClick={() => editor.undo()}>
              ↶
            </button>
            <button
              type="button"
              aria-label="Tee uuesti"
              disabled={state.historyIndex >= state.history.length - 1}
              onClick={() => editor.redo()}
            >
              ↷
            </button>
            <div className="vr-editor-breakpoints">
              <button type="button" className={state.breakpoint === "desktop" ? "is-active" : ""} onClick={() => editor.setBreakpoint("desktop")}>
                Desktop
              </button>
              <button type="button" className={state.breakpoint === "tablet" ? "is-active" : ""} onClick={() => editor.setBreakpoint("tablet")}>
                Tahvel
              </button>
              <button type="button" className={state.breakpoint === "mobile" ? "is-active" : ""} onClick={() => editor.setBreakpoint("mobile")}>
                Mobiil
              </button>
            </div>
            <button type="button" className={state.preview ? "is-active" : ""} onClick={() => editor.setPreview(!state.preview)}>
              Eelvaade
            </button>
            {state.dirty ? <span className="vr-editor-dirty">Salvestamata muudatused</span> : null}
            <button type="button" className="vr-cta vr-editor-save" disabled={state.saving || !state.dirty} onClick={() => void editor.save()}>
              {state.saving ? "Salvestan…" : "Salvesta"}
            </button>
          </div>
        </div>
        {state.saveError ? <p className="vr-form-error vr-editor-error">{state.saveError}</p> : null}
        <div className={`vr-editor-canvas vr-editor-canvas--${state.breakpoint}${state.preview ? " is-preview" : ""}`}>
          <div
            className="vr-editor-frame"
            style={{ width: BREAKPOINT_WIDTH[state.breakpoint] }}
            onClickCapture={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("a, button[type='submit']")) {
                event.preventDefault();
              }
            }}
            onSubmitCapture={(event) => event.preventDefault()}
          >
            <SiteView
              page={page}
              sections={sections}
              offerings={state.draft.offerings}
              eventsByOffering={state.draft.eventsByOffering}
              media={state.draft.media}
              settings={state.draft.settings}
              nav={nav}
              themeDensity={state.draft.theme.specksDensity}
            />
          </div>
        </div>
      </main>
      </div>
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
