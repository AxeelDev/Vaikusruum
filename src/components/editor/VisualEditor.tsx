"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Inspector } from "@/components/editor/Inspector";
import { useEditor } from "@/components/editor/EditorProvider";
import { SiteView } from "@/components/site/SiteView";
import { ADDABLE_SECTIONS, BREAKPOINT_WIDTH } from "@/lib/editor/types";
import { pageSections } from "@/lib/editor/draft";
import { sanitizeCustomCss, themeToCssVars } from "@/lib/theme/theme";
import { pageHref } from "@/lib/utils/urls";
import { logoutAction } from "@/lib/actions/admin";

export function VisualEditor() {
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

  if (!page) return <p>Lehti ei leitud.</p>;

  return (
    <div className={`vr-editor-shell${state.inspectorOpen ? " is-inspecting" : ""}`} style={themeToCssVars(state.draft.theme)}>
      {state.draft.customCss ? <style>{sanitizeCustomCss(state.draft.customCss)}</style> : null}
      <Inspector />
      <div className="vr-editor-workspace">
        <div className="vr-editor-toolbar">
          <select
            className="vr-editor-pageselect"
            value={page.id}
            onChange={(event) => {
              if (state.dirty && !window.confirm("Salvestamata muudatused. Vahetan lehte?")) return;
              editor.switchPage(event.target.value);
            }}
            aria-label="Leht"
          >
            {state.draft.pages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nav_label || item.title}
              </option>
            ))}
          </select>
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
            <button type="button" aria-label="Välimus" onClick={() => editor.setThemePanel(true)}>
              <Brush />
            </button>
            <button type="button" className={state.preview ? "is-active" : ""} onClick={() => editor.setPreview(!state.preview)}>
              Eelvaade
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
            {state.dirty ? <span className="vr-editor-dirty">Salvestamata muudatused</span> : null}
            <button type="button" className="vr-cta vr-editor-save" disabled={state.saving || !state.dirty} onClick={() => void editor.save()}>
              {state.saving ? "Salvestan…" : "Salvesta"}
            </button>
            <Link href="/admin/sisu">Haldus</Link>
            <form action={logoutAction}>
              <button type="submit">Välju</button>
            </form>
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
      </div>
    </div>
  );
}

function Brush() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20c2-1 3-3 3-5 0-3 3-6 7-6 1 0 3 1 4 2l-8 8c-1 1-4 2-6 1Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
