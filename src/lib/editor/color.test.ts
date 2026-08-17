import { describe, expect, it } from "vitest";
import {
  canonicalizeHex,
  formatSliderValue,
  hsvToHex,
  hexToHsv,
  isHexDraftValid,
  parseColorToHex,
  rgbToHex,
} from "@/lib/editor/color";
import { hrefToSlug } from "@/lib/editor/pages";

describe("canonical colors", () => {
  it("normalizes short, long, mixed-case and rgb values to #RRGGBB", () => {
    expect(canonicalizeHex("#fff")).toBe("#FFFFFF");
    expect(canonicalizeHex("#4d4d4d")).toBe("#4D4D4D");
    expect(parseColorToHex("rgb(77, 77, 77)")).toBe("#4D4D4D");
    expect(parseColorToHex("rgba(61, 58, 53, 0.9)")).toBe("#3D3A35");
    expect(parseColorToHex("")).toBeNull();
    expect(parseColorToHex("inherit")).toBeNull();
  });

  it("rejects incomplete hex until it is valid", () => {
    expect(isHexDraftValid("#1234")).toBe(false);
    expect(isHexDraftValid("#123")).toBe(true);
    expect(isHexDraftValid("#123456")).toBe(true);
    expect(canonicalizeHex("#1234")).toBeNull();
  });

  it("round-trips hsv conversion for a mid tone", () => {
    expect(rgbToHex(168, 186, 195)).toBe("#A8BAC3");
    const hsv = hexToHsv("#A8BAC3");
    expect(hsvToHex(hsv)).toBe("#A8BAC3");
  });
});

describe("slider labels", () => {
  it("shows rem for client size and px for exact mode", () => {
    expect(formatSliderValue(52, "px", false)).toBe("3.25 rem");
    expect(formatSliderValue(52, "px", true)).toBe("52px");
    expect(formatSliderValue(0.4, "em", true)).toBe("0.4 em");
    expect(formatSliderValue(500)).toBe("500");
  });
});

describe("editor page hrefs", () => {
  it("maps internal links to slugs without leaving the editor", () => {
    expect(hrefToSlug("/")).toBe("avaleht");
    expect(hrefToSlug("/minust")).toBe("minust");
    expect(hrefToSlug("/kontakt?teema=eratund")).toBe("kontakt");
    expect(hrefToSlug("mailto:hi@example.com")).toBeNull();
  });
});
