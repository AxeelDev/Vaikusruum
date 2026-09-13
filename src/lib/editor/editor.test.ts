import { describe, expect, it } from "vitest";
import { createSection, duplicateSection, reorderSections } from "@/lib/editor/draft";
import { resolveColumnBalance, resolveHeight, resolveVerticalAlign, splitGridColumns } from "@/components/layout/primitives";
import { appearanceToStyle, mergeFieldStyle } from "@/lib/editor/appearance";
import { clampTextStyle, readTextStyle, writeTextStylePatch } from "@/lib/editor/text-style";
import { placeFloating } from "@/lib/editor/popover-position";
import { insertLayoutElement } from "@/lib/editor/layout-tree";
import { addableNodesForRole } from "@/lib/editor/node-registry";
import { getSectionLayoutTree, ratioToLeftPercent } from "@/lib/editor/layout-tree";
import { patchImageAppearance, readImageAppearance, resolveImageMediaId } from "@/lib/editor/image-style";
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

  it("keeps centered homepage copy as a single group, not a phantom split", () => {
    const yoga = section({
      section_key: "yoga",
      section_type: "rich_text",
      content: { body: { type: "doc", content: [] } },
      style: { layout: "centered" },
    });
    expect(getSectionLayoutTree(yoga).root.type).toBe("group");
  });

  it("exposes faq questions in the layout tree", () => {
    const faq = section({
      section_key: "faq",
      section_type: "faq",
      content: { items: [{ question: "Mis?", answer: "Jah" }] },
    });
    const ids = JSON.stringify(getSectionLayoutTree(faq));
    expect(ids).toContain("\"field\":\"q.0\"");
    expect(ids).toContain("\"field\":\"a.0\"");
  });

  it("does not invent an image column for text-only contact", () => {
    const contact = section({
      section_key: "contact",
      section_type: "contact",
      content: { heading: "VÕTA ÜHENDUST" },
      style: { layout: "text-only" },
    });
    expect(getSectionLayoutTree(contact).root.type).toBe("group");
  });

  it("emits real grid tracks instead of custom-property fr values", () => {
    expect(splitGridColumns(46)).toBe("minmax(0, 46fr) minmax(0, 54fr)");
    expect(splitGridColumns(50)).toBe("minmax(0, 50fr) minmax(0, 50fr)");
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
    expect((style as Record<string, string>)["--node-font-size"]).toBe("56px");
  });

  it("treats size and fontSize as the same override", () => {
    expect(readTextStyle({ size: 72 }).fontSize).toBe(72);
    expect(writeTextStylePatch({ fontSize: 110 }).size).toBe(110);
    expect(writeTextStylePatch({ fontSize: 110 }).fontSize).toBe(110);
  });

  it("allows display text up to 320px", () => {
    expect(clampTextStyle({ fontSize: 320 }, "display").fontSize).toBe(320);
    expect(clampTextStyle({ fontSize: 400 }, "display").fontSize).toBe(320);
    expect(clampTextStyle({ fontSize: 120 }, "body").fontSize).toBe(96);
  });

  it("lets normal text reach 1600px and display text 2000px", () => {
    expect(clampTextStyle({ maxWidth: 1600 }, "body").maxWidth).toBe(1600);
    expect(clampTextStyle({ maxWidth: 1800 }, "body").maxWidth).toBe(1600);
    expect(clampTextStyle({ maxWidth: 2000 }, "display").maxWidth).toBe(2000);
  });

  it("treats 0 as Full parent width, not a pixel cap", () => {
    expect(clampTextStyle({ maxWidth: 0 }, "body").maxWidth).toBe(0);
    const css = appearanceToStyle({ maxWidth: 0 });
    expect(css.width).toBe("100%");
    expect(css.maxWidth).toBe("none");
    expect((css as Record<string, string>)["--node-max-width"]).toBe("100%");
  });

  it("caps configured width without shrinking the text box to that width", () => {
    const css = appearanceToStyle({ maxWidth: 1000 });
    expect(css.width).toBeUndefined();
    expect(css.maxWidth).toBe("min(1000px, 100%)");
    expect((css as Record<string, string>)["--node-max-width"]).toBe("1000px");
  });

  it("ignores leftover percent-like text widths that collapse to one letter", () => {
    expect(readTextStyle({ width: 24 }).maxWidth).toBeUndefined();
    expect(readTextStyle({ maxWidth: 80 }).maxWidth).toBeUndefined();
    expect(readTextStyle({ maxWidth: 420 }).maxWidth).toBe(420);
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

describe("component creation", () => {
  it("exposes every add-menu type from the registry", () => {
    const types = addableNodesForRole("owner").map((item) => item.type);
    expect(types).toEqual(expect.arrayContaining([
      "text", "paragraph", "list", "image", "buttons", "video", "links", "audio", "icons", "gallery",
      "table", "timer", "divider", "slideshow", "form", "widget", "embed", "container", "control",
    ]));
  });

  it("inserts new text into the draft layout tree", () => {
    const hero = section({ content: { title: "VAIKUSRUUM", intro: "Tere" } });
    const inserted = insertLayoutElement(hero, "text", { parentId: `layout.${hero.id}.hero.textGroup`, index: 99, placement: "inside" });
    expect(inserted.node.type === "element" && inserted.node.elementType).toBe("text");
    const field = inserted.node.type === "element" ? inserted.node.field : undefined;
    expect(field).toMatch(/^custom\.text\./);
    expect(inserted.section.content[field!]).toBe("Uus tekst");
  });

  it("inserts a paragraph as a rich-text document", () => {
    const hero = section({ content: { title: "VAIKUSRUUM", intro: "Tere" } });
    const inserted = insertLayoutElement(hero, "paragraph", { parentId: `layout.${hero.id}.hero.textGroup`, index: 99, placement: "inside" });
    expect(inserted.node.type === "element" && inserted.node.elementType).toBe("paragraph");
    const field = inserted.node.type === "element" ? inserted.node.field : undefined;
    expect(field).toMatch(/^custom\.paragraph\./);
    const value = inserted.section.content[field!];
    expect(value).toMatchObject({ type: "doc" });
  });
});

describe("image size", () => {
  it("uses one size percent per image and keeps old width as a fallback", () => {
    const withWidth = section({
      section_type: "split_media_text",
      style: { image: { width: 40, crop: "square" }, mediaId: "m1" },
    });
    expect(readImageAppearance(withWidth).size).toBe(40);
    expect(readImageAppearance(withWidth).crop).toBe("square");
    expect(resolveImageMediaId(withWidth)).toBe("m1");

    const resized = patchImageAppearance(withWidth, "image", { size: 90 });
    expect(resized.style.image?.size).toBe(90);
    expect(resized.style.image?.width).toBeUndefined();
    expect(resized.style.image?.radius).toBeUndefined();
  });

  it("stores size on the custom image field, not on the section photo", () => {
    const row = section({
      content: { "custom.image.a": { mediaId: "m2" } },
      style: { image: { size: 30 } },
    });
    const next = patchImageAppearance(row, "custom.image.a", { size: 75, crop: "portrait" });
    const custom = next.content["custom.image.a"] as { size?: number; crop?: string };
    expect(custom.size).toBe(75);
    expect(custom.crop).toBe("portrait");
    expect(next.style.image?.size).toBe(30);
  });
});

describe("popover placement", () => {
  it("aligns bottom-end and keeps 8px inside the right edge", () => {
    const next = placeFloating({
      trigger: { top: 40, right: 1272, bottom: 68, left: 1244, width: 28, height: 28 },
      floatingWidth: 240,
      floatingHeight: 220,
      viewportWidth: 1280,
      viewportHeight: 800,
      placement: "bottom-end",
    });
    expect(next.left + 240).toBeLessThanOrEqual(1272);
    expect(next.left).toBeGreaterThanOrEqual(8);
    expect(next.top).toBe(74);
  });

  it("flips above when the menu would overflow the bottom", () => {
    const next = placeFloating({
      trigger: { top: 760, right: 200, bottom: 788, left: 172, width: 28, height: 28 },
      floatingWidth: 220,
      floatingHeight: 200,
      viewportWidth: 1280,
      viewportHeight: 800,
      placement: "bottom-end",
    });
    expect(next.top + 200).toBeLessThanOrEqual(760);
    expect(next.top).toBeGreaterThanOrEqual(8);
  });
});
