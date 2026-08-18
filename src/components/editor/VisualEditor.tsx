"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Inspector } from "@/components/editor/Inspector";
import { useEditor } from "@/components/editor/EditorProvider";
import { EditorButton } from "@/components/editor/ui";
import { SiteView } from "@/components/site/SiteView";
import { BREAKPOINT_WIDTH } from "@/lib/editor/types";
import { pageSections } from "@/lib/editor/draft";
import { hrefToSlug } from "@/lib/editor/pages";
import { logoutAction } from "@/lib/actions/admin";
import { sanitizeCustomCss, themeToCssVars } from "@/lib/theme/theme";
import { pageHref } from "@/lib/utils/urls";

const DRAG_THRESHOLD = 6;
const AUTO_SCROLL_EDGE = 60;

type OverlayBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  label?: string;
};

type DropVisual = {
  target: OverlayBox;
  line?: OverlayBox;
  empty?: OverlayBox;
  parentId: string;
  index: number;
};

type DropTarget = {
  parentId: string;
  kind: string;
  rect: DOMRect;
  children: Array<{ id: string; rect: DOMRect }>;
};

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  nodeId: string;
  sectionId: string;
  label: string;
  source: HTMLElement;
  dragging: boolean;
  targets: DropTarget[];
  drop: DropVisual | null;
  ghost: HTMLElement | null;
  removeListeners?: () => void;
};

export function VisualEditor({ debug = false }: { debug?: boolean }) {
  const editor = useEditor();
  const { state } = editor;
  const [ctx, setCtx] = useState<{ x: number; y: number; sectionId: string } | null>(null);
  const [hoverBox, setHoverBox] = useState<OverlayBox | null>(null);
  const [selectedBox, setSelectedBox] = useState<OverlayBox | null>(null);
  const [dropVisual, setDropVisual] = useState<DropVisual | null>(null);
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);
  const autoScrollRef = useRef<{ frame: number | null; speed: number }>({ frame: null, speed: 0 });
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

  function escapeSelector(value: string) {
    return (window.CSS?.escape ?? ((raw: string) => raw.replace(/["\\]/g, "\\$&")))(value);
  }

  function boxForElement(element: Element | null, label?: string): OverlayBox | null {
    const canvas = canvasRef.current;
    if (!canvas || !(element instanceof HTMLElement)) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const canvasRect = canvas.getBoundingClientRect();
    return {
      left: rect.left - canvasRect.left + canvas.scrollLeft,
      top: rect.top - canvasRect.top + canvas.scrollTop,
      width: rect.width,
      height: rect.height,
      label,
    };
  }

  function elementForEditId(id: string | null) {
    if (!id || !canvasRef.current) return null;
    return canvasRef.current.querySelector<HTMLElement>(`[data-vr-edit-id="${escapeSelector(id)}"]`);
  }

  function updateSelectionOverlay() {
    const selected = state.selected;
    const label = selected && (selected.type === "section" || selected.type === "container" || selected.type === "image")
      ? selected.type
      : undefined;
    setSelectedBox(selected ? boxForElement(elementForEditId(selected.id), label) : null);
  }

  function updateHoverOverlay(id: string | null) {
    hoveredIdRef.current = id;
    editor.setHoveredNode(id);
    if (!id || state.preview) {
      setHoverBox(null);
      return;
    }
    if (id === state.selected?.id) {
      setHoverBox(null);
      return;
    }
    setHoverBox(boxForElement(elementForEditId(id)));
  }

  function collectDropTargets(session: DragSession): DropTarget[] {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    const selector = `[data-vr-drop-container][data-vr-section-id="${escapeSelector(session.sectionId)}"]`;
    return Array.from(canvas.querySelectorAll<HTMLElement>(selector)).flatMap((container) => {
      if (session.source.contains(container)) return [];
      const parentId = container.dataset.vrDropContainer;
      if (!parentId) return [];
      const children = Array.from(container.children).flatMap((child) => {
        if (!(child instanceof HTMLElement)) return [];
        const id = child.dataset.vrNodeId;
        if (!id || id === session.nodeId) return [];
        return [{ id, rect: child.getBoundingClientRect() }];
      });
      return [{ parentId, kind: container.dataset.vrNodeKind ?? "container", rect: container.getBoundingClientRect(), children }];
    });
  }

  function toCanvasBox(rect: DOMRect, label?: string): OverlayBox | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const canvasRect = canvas.getBoundingClientRect();
    return {
      left: rect.left - canvasRect.left + canvas.scrollLeft,
      top: rect.top - canvasRect.top + canvas.scrollTop,
      width: rect.width,
      height: rect.height,
      label,
    };
  }

  function nearestDrop(session: DragSession, clientX: number, clientY: number): DropVisual | null {
    const candidates = session.targets
      .filter((target) => {
        const rect = target.rect;
        return (
          clientX >= rect.left - 32 &&
          clientX <= rect.right + 32 &&
          clientY >= rect.top - 32 &&
          clientY <= rect.bottom + 32
        );
      })
      .sort((a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height);
    const target = candidates[0];
    if (!target) return null;

    let index = target.children.length;
    for (let i = 0; i < target.children.length; i += 1) {
      const child = target.children[i];
      if (clientY < child.rect.top + child.rect.height / 2) {
        index = i;
        break;
      }
    }

    const targetBox = toCanvasBox(target.rect);
    if (!targetBox) return null;

    if (target.children.length === 0) {
      return {
        target: { ...targetBox, label: target.kind === "column" ? "COLUMN" : undefined },
        empty: targetBox,
        parentId: target.parentId,
        index: 0,
      };
    }

    const before = target.children[index - 1]?.rect;
    const after = target.children[index]?.rect;
    const viewportTop = after ? after.top : before ? before.bottom : target.rect.top + target.rect.height / 2;
    const lineTop = viewportTop - 1;
    const lineBox = toCanvasBox(new DOMRect(target.rect.left, lineTop, target.rect.width, 2));
    return lineBox
      ? {
          target: { ...targetBox, label: target.kind === "column" ? "COLUMN" : undefined },
          line: lineBox,
          parentId: target.parentId,
          index,
        }
      : null;
  }

  function positionGhost(session: DragSession) {
    if (!session.ghost) return;
    session.ghost.style.transform = `translate3d(${session.currentX + 12}px, ${session.currentY + 12}px, 0)`;
  }

  function createGhost(session: DragSession) {
    const rect = session.source.getBoundingClientRect();
    const ghost = session.source.cloneNode(true) as HTMLElement;
    ghost.classList.add("vr-editor-drag-ghost");
    ghost.removeAttribute("data-editor-dragging");
    ghost.style.width = `${Math.min(rect.width, 320)}px`;
    ghost.style.maxHeight = "220px";
    ghost.style.transform = `translate3d(${session.currentX + 12}px, ${session.currentY + 12}px, 0)`;
    document.body.appendChild(ghost);
    session.ghost = ghost;
  }

  function stopAutoScroll() {
    autoScrollRef.current.speed = 0;
    if (autoScrollRef.current.frame) {
      window.cancelAnimationFrame(autoScrollRef.current.frame);
      autoScrollRef.current.frame = null;
    }
  }

  function scheduleAutoScroll(session: DragSession, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const topDistance = clientY - rect.top;
    const bottomDistance = rect.bottom - clientY;
    const nextSpeed =
      topDistance < AUTO_SCROLL_EDGE
        ? -Math.max(4, Math.round((AUTO_SCROLL_EDGE - topDistance) / 4))
        : bottomDistance < AUTO_SCROLL_EDGE
          ? Math.max(4, Math.round((AUTO_SCROLL_EDGE - bottomDistance) / 4))
          : 0;
    autoScrollRef.current.speed = nextSpeed;
    if (!nextSpeed || autoScrollRef.current.frame) return;

    const tick = () => {
      const active = dragRef.current;
      const frame = canvasRef.current;
      if (!active?.dragging || !frame || autoScrollRef.current.speed === 0) {
        stopAutoScroll();
        return;
      }
      frame.scrollBy({ top: autoScrollRef.current.speed });
      active.targets = collectDropTargets(active);
      const nextDrop = nearestDrop(active, active.currentX, active.currentY);
      active.drop = nextDrop;
      setDropVisual(nextDrop);
      updateSelectionOverlay();
      autoScrollRef.current.frame = window.requestAnimationFrame(tick);
    };
    autoScrollRef.current.frame = window.requestAnimationFrame(tick);
  }

  function cleanupDrag(commit: boolean) {
    const session = dragRef.current;
    if (!session) return;
    session.removeListeners?.();
    session.removeListeners = undefined;
    stopAutoScroll();
    session.source.removeAttribute("data-editor-dragging");
    session.ghost?.remove();
    if (session.dragging) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    if (commit && session.drop) {
      editor.moveNode(session.sectionId, session.nodeId, session.drop.parentId, session.drop.index);
    } else {
      editor.setDraggedNode(null);
    }
    dragRef.current = null;
    setDragging(false);
    setDropVisual(null);
    document.documentElement.classList.remove("vr-editor-is-dragging");
  }

  function beginDrag(session: DragSession) {
    session.dragging = true;
    session.source.setAttribute("data-editor-dragging", "");
    session.targets = collectDropTargets(session);
    editor.setDraggedNode(session.nodeId);
    const selectionType = session.source.dataset.vrSelectionType;
    editor.select({
      id: session.source.dataset.vrSelectionId ?? session.nodeId,
      type: selectionType === "text" || selectionType === "image" ? selectionType : "container",
      sectionId: session.sectionId,
    });
    createGhost(session);
    setDragging(true);
    document.documentElement.classList.add("vr-editor-is-dragging");
  }

  function updateDrag(session: DragSession, event: PointerEvent) {
    session.currentX = event.clientX;
    session.currentY = event.clientY;
    positionGhost(session);
    const nextDrop = nearestDrop(session, event.clientX, event.clientY);
    session.drop = nextDrop;
    setDropVisual(nextDrop);
    scheduleAutoScroll(session, event.clientY);
  }

  function onCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (state.preview || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest(".vr-header, input, textarea, select, button, [data-vr-column-resize]")) return;
    const source = target.closest<HTMLElement>("[data-vr-draggable-node]");
    if (!source) return;
    const nodeId = source.dataset.vrNodeId;
    const sectionId = source.dataset.vrSectionId;
    if (!nodeId || !sectionId) return;
    const session: DragSession = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      nodeId,
      sectionId,
      label: source.dataset.vrDragLabel ?? "Element",
      source,
      dragging: false,
      targets: [],
      drop: null,
      ghost: null,
    };
    dragRef.current = session;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Safari can reject capture if the pointer was already canceled.
    }

    const move = (moveEvent: PointerEvent) => {
      const active = dragRef.current;
      if (!active || active.pointerId !== moveEvent.pointerId) return;
      const dx = moveEvent.clientX - active.startX;
      const dy = moveEvent.clientY - active.startY;
      if (!active.dragging && dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
        beginDrag(active);
      }
      if (active.dragging) {
        moveEvent.preventDefault();
        updateDrag(active, moveEvent);
      }
    };
    const up = (upEvent: PointerEvent) => {
      const active = dragRef.current;
      if (!active || active.pointerId !== upEvent.pointerId) return;
      if (active.dragging) upEvent.preventDefault();
      cleanupDrag(active.dragging);
    };
    const cancel = () => {
      cleanupDrag(false);
    };
    session.removeListeners = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up, { passive: false });
    window.addEventListener("pointercancel", cancel);
  }

  useEffect(() => {
    canvasRef.current?.scrollTo({ top: 0 });
    const timer = window.setTimeout(() => {
      setCtx(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [state.pageId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => updateSelectionOverlay());
    return () => window.cancelAnimationFrame(frame);
    // Overlay measurement intentionally reads committed DOM after editor draft/selection renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selected, state.draft, state.breakpoint, state.preview]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!state.hoveredNodeId || state.hoveredNodeId === state.selected?.id) {
        setHoverBox(null);
        return;
      }
      setHoverBox(boxForElement(elementForEditId(state.hoveredNodeId)));
    });
    return () => window.cancelAnimationFrame(frame);
    // Hover overlay is a DOM measurement, not derived render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hoveredNodeId, state.selected?.id, state.draft, state.breakpoint, state.preview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const refresh = () => {
      updateSelectionOverlay();
      if (hoveredIdRef.current) setHoverBox(boxForElement(elementForEditId(hoveredIdRef.current)));
    };
    canvas.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh);
    return () => {
      canvas.removeEventListener("scroll", refresh);
      window.removeEventListener("resize", refresh);
    };
  });

  useEffect(() => {
    if (!state.selected || state.preview) return;
    const frame = canvasRef.current;
    if (!frame) return;
    const escape = window.CSS?.escape ?? ((value: string) => value.replace(/["\\]/g, "\\$&"));
    const node = frame.querySelector<HTMLElement>(`[data-vr-edit-id="${escape(state.selected.id)}"]`);
    node?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }, [state.preview, state.selected]);

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
      const typing = Boolean(target?.closest("input, textarea, select"));
      if (event.key === "Escape") {
        if (dragRef.current) {
          event.preventDefault();
          cleanupDrag(false);
          return;
        }
        if (state.preview) {
          editor.setPreview(false);
          return;
        }
        if (state.selected) editor.deselect();
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
    // cleanupDrag closes the current pointer session; rebinding on every helper recreation is unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, state.dirty, state.preview, state.saving, state.selected]);

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
          <EditorTopBar />
          <div
            ref={canvasRef}
            className={`vr-editor-canvas vr-editor-canvas--${state.breakpoint}${state.preview ? " is-preview" : ""}${dragging ? " is-dragging" : ""}`}
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
              if (suppressClickRef.current) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              const target = event.target as HTMLElement;
              const link = target.closest("a");
              if (link) {
                event.preventDefault();
                if (event.shiftKey) return;
                const href = link.getAttribute("href");
                if (!href) return;
                const slug = hrefToSlug(href);
                if (slug) editor.requestSwitchPageBySlug(slug);
              }
              if (target.closest("button[type='submit']")) event.preventDefault();
            }}
            onPointerDownCapture={onCanvasPointerDown}
            onPointerMoveCapture={(event) => {
              if (state.preview || dragRef.current?.dragging) return;
              const target = event.target as HTMLElement;
              const hit = target.closest<HTMLElement>("[data-vr-edit-id]");
              const id = hit?.dataset.vrEditId ?? null;
              if (id !== hoveredIdRef.current) updateHoverOverlay(id);
            }}
            onPointerLeave={() => {
              if (!dragRef.current?.dragging) updateHoverOverlay(null);
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
            {!state.preview ? (
              <EditorCanvasOverlay
                hoverBox={hoverBox}
                selectedBox={selectedBox}
                dropVisual={dropVisual}
                dragging={dragging}
              />
            ) : null}
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

function EditorTopBar() {
  const editor = useEditor();
  const { state } = editor;
  const [menuOpen, setMenuOpen] = useState(false);
  const page = state.draft.pages.find((item) => item.id === state.pageId);
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const saveText = state.saving ? "Salvestan…" : state.saveFlash && !state.dirty ? "Salvestatud" : "Salvesta";

  return (
    <div className="vr-editor-topstrip">
      <div className="vr-editor-topbar" role="toolbar" aria-label="Redaktori tööriistariba">
        <button type="button" aria-label="Lisa sektsioon" onClick={() => editor.addSection("rich_text")}>
          +
        </button>
        <button type="button" aria-label="Võta tagasi" disabled={!canUndo} onClick={() => editor.undo()}>
          ↶
        </button>
        <button type="button" aria-label="Tee uuesti" disabled={!canRedo} onClick={() => editor.redo()}>
          ↷
        </button>
        <button type="button" aria-label="Eelvaade" data-active={state.preview ? "true" : undefined} onClick={() => editor.setPreview(!state.preview)}>
          ▶
        </button>
        <div className="vr-editor-device" aria-label="Seade">
          {(["desktop", "tablet", "mobile"] as const).map((breakpoint) => (
            <button
              key={breakpoint}
              type="button"
              data-active={state.breakpoint === breakpoint ? "true" : undefined}
              onClick={() => editor.setBreakpoint(breakpoint)}
            >
              {breakpoint === "desktop" ? "Desktop" : breakpoint === "tablet" ? "Tahvel" : "Mobiil"}
            </button>
          ))}
        </div>
        <span className="vr-editor-status">
          <span className="vr-editor-status-dot" data-dirty={state.dirty ? "true" : undefined} />
          {page?.title ?? "Leht"}
        </span>
        <button type="button" className="vr-editor-save-top" disabled={state.saving || !state.dirty} onClick={() => void editor.save()}>
          {saveText}
        </button>
        <div className="vr-editor-more">
          <button type="button" aria-label="Menüü" onClick={() => setMenuOpen((open) => !open)}>
            ⋮
          </button>
          {menuOpen ? (
            <div className="vr-editor-menu vr-editor-top-menu">
              <button type="button" onClick={() => editor.requestNavigation("/admin")}>
                Haldus
              </button>
              <button type="button" onClick={() => editor.requestNavigation("/")}>
                Vaata lehte
              </button>
              <button type="button" onClick={() => editor.requestNavigation("/admin/media")}>
                Pildid
              </button>
              <button type="button" onClick={() => editor.requestNavigation("/admin/settings")}>
                Seaded
              </button>
              <form action={logoutAction}>
                <button type="submit">Logi välja</button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EditorCanvasOverlay({
  hoverBox,
  selectedBox,
  dropVisual,
  dragging,
}: {
  hoverBox: OverlayBox | null;
  selectedBox: OverlayBox | null;
  dropVisual: DropVisual | null;
  dragging: boolean;
}) {
  return (
    <div className="vr-editor-overlay" aria-hidden="true" data-dragging={dragging ? "true" : undefined}>
      {hoverBox ? <OverlayRect box={hoverBox} kind="hover" /> : null}
      {selectedBox ? <OverlayRect box={selectedBox} kind="selected" /> : null}
      {dropVisual?.target ? <OverlayRect box={dropVisual.target} kind="target" /> : null}
      {dropVisual?.line ? <OverlayRect box={dropVisual.line} kind="insert" /> : null}
      {dropVisual?.empty ? (
        <div
          className="vr-editor-empty-drop"
          style={{
            left: dropVisual.empty.left,
            top: dropVisual.empty.top,
            width: dropVisual.empty.width,
            height: dropVisual.empty.height,
          }}
        >
          Drop here
        </div>
      ) : null}
    </div>
  );
}

function OverlayRect({ box, kind }: { box: OverlayBox; kind: "hover" | "selected" | "target" | "insert" }) {
  return (
    <div
      className={`vr-editor-overlay-rect vr-editor-overlay-rect--${kind}`}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    >
      {box.label && kind === "selected" ? <span>{box.label.toUpperCase()}</span> : null}
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
