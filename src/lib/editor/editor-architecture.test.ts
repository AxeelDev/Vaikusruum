import { describe, expect, it } from "vitest";
import { paragraphs } from "@/lib/content/rich-text";
import { bindSelection, readEditorContent } from "@/lib/editor/content-binding";
import { resolveDropIntent, type CachedDropTarget } from "@/lib/editor/drop-intent";
import { moveLayoutNode, normalizeSectionLayout, removeLayoutNode } from "@/lib/editor/layout-tree";
import { resolveInspectorTab, resolveNodeKind, tabsForKind } from "@/lib/editor/node-registry";
import type { EditorDraft, EditorSelection } from "@/lib/editor/types";
import type { SectionRow } from "@/types/content";
import { DEFAULT_THEME } from "@/lib/theme/theme";

function draft(section: SectionRow): EditorDraft {
  return {
    pages: [{ id: "p1", slug: "avaleht", title: "Avaleht", nav_label: "Avaleht", show_in_nav: true, nav_order: 1, is_published: true, seo_title: null, seo_description: null, created_at: "", updated_at: "" }],
    sectionsByPage: { p1: [section] },
    offerings: {},
    eventsByOffering: {},
    media: {},
    settings: {
      id: 1,
      site_name: "VAIKUSRUUM",
      contact_email: null,
      contact_phone: null,
      default_registration_email: null,
      social: {},
      footer_text: "Jalus",
    },
    theme: DEFAULT_THEME,
    customCss: "",
    deletedSectionIds: [],
  };
}

function section(partial: Partial<SectionRow> = {}): SectionRow {
  return {
    id: "s1",
    page_id: "p1",
    section_key: "hero",
    section_type: "hero",
    sort_order: 1,
    enabled: true,
    content: { title: "VAIKUSRUUM", intro: "Tere" },
    style: {},
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

function target(partial: Partial<CachedDropTarget> & Pick<CachedDropTarget, "nodeId" | "rect">): CachedDropTarget {
  return {
    sectionId: "s1",
    parentId: "parent",
    kind: "element",
    index: 0,
    childCount: 2,
    label: "Tekst",
    canBeside: true,
    canInside: false,
    priority: 0,
    ...partial,
  };
}

describe("inspector tabs", () => {
  it("keeps appearance when switching between text nodes", () => {
    expect(resolveInspectorTab("text", "appearance")).toBe("appearance");
  });

  it("falls back to content when layout is invalid for text", () => {
    expect(resolveInspectorTab("text", "layout")).toBe("content");
  });

  it("does not offer a content tab for containers", () => {
    expect(tabsForKind("container")).toEqual(["appearance", "layout"]);
  });

  it("never maps a text selection to site design", () => {
    expect(resolveNodeKind({ id: "avaleht.hero.title", type: "text", sectionId: "s1", field: "title" })).toBe("text");
  });
});

describe("text content adapters", () => {
  it("reads hero title from draft, not as empty", () => {
    const content = readEditorContent(draft(section()), {
      id: "avaleht.hero.title",
      type: "text",
      sectionId: "s1",
      field: "title",
    });
    expect(content.format).toBe("plain");
    expect(content.format === "plain" && content.value).toBe("VAIKUSRUUM");
  });

  it("fills missing hero title from the site name", () => {
    const content = bindSelection(draft(section({ content: { intro: "Tere" } })), {
      id: "avaleht.hero.title",
      type: "text",
      sectionId: "s1",
      field: "title",
    });
    expect(content?.format === "plain" && content.value).toBe("VAIKUSRUUM");
  });

  it("loads rich text documents instead of emptying them", () => {
    const doc = paragraphs("Olemasolev lõik");
    const content = readEditorContent(
      draft(section({ section_type: "rich_text", section_key: "bio", content: { body: doc } })),
      { id: "minust.bio.body", type: "text", sectionId: "s1", field: "body" },
    );
    expect(content.format).toBe("rich");
    expect(content.plainPreview).toContain("Olemasolev lõik");
  });

  it("reads faq and testimonial fields through adapters", () => {
    const faq = readEditorContent(
      draft(section({ content: { items: [{ question: "Mis?", answer: "Jah" }] } })),
      { id: "q0", type: "text", sectionId: "s1", field: "q.0" },
    );
    expect(faq.format === "plain" && faq.value).toBe("Mis?");
  });
});

describe("drop intent", () => {
  const text = target({
    nodeId: "text",
    rect: { left: 100, top: 100, right: 300, bottom: 180, width: 200, height: 80 },
  });

  it("chooses beside-right from the nearest right edge", () => {
    const resolved = resolveDropIntent([text], { x: 292, y: 140 }, "image");
    expect(resolved?.intent).toBe("beside-right");
    expect(resolved?.label).toBe("Kõrvale paremale");
  });

  it("chooses after from the bottom edge", () => {
    const resolved = resolveDropIntent([text], { x: 200, y: 176 }, "image");
    expect(resolved?.intent).toBe("after");
    expect(resolved?.label).toBe("Pärast");
  });

  it("keeps the previous intent until hysteresis is crossed", () => {
    const first = resolveDropIntent([text], { x: 292, y: 140 }, "image");
    const next = resolveDropIntent([text], { x: 280, y: 168 }, "image", first);
    expect(next?.intent).toBe("beside-right");
  });

  it("does not show beside for ineligible containers", () => {
    const column = target({
      nodeId: "col",
      kind: "column",
      canBeside: false,
      canInside: true,
      childCount: 0,
      rect: { left: 100, top: 100, right: 400, bottom: 400, width: 300, height: 300 },
    });
    const resolved = resolveDropIntent([column], { x: 390, y: 250 }, "image");
    expect(resolved?.intent === "beside-right").toBe(false);
  });
});

describe("side-by-side layout transactions", () => {
  function stacked(): SectionRow {
    return section({
      style: {
        layoutTree: {
          version: 1,
          root: {
            id: "root",
            type: "group",
            label: "Sisu",
            ephemeral: true,
            preferredRatio: "50-50",
            children: [
              { id: "text", type: "element", elementType: "text", label: "Tekst", field: "plain" },
              { id: "image", type: "element", elementType: "image", label: "Pilt", field: "image" },
            ],
          },
        },
      },
    });
  }

  it("restores text | image in one drop", () => {
    const next = normalizeSectionLayout(
      moveLayoutNode(stacked(), "image", { parentId: "root", index: 1, placement: "right", targetNodeId: "text" }),
    );
    const root = next.style.layoutTree?.root;
    expect(root?.type).toBe("columns");
    if (root?.type !== "columns") return;
    expect(root.columns[0].children.some((child) => child.id === "text")).toBe(true);
    expect(root.columns[1].children.some((child) => child.id === "image")).toBe(true);
  });

  it("collapses a leftover empty column after a vertical move", () => {
    const columns: SectionRow = section({
      style: {
        layoutTree: {
          version: 1,
          root: {
            id: "cols",
            type: "columns",
            label: "Kaks veergu",
            ratio: "50-50",
            columns: [
              {
                id: "left",
                type: "column",
                label: "Vasak pool",
                children: [
                  { id: "text", type: "element", elementType: "text", label: "Tekst", field: "plain" },
                  { id: "image", type: "element", elementType: "image", label: "Pilt", field: "image" },
                ],
              },
              { id: "right", type: "column", label: "Parem pool", children: [] },
            ],
          },
        },
      },
    });
    const next = normalizeSectionLayout(columns);
    expect(next.style.layoutTree?.root.type).toBe("group");
    expect(next.style.preferredColumnBalance).toBe("50-50");
  });

  it("removes a selected layout element from the tree", () => {
    const next = removeLayoutNode(stacked(), "image");
    const root = next.style.layoutTree?.root;
    expect(root?.type).toBe("group");
    if (root?.type !== "group") return;
    expect(root.children.some((child) => child.id === "image")).toBe(false);
    expect(root.children.some((child) => child.id === "text")).toBe(true);
  });
});

describe("selection routing", () => {
  it("treats missing field as a binding problem, not site design", () => {
    const selection: EditorSelection = { id: "avaleht.hero.title", type: "text", sectionId: "s1" };
    expect(resolveNodeKind(selection)).toBe("text");
    expect(resolveInspectorTab(resolveNodeKind(selection), "appearance")).toBe("appearance");
  });
});
