import { describe, expect, it } from "vitest";
import { createSection, duplicateSection, reorderSections } from "@/lib/editor/draft";
import { appearanceToStyle, mergeFieldStyle } from "@/lib/editor/appearance";
import { resolveColumnBalance, resolveHeight, resolveVerticalAlign } from "@/components/layout/primitives";
import { getSectionLayoutTree, ratioToLeftPercent } from "@/lib/editor/layout-tree";
import type { SectionRow } from "@/types/content";

function section(partial: Partial<SectionRow>): SectionRow {
  return {
    id: "s1",
    page_id: "p1",
    section_key: "hero",
    section_type: "hero",
    sort_order: 1,
    enabled: true,
    content: {},
    style: {},
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("section layout primitives", () => {
  it("defaults homepage keys to screen height", () => {
    expect(resolveHeight(section({ section_key: "miina", section_type: "split_media_text" }))).toBe("screen");
    expect(resolveHeight(section({ section_key: "bio", section_type: "rich_text" }))).toBe("auto");
  });

  it("honors explicit height presets", () => {
    expect(resolveHeight(section({ style: { height: "large" } }))).toBe("large");
    expect(resolveVerticalAlign(section({}))).toBe("center");
  });

  it("defaults the hero split to 46 / 54", () => {
    const hero = section({ section_type: "hero", section_key: "hero" });
    expect(resolveColumnBalance(hero)).toBe("46-54");
    const tree = getSectionLayoutTree(hero);
    expect(tree.root.type).toBe("columns");
    if (tree.root.type !== "columns") return;
    expect(ratioToLeftPercent(tree.root.ratio, tree.root.customRatio)).toBe(46);
  });
});

describe("editor draft helpers", () => {
  it("reorders sections without leaving gaps", () => {
    const rows = [
      section({ id: "a", sort_order: 1 }),
      section({ id: "b", sort_order: 2 }),
      section({ id: "c", sort_order: 3 }),
    ];
    const moved = reorderSections(rows, "a", 1);
    expect(moved.map((row) => row.id)).toEqual(["b", "a", "c"]);
    expect(moved.map((row) => row.sort_order)).toEqual([1, 2, 3]);
  });

  it("creates only Vaikusruum section types", () => {
    const created = createSection("p1", "faq", 4);
    expect(created.section_type).toBe("faq");
    expect(created.style.height).toBe("screen");
  });

  it("duplicates a section with a new id", () => {
    const original = createSection("p1", "rich_text", 1);
    const copy = duplicateSection(original, 2);
    expect(copy.id).not.toBe(original.id);
    expect(copy.section_type).toBe("rich_text");
    expect(copy.sort_order).toBe(2);
  });
});

describe("text appearance", () => {
  it("maps visual sliders to element styles without raw CSS keywords", () => {
    const style = appearanceToStyle({ size: 56, letterSpacing: 0.22, align: "center" });
    expect(style.fontSize).toBe("56px");
    expect(style.letterSpacing).toBe("0.22em");
    expect(style.textAlign).toBe("center");
  });

  it("stores field styles on the section", () => {
    const next = mergeFieldStyle(section({}), "title", { letterSpacing: 0.2 });
    expect(next.style.fieldStyles?.title.letterSpacing).toBe(0.2);
  });

  it("canonicalizes colors and drops invalid ones", () => {
    const saved = mergeFieldStyle(section({}), "title", { color: "#fff" });
    expect(saved.style.fieldStyles?.title.color).toBe("#FFFFFF");
    const cleared = mergeFieldStyle(saved, "title", { color: "#1234" });
    expect(cleared.style.fieldStyles?.title.color).toBeUndefined();
  });
});
