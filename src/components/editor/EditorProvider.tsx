"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { saveEditorDraftAction, type EditorSavePayload } from "@/lib/actions/admin";
import { cloneDraft, createSection, duplicateSection as cloneSectionRow, findSection, pageSections, reorderSections, updateSection } from "@/lib/editor/draft";
import { insertLayoutElement, moveLayoutNode, normalizeSectionLayout, removeLayoutNode, resizeLayoutColumns, resolveLayoutNodeId } from "@/lib/editor/layout-tree";
import { mergeFieldStyle } from "@/lib/editor/appearance";
import { resolveInspectorTab, resolveNodeKind } from "@/lib/editor/node-registry";
import { readEditorContent } from "@/lib/editor/content-binding";
import type { AddableElementType, AddableSectionType, DragRuntimeState, EditPath, EditorDraft, EditorSelection, EditorState, InspectorContext, InspectorTab } from "@/lib/editor/types";
import type { AdminRole, MediaRow, OfferingRow, SectionRow, TextAppearance } from "@/types/content";
import type { ThemeTokens } from "@/lib/theme/theme";

export type { EditPath };

export type PagePatch = Partial<{
  title: string;
  nav_label: string | null;
  show_in_nav: boolean;
  slug: string;
  is_published: boolean;
  seo_title: string | null;
  seo_description: string | null;
}>;

type EditorApi = {
  state: EditorState;
  role: AdminRole;
  select: (selection: EditorSelection) => void;
  deselect: () => void;
  closeInspector: () => void;
  goBack: () => void;
  setTab: (tab: InspectorTab) => void;
  setBreakpoint: (breakpoint: EditorState["breakpoint"]) => void;
  setPreview: (preview: boolean) => void;
  setAdvanced: (advanced: boolean) => void;
  openSiteDesign: () => void;
  closeSiteDesign: () => void;
  setPath: (path: EditPath, value: unknown, record?: boolean) => void;
  patchSection: (sectionId: string, updater: (section: SectionRow) => SectionRow, record?: boolean) => void;
  patchTheme: (patch: Partial<ThemeTokens>, record?: boolean) => void;
  patchMedia: (id: string, patch: Partial<MediaRow>, record?: boolean) => void;
  addMedia: (item: MediaRow) => void;
  patchPage: (id: string, patch: PagePatch, record?: boolean) => void;
  patchFieldStyle: (sectionId: string, field: string, patch: Partial<TextAppearance>, record?: boolean) => void;
  switchPage: (pageId: string) => void;
  switchPageBySlug: (slug: string) => boolean;
  requestSwitchPage: (pageId: string) => void;
  requestSwitchPageBySlug: (slug: string) => boolean;
  confirmPendingPage: (mode: "save" | "discard") => Promise<void>;
  requestNavigation: (href: string) => void;
  confirmPendingNavigation: (mode: "save" | "discard") => Promise<void>;
  cancelPendingNavigation: () => void;
  cancelPendingPage: () => void;
  addSection: (type: AddableSectionType) => void;
  addElement: (type: AddableElementType, target?: { sectionId?: string; parentId?: string; index?: number; placement?: "before" | "after" | "left" | "right" | "inside"; targetNodeId?: string }) => void;
  moveSection: (sectionId: string, direction: -1 | 1) => void;
  moveSectionToIndex: (sectionId: string, targetIndex: number) => void;
  moveNode: (sectionId: string, nodeId: string, targetParentId: string, targetIndex: number, placement?: "before" | "after" | "left" | "right" | "inside", targetNodeId?: string) => void;
  resizeColumns: (sectionId: string, leftPercent: number, record?: boolean) => void;
  duplicateSection: (sectionId: string) => void;
  removeSection: (sectionId: string) => void;
  removeSelected: () => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<boolean>;
};

const StateContext = createContext<EditorState | null>(null);
const ApiContext = createContext<Omit<EditorApi, "state"> | null>(null);
const RoleContext = createContext<AdminRole>("editor");
const DragStateContext = createContext<DragRuntimeState>({ draggedNodeId: null, hoveredNodeId: null });
const DragApiContext = createContext<{
  setDraggedNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
} | null>(null);

const HISTORY_LIMIT = 50;

function snapshot(draft: EditorDraft): EditorDraft {
  return cloneDraft(draft);
}

export function EditorProvider({
  initial,
  role,
  children,
}: {
  initial: EditorDraft;
  role: AdminRole;
  children: ReactNode;
}) {
  const home = initial.pages.find((page) => page.slug === "avaleht") ?? initial.pages[0];
  const historyRef = useRef({ items: [snapshot(initial)], index: 0 });
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [draft, setDraft] = useState<EditorDraft>(initial);
  const [pageId, setPageId] = useState(home?.id ?? "");
  const [selected, setSelected] = useState<EditorSelection | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorContext, setInspectorContext] = useState<InspectorContext>({ kind: "none" });
  const [inspectorBack, setInspectorBack] = useState<InspectorContext>({ kind: "none" });
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("content");
  const [breakpoint, setBreakpoint] = useState<EditorState["breakpoint"]>("desktop");
  const [history, setHistory] = useState<EditorDraft[]>(() => [snapshot(initial)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const saveFlashTimer = useRef<number | null>(null);
  const [pendingPageId, setPendingPageId] = useState<string | null>(null);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);

  const dirty = JSON.stringify(draft) !== saved;

  const pushHistory = useCallback((next: EditorDraft) => {
    const clipped = historyRef.current.items.slice(0, historyRef.current.index + 1);
    clipped.push(snapshot(next));
    const limited = clipped.slice(-HISTORY_LIMIT);
    historyRef.current = { items: limited, index: limited.length - 1 };
    setHistory(limited);
    setHistoryIndex(limited.length - 1);
  }, []);

  const applyDraft = useCallback(
    (next: EditorDraft, record = true) => {
      setDraft(next);
      if (record) pushHistory(next);
    },
    [pushHistory],
  );

  const select = useCallback((selection: EditorSelection) => {
    setSelected(selection);
    setInspectorOpen(true);
    setPreview(false);
    setInspectorContext((current) => {
      if (current.kind === "site") setInspectorBack(current);
      return { kind: "node", nodeId: selection.id };
    });
    setInspectorTab((current) => {
      const content = readEditorContent(draft, selection);
      const kind = resolveNodeKind(selection, { rich: content.format === "rich" });
      return resolveInspectorTab(kind, current, role);
    });
  }, [draft, role]);

  const deselect = useCallback(() => {
    setSelected(null);
    setInspectorContext({ kind: "none" });
    setInspectorTab("content");
  }, []);

  const openSiteDesign = useCallback(() => {
    setInspectorBack(inspectorContext);
    setInspectorContext({ kind: "site" });
    setInspectorTab("appearance");
    setInspectorOpen(true);
    setPreview(false);
  }, [inspectorContext]);

  const closeSiteDesign = useCallback(() => {
    setInspectorContext(inspectorBack.kind === "site" ? { kind: "none" } : inspectorBack);
    if (inspectorBack.kind !== "node") setInspectorTab("content");
  }, [inspectorBack]);

  const goBack = useCallback(() => {
    if (inspectorContext.kind === "site") {
      closeSiteDesign();
      return;
    }
    deselect();
  }, [closeSiteDesign, deselect, inspectorContext.kind]);

  const setPath = useCallback(
    (path: EditPath, value: unknown, record = true) => {
      const next = cloneDraft(draft);
      if (path.kind === "section-content") {
        const section = findSection(next, path.sectionId);
        if (section) section.content = { ...section.content, [path.key]: value };
      } else if (path.kind === "offering") {
        const offering = next.offerings[path.offeringId];
        if (offering) next.offerings[path.offeringId] = { ...offering, [path.key]: value } as OfferingRow;
      } else if (path.kind === "settings") {
        next.settings = { ...next.settings, [path.key]: value };
      } else if (path.kind === "nav-label") {
        next.pages = next.pages.map((page) => (page.id === path.pageId ? { ...page, nav_label: String(value) } : page));
      } else if (path.kind === "page-title") {
        next.pages = next.pages.map((page) => (page.id === path.pageId ? { ...page, title: String(value) } : page));
      } else if (path.kind === "faq") {
        const section = findSection(next, path.sectionId);
        if (section && Array.isArray(section.content.items)) {
          const items = [...(section.content.items as Array<Record<string, string>>)];
          items[path.index] = { ...items[path.index], [path.field]: String(value) };
          section.content = { ...section.content, items };
        }
      } else if (path.kind === "list-item") {
        const section = findSection(next, path.sectionId);
        if (section && Array.isArray(section.content.items)) {
          const items = [...(section.content.items as string[])];
          items[path.index] = String(value);
          section.content = { ...section.content, items };
        }
      } else if (path.kind === "testimonial") {
        const section = findSection(next, path.sectionId);
        if (section && Array.isArray(section.content.items)) {
          const items = [...(section.content.items as Array<Record<string, string>>)];
          items[path.index] = { ...items[path.index], [path.field]: String(value) };
          section.content = { ...section.content, items };
        }
      }
      applyDraft(next, record);
    },
    [applyDraft, draft],
  );

  const patchSection = useCallback(
    (sectionId: string, updater: (section: SectionRow) => SectionRow, record = true) => {
      applyDraft(updateSection(draft, sectionId, updater), record);
    },
    [applyDraft, draft],
  );

  const patchTheme = useCallback(
    (patch: Partial<ThemeTokens>, record = true) => {
      applyDraft({ ...cloneDraft(draft), theme: { ...draft.theme, ...patch } }, record);
    },
    [applyDraft, draft],
  );

  const patchMedia = useCallback(
    (id: string, patch: Partial<MediaRow>, record = true) => {
      const current = draft.media[id];
      if (!current) return;
      applyDraft({ ...cloneDraft(draft), media: { ...draft.media, [id]: { ...current, ...patch } } }, record);
    },
    [applyDraft, draft],
  );

  const addMedia = useCallback((item: MediaRow) => {
    applyDraft({ ...cloneDraft(draft), media: { [item.id]: item, ...draft.media } }, true);
  }, [applyDraft, draft]);

  const patchPage = useCallback(
    (id: string, patch: PagePatch, record = true) => {
      applyDraft(
        {
          ...cloneDraft(draft),
          pages: draft.pages.map((page) => (page.id === id ? { ...page, ...patch } : page)),
        },
        record,
      );
    },
    [applyDraft, draft],
  );

  const patchFieldStyle = useCallback(
    (sectionId: string, field: string, patch: Partial<TextAppearance>, record = true) => {
      applyDraft(
        updateSection(draft, sectionId, (section) => mergeFieldStyle(section, field, patch)),
        record,
      );
    },
    [applyDraft, draft],
  );

  const switchPage = useCallback((nextPageId: string) => {
    setPageId(nextPageId);
    setSelected(null);
    setInspectorContext({ kind: "none" });
    setInspectorTab("content");
    setInspectorOpen(true);
  }, []);

  const switchPageBySlug = useCallback(
    (slug: string) => {
      const page = draft.pages.find((item) => item.slug === slug);
      if (!page) return false;
      if (page.id !== pageId) switchPage(page.id);
      return true;
    },
    [draft.pages, pageId, switchPage],
  );

  const requestSwitchPage = useCallback(
    (nextPageId: string) => {
      if (nextPageId === pageId) return;
      if (JSON.stringify(draft) !== saved) {
        setPendingPageId(nextPageId);
        return;
      }
      switchPage(nextPageId);
    },
    [draft, pageId, saved, switchPage],
  );

  const requestSwitchPageBySlug = useCallback(
    (slug: string) => {
      const page = draft.pages.find((item) => item.slug === slug);
      if (!page) return false;
      requestSwitchPage(page.id);
      return true;
    },
    [draft.pages, requestSwitchPage],
  );

  const cancelPendingPage = useCallback(() => setPendingPageId(null), []);
  const cancelPendingNavigation = useCallback(() => {
    setPendingPageId(null);
    setPendingNavigationHref(null);
  }, []);

  const addSection = useCallback(
    (type: AddableSectionType) => {
      const current = pageSections(draft, pageId);
      const after = selected?.sectionId;
      const index = after ? current.findIndex((section) => section.id === after) : current.length - 1;
      const insertAt = Math.max(index, -1) + 1;
      const created = createSection(pageId, type, insertAt + 1);
      const nextSections = [...current];
      nextSections.splice(insertAt, 0, created);
      const next = cloneDraft(draft);
      next.sectionsByPage[pageId] = nextSections.map((section, i) => ({ ...section, sort_order: i + 1 }));
      applyDraft(next, true);
      select({ id: `section.${created.id}`, type: "section", sectionId: created.id });
    },
    [applyDraft, draft, pageId, select, selected?.sectionId],
  );

  const addElement = useCallback(
    (
      type: AddableElementType,
      target?: { sectionId?: string; parentId?: string; index?: number; placement?: "before" | "after" | "left" | "right" | "inside"; targetNodeId?: string },
    ) => {
      const current = pageSections(draft, pageId);
      const sectionId = target?.sectionId ?? selected?.sectionId ?? current[0]?.id;
      const section = sectionId ? current.find((item) => item.id === sectionId) : undefined;
      if (!section) return;
      const tree = section.style?.layoutTree;
      const fallbackParentId = target?.parentId ?? tree?.root.id ?? `layout.${section.id}.content`;
      const inserted = insertLayoutElement(section, type, {
        parentId: fallbackParentId,
        index: target?.index ?? Number.MAX_SAFE_INTEGER,
        placement: target?.placement ?? "inside",
        targetNodeId: target?.targetNodeId,
      });
      applyDraft(updateSection(draft, section.id, () => normalizeSectionLayout(inserted.section)), true);
      const selectionType = inserted.node.elementType === "image" ? "image" : "text";
      const page = draft.pages.find((item) => item.id === pageId);
      select({
        id: inserted.node.elementType === "image" ? `${section.id}.image` : `${page?.slug ?? "page"}.${section.section_key}.${inserted.node.field}`,
        type: selectionType,
        sectionId: section.id,
        field: inserted.node.field,
      });
    },
    [applyDraft, draft, pageId, select, selected?.sectionId],
  );

  const duplicateSection = useCallback(
    (sectionId: string) => {
      const current = pageSections(draft, pageId);
      const index = current.findIndex((section) => section.id === sectionId);
      if (index < 0) return;
      const created = cloneSectionRow(current[index], index + 2);
      const nextSections = [...current];
      nextSections.splice(index + 1, 0, created);
      const next = cloneDraft(draft);
      next.sectionsByPage[pageId] = nextSections.map((section, i) => ({ ...section, sort_order: i + 1 }));
      applyDraft(next, true);
      select({ id: `section.${created.id}`, type: "section", sectionId: created.id });
    },
    [applyDraft, draft, pageId, select],
  );

  const moveSection = useCallback(
    (sectionId: string, direction: -1 | 1) => {
      const next = cloneDraft(draft);
      next.sectionsByPage[pageId] = reorderSections(pageSections(draft, pageId), sectionId, direction);
      applyDraft(next, true);
    },
    [applyDraft, draft, pageId],
  );

  const moveSectionToIndex = useCallback(
    (sectionId: string, targetIndex: number) => {
      const current = pageSections(draft, pageId);
      const from = current.findIndex((section) => section.id === sectionId);
      if (from < 0) return;
      const copy = [...current];
      const [moved] = copy.splice(from, 1);
      copy.splice(Math.min(Math.max(targetIndex, 0), copy.length), 0, moved);
      const next = cloneDraft(draft);
      next.sectionsByPage[pageId] = copy.map((section, index) => ({ ...section, sort_order: index + 1 }));
      applyDraft(next, true);
      setDraggedNodeId(null);
      setHoveredNodeId(null);
    },
    [applyDraft, draft, pageId],
  );

  const moveNode = useCallback(
    (
      sectionId: string,
      nodeId: string,
      targetParentId: string,
      targetIndex: number,
      placement: "before" | "after" | "left" | "right" | "inside" = "inside",
      targetNodeId?: string,
    ) => {
      applyDraft(
        updateSection(draft, sectionId, (section) =>
          normalizeSectionLayout(moveLayoutNode(section, nodeId, { parentId: targetParentId, index: targetIndex, placement, targetNodeId })),
        ),
        true,
      );
      setDraggedNodeId(null);
      setHoveredNodeId(null);
    },
    [applyDraft, draft],
  );

  const resizeColumns = useCallback(
    (sectionId: string, leftPercent: number, record = false) => {
      applyDraft(
        updateSection(draft, sectionId, (section) => normalizeSectionLayout(resizeLayoutColumns(section, leftPercent))),
        record,
      );
    },
    [applyDraft, draft],
  );

  const removeSection = useCallback(
    (sectionId: string) => {
      const next = cloneDraft(draft);
      next.sectionsByPage[pageId] = pageSections(draft, pageId).filter((section) => section.id !== sectionId);
      if (!sectionId.startsWith("tmp") && findSection(draft, sectionId)) {
        next.deletedSectionIds = [...next.deletedSectionIds, sectionId];
      }
      applyDraft(next, true);
      setSelected(null);
      setInspectorContext({ kind: "none" });
      setInspectorTab("content");
    },
    [applyDraft, draft, pageId],
  );

  const clearSelection = useCallback(() => {
    setSelected(null);
    setInspectorContext({ kind: "none" });
    setInspectorTab("content");
  }, []);

  const removeSelected = useCallback(() => {
    const current = selected;
    if (!current) return;
    if (current.type === "header" || current.type === "nav" || current.type === "page" || current.type === "theme") return;
    if (current.id === "header.wordmark" || current.id === "footer.text") return;

    if (current.type === "section" && current.sectionId) {
      removeSection(current.sectionId);
      return;
    }

    if (current.sectionId && current.field && /^[qa]\.\d+$/.test(current.field)) {
      const index = Number(current.field.slice(2));
      applyDraft(
        updateSection(draft, current.sectionId, (section) => {
          const items = Array.isArray(section.content.items) ? [...(section.content.items as unknown[])] : [];
          if (index < 0 || index >= items.length) return section;
          items.splice(index, 1);
          return { ...section, content: { ...section.content, items } };
        }),
        true,
      );
      clearSelection();
      return;
    }

    if (current.sectionId && current.field && /^(item|quote|name)\.\d+$/.test(current.field)) {
      const isItem = current.field.startsWith("item.");
      const index = Number(current.field.slice(isItem ? 5 : current.field.startsWith("quote.") ? 6 : 5));
      applyDraft(
        updateSection(draft, current.sectionId, (section) => {
          const items = Array.isArray(section.content.items) ? [...(section.content.items as unknown[])] : [];
          if (index < 0 || index >= items.length) return section;
          items.splice(index, 1);
          return { ...section, content: { ...section.content, items } };
        }),
        true,
      );
      clearSelection();
      return;
    }

    if (!current.sectionId) return;
    const section = findSection(draft, current.sectionId);
    if (!section) return;
    const nodeId = resolveLayoutNodeId(section, current);
    if (!nodeId) return;
    applyDraft(updateSection(draft, section.id, (row) => removeLayoutNode(row, nodeId)), true);
    clearSelection();
  }, [applyDraft, clearSelection, draft, removeSection, selected]);

  const undo = useCallback(() => {
    if (historyRef.current.index <= 0) return;
    const index = historyRef.current.index - 1;
    historyRef.current.index = index;
    setHistoryIndex(index);
    setDraft(cloneDraft(historyRef.current.items[index]));
  }, []);

  const redo = useCallback(() => {
    if (historyRef.current.index >= historyRef.current.items.length - 1) return;
    const index = historyRef.current.index + 1;
    historyRef.current.index = index;
    setHistoryIndex(index);
    setDraft(cloneDraft(historyRef.current.items[index]));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    const payload: EditorSavePayload = {
      pages: draft.pages.map((page) => ({
        id: page.id,
        title: page.title,
        nav_label: page.nav_label,
        show_in_nav: page.show_in_nav,
        nav_order: page.nav_order,
        slug: page.slug,
        is_published: page.is_published,
        seo_title: page.seo_title,
        seo_description: page.seo_description,
      })),
      sections: Object.values(draft.sectionsByPage)
        .flat()
        .map((section) => ({
          id: section.id,
          page_id: section.page_id,
          section_key: section.section_key,
          section_type: section.section_type,
          sort_order: section.sort_order,
          enabled: section.enabled,
          content: section.content,
          style: section.style ?? {},
        })),
      deletedSectionIds: draft.deletedSectionIds,
      offerings: Object.values(draft.offerings).map((offering) => ({
        id: offering.id,
        title: offering.title,
        short_title: offering.short_title,
        location_name: offering.location_name,
        address: offering.address,
        schedule_summary: offering.schedule_summary,
      })),
      media: Object.values(draft.media).map((item) => ({
        id: item.id,
        alt_text: item.alt_text,
        focal_x: item.focal_x,
        focal_y: item.focal_y,
      })),
      settings: {
        site_name: draft.settings.site_name,
        contact_email: draft.settings.contact_email,
        contact_phone: draft.settings.contact_phone,
        footer_text: draft.settings.footer_text,
        social: draft.settings.social,
      },
      theme: draft.theme,
      customCss: role === "owner" ? draft.customCss : undefined,
    };
    const result = await saveEditorDraftAction(payload);
    setSaving(false);
    if (result && "error" in result && result.error) {
      setSaveError(result.error);
      return false;
    }
    const cleaned = { ...draft, deletedSectionIds: [] };
    setDraft(cleaned);
    setSaved(JSON.stringify(cleaned));
    setSaveFlash(true);
    if (saveFlashTimer.current) window.clearTimeout(saveFlashTimer.current);
    saveFlashTimer.current = window.setTimeout(() => setSaveFlash(false), 2500);
    return true;
  }, [draft, role]);

  const confirmPendingPage = useCallback(
    async (mode: "save" | "discard") => {
      const nextId = pendingPageId;
      if (!nextId) return;
      if (mode === "save") {
        const ok = await save();
        if (!ok) return;
      }
      setPendingPageId(null);
      switchPage(nextId);
    },
    [pendingPageId, save, switchPage],
  );

  const requestNavigation = useCallback(
    (href: string) => {
      if (JSON.stringify(draft) !== saved) {
        setPendingNavigationHref(href);
        return;
      }
      window.location.assign(href);
    },
    [draft, saved],
  );

  const confirmPendingNavigation = useCallback(
    async (mode: "save" | "discard") => {
      const href = pendingNavigationHref;
      if (!href) return;
      if (mode === "save") {
        const ok = await save();
        if (!ok) return;
      }
      setPendingNavigationHref(null);
      window.location.assign(href);
    },
    [pendingNavigationHref, save],
  );

  const dragState = useMemo<DragRuntimeState>(
    () => ({ draggedNodeId, hoveredNodeId }),
    [draggedNodeId, hoveredNodeId],
  );
  const dragApi = useMemo(
    () => ({
      setDraggedNode: setDraggedNodeId,
      setHoveredNode: setHoveredNodeId,
    }),
    [],
  );

  const state: EditorState = useMemo(
    () => ({
      pageId,
      selected,
      inspectorOpen,
      inspectorContext,
      inspectorTab,
      breakpoint,
      draft,
      dirty,
      history,
      historyIndex,
      preview,
      advanced,
      saving,
      saveError,
      saveFlash,
      pendingPageId,
      pendingNavigationHref,
    }),
    [
      advanced,
      breakpoint,
      dirty,
      draft,
      history,
      historyIndex,
      inspectorContext,
      inspectorOpen,
      inspectorTab,
      pageId,
      pendingPageId,
      pendingNavigationHref,
      preview,
      saveError,
      saveFlash,
      saving,
      selected,
    ],
  );

  const api = useMemo<Omit<EditorApi, "state">>(
    () => ({
      role,
      select,
      deselect,
      closeInspector: () => setInspectorOpen(false),
      goBack,
      setTab: setInspectorTab,
      setBreakpoint,
      setPreview,
      setAdvanced,
      openSiteDesign,
      closeSiteDesign,
      setPath,
      patchSection,
      patchTheme,
      patchMedia,
      addMedia,
      patchPage,
      patchFieldStyle,
      switchPage,
      switchPageBySlug,
      requestSwitchPage,
      requestSwitchPageBySlug,
      confirmPendingPage,
      requestNavigation,
      confirmPendingNavigation,
      cancelPendingNavigation,
      cancelPendingPage,
      addSection,
      addElement,
      moveSection,
      moveSectionToIndex,
      moveNode,
      resizeColumns,
      duplicateSection,
      removeSection,
      removeSelected,
      undo,
      redo,
      save,
    }),
    [
      addSection,
      addElement,
      addMedia,
      cancelPendingPage,
      closeSiteDesign,
      confirmPendingPage,
      confirmPendingNavigation,
      cancelPendingNavigation,
      deselect,
      duplicateSection,
      goBack,
      moveNode,
      moveSection,
      moveSectionToIndex,
      openSiteDesign,
      patchFieldStyle,
      patchMedia,
      patchPage,
      patchSection,
      patchTheme,
      redo,
      removeSection,
      removeSelected,
      requestSwitchPage,
      requestSwitchPageBySlug,
      requestNavigation,
      role,
      save,
      select,
      setPath,
      resizeColumns,
      switchPage,
      switchPageBySlug,
      undo,
    ],
  );

  return (
    <RoleContext.Provider value={role}>
      <StateContext.Provider value={state}>
        <ApiContext.Provider value={api}>
          <DragStateContext.Provider value={dragState}>
            <DragApiContext.Provider value={dragApi}>{children}</DragApiContext.Provider>
          </DragStateContext.Provider>
        </ApiContext.Provider>
      </StateContext.Provider>
    </RoleContext.Provider>
  );
}

export function useOptionalEditor(): EditorApi | null {
  const state = useContext(StateContext);
  const api = useContext(ApiContext);
  if (!state || !api) return null;
  return { ...api, state };
}

export function useEditor(): EditorApi {
  const editor = useOptionalEditor();
  if (!editor) throw new Error("EditorProvider puudub.");
  return editor;
}

export function useDragRuntime(): DragRuntimeState & {
  setDraggedNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
} {
  const state = useContext(DragStateContext);
  const api = useContext(DragApiContext);
  if (!api) {
    return { ...state, setDraggedNode: () => undefined, setHoveredNode: () => undefined };
  }
  return { ...state, ...api };
}
