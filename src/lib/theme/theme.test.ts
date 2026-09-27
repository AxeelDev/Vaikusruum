import { describe, expect, it } from "vitest";
import { applyThemePreset } from "@/lib/theme/presets";
import { DEFAULT_THEME, parseTheme, sanitizeCustomCss } from "@/lib/theme/theme";
import { paragraphWithItalics } from "@/lib/content/rich-text";

describe("parseTheme", () => {
  it("falls back to defaults for empty input", () => {
    expect(parseTheme(null).bgMain).toBe(DEFAULT_THEME.bgMain);
    expect(parseTheme({}).wordmarkTracking).toBe(DEFAULT_THEME.wordmarkTracking);
  });

  it("clamps oversized body text", () => {
    expect(parseTheme({ bodySize: 200 }).bodySize).toBe(24);
    expect(parseTheme({ bodySize: 8 }).bodySize).toBe(14);
  });

  it("rejects invalid colors", () => {
    expect(parseTheme({ bgMain: "red" }).bgMain).toBe(DEFAULT_THEME.bgMain);
    expect(parseTheme({ bgMain: "#fff" }).bgMain).toBe("#FFFFFF");
  });

  it("accepts curated fonts only", () => {
    expect(parseTheme({ displayFont: "comic-sans" }).displayFont).toBe("cormorant");
    expect(parseTheme({ displayFont: "bodoni-moda" }).displayFont).toBe("bodoni-moda");
    expect(parseTheme({ bodyFont: "cormorant" }).bodyFont).toBe("cormorant");
    expect(parseTheme(null).bodyFont).toBe("cormorant");
  });
});

describe("theme presets", () => {
  it("keeps A warm and B plum", () => {
    const a = applyThemePreset(DEFAULT_THEME, "a");
    const b = applyThemePreset(DEFAULT_THEME, "b");
    expect(a.bgMain).toBe("#FBF8F3");
    expect(a.bodyFont).toBe("cormorant");
    expect(b.bgMain).toBe("#2A1520");
    expect(b.accentGold).toBe("#E6C985");
    expect(b.bgMain).not.toBe(a.bgMain);
  });
});

describe("sanitizeCustomCss", () => {
  it("strips style-tag breakouts", () => {
    expect(sanitizeCustomCss("body{}</style><script>alert(1)</script>")).not.toContain("</style");
    expect(sanitizeCustomCss("body{}</style><script>alert(1)</script>")).not.toContain("<script");
  });
});

describe("paragraphWithItalics", () => {
  it("keeps surrounding copy and marks italic spans", () => {
    const node = paragraphWithItalics("kindlas järjestuses harjutusi ehk *krijasid*, valmis");
    const texts = node.content?.map((n) => n.text) ?? [];
    expect(texts.join("")).toBe("kindlas järjestuses harjutusi ehk krijasid, valmis");
    expect(node.content?.some((n) => n.text === "krijasid" && n.marks?.[0]?.type === "italic")).toBe(true);
  });
});
