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
import { cloneDraft, createSection, findSection, pageSections, reorderSections, updateSection } from "@/lib/editor/draft";
import { mergeFieldStyle } from "@/lib/editor/appearance";
import type { AddableSectionType, EditorDraft, EditorSelection, EditorState, InspectorTab } from "@/lib/editor/types";
import type { AdminRole, MediaRow, OfferingRow, SectionRow, TextAppearance } from "@/types/content";
import type { ThemeTokens } from "@/lib/theme/theme";

export type EditPath =
  | { kind: "section-content"; sectionId: string; key: string }
  | { kind: "offering"; offeringId: string; key: keyof OfferingRow }
  | { kind: "settings"; key: "site_name" | "footer_text" | "contact_email" | "contact_phone" }
  | { kind: "nav-label"; pageId: string }
  | { kind: "page-title"; pageId: string }
  | { kind: "faq"; sectionId: string; index: number; field: "question" | "answer" }
  | { kind: "list-item"; sectionId: string; index: number }
  | { kind: "testimonial"; sectionId: string; index: number; field: "quote" | "name" };

type EditorApi = {
  state: EditorState;
  role: AdminRole;
  select: (selection: EditorSelection) => void;
  deselect: () => void;
  closeInspector: () => void;
  setTab: (tab: InspectorTab) => void;
  setBreakpoint: (breakpoint: EditorState["breakpoint"]) => void;
  setPreview: (preview: boolean) => void;
  setAdvanced: (advanced: boolean) => void;
  setThemePanel: (open: boolean) => void;
  startInlineEdit: (id: string) => void;
  stopInlineEdit: () => void;
  setPath: (path: EditPath, value: unknown, record?: boolean) => void;
  patchSection: (sectionId: string, updater: (section: SectionRow) => SectionRow, record?: boolean) => void;
  patchTheme: (patch: Partial<ThemeTokens>, record?: boolean) => void;
  patchMedia: (id: string, patch: Partial<MediaRow>, record?: boolean) => void;
  patchPage: (id: string, patch: Partial<{ title: string; nav_label: string | null; show_in_nav: boolean }>, record?: boolean) => void;
  patchFieldStyle: (sectionId: string, field: string, patch: Partial<TextAppearance>, record?: boolean) => void;
  switchPage: (pageId: string) => void;
  addSection: (type: AddableSectionType) => void;
  moveSection: (sectionId: string, direction: -1 | 1) => void;
  removeSection: (sectionId: string) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;
};

const StateContext = createContext<EditorState | null>(null);
const ApiContext = createContext<Omit<EditorApi, "state"> | null>(null);
const RoleContext = createContext<AdminRole>("editor");

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
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("content");
  const [breakpoint, setBreakpoint] = useState<EditorState["breakpoint"]>("desktop");
  const [history, setHistory] = useState<EditorDraft[]>(() => [snapshot(initial)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [themePanel, setThemePanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    setThemePanel(false);
    setPreview(false);
    setInspectorTab(selection.type === "section" || selection.type === "header" ? "layout" : "content");
  }, []);

  const deselect = useCallback(() => {
    setSelected(null);
    setInlineEditingId(null);
  }, []);

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

  const patchPage = useCallback(
    (id: string, patch: Partial<{ title: string; nav_label: string | null; show_in_nav: boolean }>, record = true) => {
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
    setInlineEditingId(null);
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

  const moveSection = useCallback(
    (sectionId: string, direction: -1 | 1) => {
      const next = cloneDraft(draft);
      next.sectionsByPage[pageId] = reorderSections(pageSections(draft, pageId), sectionId, direction);
      applyDraft(next, true);
    },
    [applyDraft, draft, pageId],
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
    },
    [applyDraft, draft, pageId],
  );

  const undo = useCallback(() => {
    if (historyRef.current.index <= 0) return;
    const index = historyRef.current.index - 1;
    historyRef.current.index = index;
    setHistoryIndex(index);
    setDraft(cloneDraft(historyRef.current.items[index]));
    setInlineEditingId(null);
  }, []);

  const redo = useCallback(() => {
    if (historyRef.current.index >= historyRef.current.items.length - 1) return;
    const index = historyRef.current.index + 1;
    historyRef.current.index = index;
    setHistoryIndex(index);
    setDraft(cloneDraft(historyRef.current.items[index]));
    setInlineEditingId(null);
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
      return;
    }
    const cleaned = { ...draft, deletedSectionIds: [] };
    setDraft(cleaned);
    setSaved(JSON.stringify(cleaned));
  }, [draft, role]);

  const state: EditorState = useMemo(
    () => ({
      pageId,
      selected,
      inspectorOpen,
      inspectorTab,
      breakpoint,
      draft,
      dirty,
      history,
      historyIndex,
      inlineEditingId,
      preview,
      advanced,
      saving,
      saveError,
      themePanel,
    }),
    [
      advanced,
      breakpoint,
      dirty,
      draft,
      history,
      historyIndex,
      inlineEditingId,
      inspectorOpen,
      inspectorTab,
      pageId,
      preview,
      saveError,
      saving,
      selected,
      themePanel,
    ],
  );

  const api = useMemo<Omit<EditorApi, "state">>(
    () => ({
      role,
      select,
      deselect,
      closeInspector: () => setInspectorOpen(false),
      setTab: setInspectorTab,
      setBreakpoint,
      setPreview,
      setAdvanced,
      setThemePanel: (open) => {
        setThemePanel(open);
        if (open) {
          setInspectorOpen(true);
          setInspectorTab("appearance");
        }
      },
      startInlineEdit: (id) => {
        setInlineEditingId(id);
        setInspectorOpen(true);
      },
      stopInlineEdit: () => setInlineEditingId(null),
      setPath,
      patchSection,
      patchTheme,
      patchMedia,
      patchPage,
      patchFieldStyle,
      switchPage,
      addSection,
      moveSection,
      removeSection,
      undo,
      redo,
      save,
    }),
    [
      addSection,
      deselect,
      moveSection,
      patchFieldStyle,
      patchMedia,
      patchPage,
      patchSection,
      patchTheme,
      redo,
      removeSection,
      role,
      save,
      select,
      setPath,
      switchPage,
      undo,
    ],
  );

  return (
    <RoleContext.Provider value={role}>
      <StateContext.Provider value={state}>
        <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
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
