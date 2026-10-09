import { describe, expect, it } from "vitest";
import { LARGE_TEXT_SIZE, isLongTextField, longTextSize } from "@/lib/editor/text-style";

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
