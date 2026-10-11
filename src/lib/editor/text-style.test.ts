import { describe, expect, it } from "vitest";
import { LARGE_TEXT_SIZE, PAGE_TITLE_STYLE_KEY, inheritedTextStyle, isLongTextField, longTextSize, textStyleKey, textStyleScale } from "@/lib/editor/text-style";
import { DEFAULT_THEME } from "@/lib/theme/theme";

describe("long text size", () => {
  it("treats rich text and paragraph fields as long text", () => {
    expect(isLongTextField("body", "rich")).toBe(true);
    expect(isLongTextField("plain", "plain", "short")).toBe(true);
    expect(isLongTextField("custom.paragraph.2", "plain", "x")).toBe(true);
    expect(isLongTextField("intro", "plain", "one\ntwo")).toBe(true);
  });

  it("leaves headings, short labels and structured fields alone", () => {
    expect(isLongTextField("heading", "plain", "Pealkiri", "heading")).toBe(false);
    expect(isLongTextField("label", "plain", "Silt")).toBe(false);
    expect(isLongTextField("body", "structured")).toBe(false);
    expect(isLongTextField(undefined, "rich")).toBe(false);
  });

  it("reads the size choice from the saved override", () => {
    expect(longTextSize(undefined)).toBe("normal");
    expect(longTextSize(LARGE_TEXT_SIZE)).toBe("large");
    expect(longTextSize(18)).toBe("custom");
  });
});

describe("style keys", () => {
  it("uses a shared style key before the field", () => {
    expect(textStyleKey({ field: "lessons", styleKey: "lessons.name" })).toBe("lessons.name");
    expect(textStyleKey({ field: "address", offeringId: "o1" })).toBe("o1.address");
    expect(textStyleKey({ field: "heading" })).toBe("heading");
  });

  it("starts page titles from the site's page-title look", () => {
    const selection = { id: "minust.title", type: "text" as const, field: "title", styleKey: PAGE_TITLE_STYLE_KEY };
    expect(textStyleScale(selection)).toBe("heading");
    expect(inheritedTextStyle(selection, undefined, DEFAULT_THEME).fontSize).toBe(DEFAULT_THEME.pageTitleSize);
  });
});
