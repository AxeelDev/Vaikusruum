import type { CSSProperties } from "react";
import { clamp, parseColorToHex } from "@/lib/editor/color";
import { fontCssById, type ThemeTokens } from "@/lib/theme/theme";
import type { EditorSelection } from "@/lib/editor/types";
import type { SectionRow, TextAlign, TextAppearance, TextRole } from "@/types/content";

export type TextStyleScale = "body" | "heading" | "display";

export type CanonicalTextStyle = {
  color?: string;
  fontId?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  paragraphSpacing?: number;
  textAlign?: TextAlign;
  textTransform?: "none" | "uppercase" | "lowercase";
  maxWidth?: number | null;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  role?: TextRole;
  desktop?: { fontSize?: number; maxWidth?: number | null };
  tablet?: { fontSize?: number; maxWidth?: number | null };
  mobile?: { fontSize?: number; maxWidth?: number | null };
};

/** Sentinel: 100% of the parent column, never 100vw. */
export const WIDTH_FULL = 0;

export const TEXT_STYLE_BOUNDS = {
  fontSize: { min: 8, max: 240 },
  lineHeight: { min: 0.8, max: 3 },
  letterSpacing: { min: -0.1, max: 1 },
  fontWeight: { min: 100, max: 900 },
  maxWidth: { min: 160, max: 1600 },
  paragraphSpacing: { min: 0, max: 80 },
} as const;

export const TEXT_SIZE_RANGES: Record<TextStyleScale, { min: number; max: number }> = {
  body: { min: 8, max: 64 },
  heading: { min: 12, max: 160 },
  display: { min: 16, max: 240 },
};

export const TEXT_WIDTH_RANGES: Record<TextStyleScale, { min: number; max: number }> = {
  body: { min: 160, max: 1200 },
  heading: { min: 160, max: 1200 },
  display: { min: 160, max: 1600 },
};

export const WIDTH_PRESETS = [
  { id: "auto", label: "Auto", value: null },
  { id: "narrow", label: "Narrow", value: 420 },
  { id: "medium", label: "Medium", value: 620 },
  { id: "wide", label: "Wide", value: 860 },
  { id: "full", label: "Full", value: WIDTH_FULL },
] as const;

export function isFullWidth(maxWidth?: number | null): boolean {
  return maxWidth === WIDTH_FULL;
}

export function textStyleKey(selection: Pick<EditorSelection, "field" | "offeringId">): string | null {
  if (!selection.field) return null;
  if (selection.offeringId) return `${selection.offeringId}.${selection.field}`;
  return selection.field;
}

export function readTextStyle(raw?: TextAppearance | null): CanonicalTextStyle {
  if (!raw) return {};
  const fontSize = firstNumber(raw.fontSize, raw.size);
  const fontWeight = firstNumber(raw.fontWeight, raw.weight);
  const textAlign = raw.textAlign ?? raw.align;
  const maxWidth = raw.maxWidth === null ? null : firstNumber(raw.maxWidth, raw.width);
  return {
    role: raw.role,
    color: raw.color,
    fontId: raw.fontId,
    fontFamily: raw.fontFamily,
    fontSize,
    fontWeight,
    lineHeight: raw.lineHeight,
    letterSpacing: raw.letterSpacing,
    paragraphSpacing: raw.paragraphSpacing,
    textAlign,
    textTransform: raw.textTransform,
    maxWidth,
    fontStyle: raw.fontStyle,
    textDecoration: raw.textDecoration,
    desktop: raw.desktop,
    tablet: raw.tablet,
    mobile: raw.mobile,
  };
}

export function writeTextStylePatch(patch: Partial<CanonicalTextStyle>): Partial<TextAppearance> {
  const next: Partial<TextAppearance> = {};
  if (patch.role !== undefined) next.role = patch.role;
  if (patch.color !== undefined) next.color = patch.color;
  if (patch.fontId !== undefined) next.fontId = patch.fontId;
  if (patch.fontFamily !== undefined) next.fontFamily = patch.fontFamily;
  if (patch.fontSize !== undefined) {
    next.fontSize = patch.fontSize;
    next.size = patch.fontSize;
  }
  if (patch.fontWeight !== undefined) {
    next.fontWeight = patch.fontWeight;
    next.weight = patch.fontWeight;
  }
  if (patch.lineHeight !== undefined) next.lineHeight = patch.lineHeight;
  if (patch.letterSpacing !== undefined) next.letterSpacing = patch.letterSpacing;
  if (patch.paragraphSpacing !== undefined) next.paragraphSpacing = patch.paragraphSpacing;
  if (patch.textAlign !== undefined) {
    next.textAlign = patch.textAlign;
    next.align = patch.textAlign;
  }
  if (patch.textTransform !== undefined) next.textTransform = patch.textTransform;
  if (patch.maxWidth !== undefined) {
    next.maxWidth = patch.maxWidth;
    next.width = patch.maxWidth === null ? undefined : patch.maxWidth;
  }
  if (patch.desktop !== undefined) next.desktop = patch.desktop;
  if (patch.tablet !== undefined) next.tablet = patch.tablet;
  if (patch.mobile !== undefined) next.mobile = patch.mobile;
  if (patch.fontStyle !== undefined) next.fontStyle = patch.fontStyle;
  if (patch.textDecoration !== undefined) next.textDecoration = patch.textDecoration;
  return next;
}

export function clampTextStyle(style: CanonicalTextStyle, scale: TextStyleScale = "body"): CanonicalTextStyle {
  const sizeRange = TEXT_SIZE_RANGES[scale];
  const widthRange = TEXT_WIDTH_RANGES[scale];
  return {
    ...style,
    fontSize: style.fontSize == null ? undefined : clamp(style.fontSize, sizeRange.min, sizeRange.max),
    fontWeight: style.fontWeight == null ? undefined : clamp(Math.round(style.fontWeight / 100) * 100, 100, 900),
    lineHeight: style.lineHeight == null ? undefined : clamp(style.lineHeight, TEXT_STYLE_BOUNDS.lineHeight.min, TEXT_STYLE_BOUNDS.lineHeight.max),
    letterSpacing:
      style.letterSpacing == null
        ? undefined
        : clamp(style.letterSpacing, TEXT_STYLE_BOUNDS.letterSpacing.min, TEXT_STYLE_BOUNDS.letterSpacing.max),
    paragraphSpacing:
      style.paragraphSpacing == null
        ? undefined
        : clamp(style.paragraphSpacing, TEXT_STYLE_BOUNDS.paragraphSpacing.min, TEXT_STYLE_BOUNDS.paragraphSpacing.max),
    maxWidth:
      style.maxWidth == null || style.maxWidth === WIDTH_FULL
        ? style.maxWidth
        : clamp(style.maxWidth, widthRange.min, widthRange.max),
  };
}

export function textStyleScale(selection: EditorSelection, section?: SectionRow): TextStyleScale {
  if (section?.section_type === "hero" && (selection.field === "title" || selection.id.includes(".title"))) return "display";
  if (selection.field === "heading" || selection.field === "title" || selection.field === "short_title") return "heading";
  if (selection.field?.startsWith("q.")) return "heading";
  return "body";
}

export function inheritedTextStyle(
  selection: EditorSelection,
  section: SectionRow | undefined,
  theme: ThemeTokens,
): CanonicalTextStyle {
  const scale = textStyleScale(selection, section);
  if (scale === "display") {
    return {
      fontSize: 56,
      fontWeight: 400,
      lineHeight: 1,
      letterSpacing: 0.12,
      textAlign: "center",
      fontId: theme.wordmarkFont,
    };
  }
  if (scale === "heading") {
    return {
      fontSize: Math.round(24 * theme.headingScale),
      fontWeight: 500,
      lineHeight: 1.25,
      letterSpacing: theme.headingTracking,
      textAlign: section?.style?.textAlign ?? "center",
      fontId: theme.displayFont,
    };
  }
  return {
    fontSize: theme.bodySize,
    fontWeight: 400,
    lineHeight: theme.bodyLineHeight,
    letterSpacing: 0,
    paragraphSpacing: theme.paragraphSpacing,
    textAlign: section?.style?.textAlign ?? "left",
    fontId: theme.bodyFont,
  };
}

export function effectiveTextStyle(
  override: CanonicalTextStyle,
  inherited: CanonicalTextStyle,
): CanonicalTextStyle {
  return {
    color: override.color ?? inherited.color,
    fontId: override.fontId ?? inherited.fontId,
    fontFamily: override.fontFamily ?? inherited.fontFamily,
    fontSize: override.fontSize ?? inherited.fontSize,
    fontWeight: override.fontWeight ?? inherited.fontWeight,
    lineHeight: override.lineHeight ?? inherited.lineHeight,
    letterSpacing: override.letterSpacing ?? inherited.letterSpacing,
    paragraphSpacing: override.paragraphSpacing ?? inherited.paragraphSpacing,
    textAlign: override.textAlign ?? inherited.textAlign,
    textTransform: override.textTransform ?? inherited.textTransform,
    maxWidth: override.maxWidth === undefined ? inherited.maxWidth : override.maxWidth,
    fontStyle: override.fontStyle ?? inherited.fontStyle,
    textDecoration: override.textDecoration ?? inherited.textDecoration,
    role: override.role ?? inherited.role,
  };
}

export function isOverridden(override: CanonicalTextStyle, key: keyof CanonicalTextStyle): boolean {
  return override[key] !== undefined;
}

export function textStyleToCss(style: CanonicalTextStyle): CSSProperties {
  const css: CSSProperties & Record<string, string | number> = {};
  const color = parseColorToHex(style.color);
  const fontFamily = style.fontFamily || fontCssById(style.fontId);
  if (color) {
    css.color = color;
    css["--node-color"] = color;
  }
  if (fontFamily) {
    css.fontFamily = fontFamily;
    css["--node-font-family"] = fontFamily;
  }
  if (typeof style.fontSize === "number") {
    css.fontSize = `${style.fontSize}px`;
    css["--node-font-size"] = `${style.fontSize}px`;
  }
  if (typeof style.fontWeight === "number") {
    css.fontWeight = style.fontWeight;
    css["--node-font-weight"] = String(style.fontWeight);
  }
  if (typeof style.lineHeight === "number") {
    css.lineHeight = style.lineHeight;
    css["--node-line-height"] = String(style.lineHeight);
  }
  if (typeof style.letterSpacing === "number") {
    css.letterSpacing = `${style.letterSpacing}em`;
    css["--node-letter-spacing"] = `${style.letterSpacing}em`;
  }
  if (typeof style.paragraphSpacing === "number") {
    css["--node-paragraph-spacing"] = `${style.paragraphSpacing}px`;
  }
  if (style.textAlign) {
    css.textAlign = style.textAlign;
    css["--node-text-align"] = style.textAlign;
  }
  if (style.textTransform) css.textTransform = style.textTransform;
  if (style.fontStyle) css.fontStyle = style.fontStyle;
  if (style.textDecoration) css.textDecoration = style.textDecoration;
  if (style.maxWidth === WIDTH_FULL) {
    css.width = "100%";
    css.maxWidth = "none";
    css["--node-max-width"] = "100%";
    css["--node-width"] = "100%";
  } else if (typeof style.maxWidth === "number") {
    const width = `min(${style.maxWidth}px, 100%)`;
    css.width = width;
    css.maxWidth = width;
    css["--node-max-width"] = `${style.maxWidth}px`;
  }
  applyBreakpointVars(css, "tablet", style.tablet);
  applyBreakpointVars(css, "mobile", style.mobile);
  return css;
}

export function widthPresetId(maxWidth?: number | null): string {
  if (maxWidth == null) return "auto";
  if (maxWidth === WIDTH_FULL) return "full";
  const match = WIDTH_PRESETS.find((item) => item.value === maxWidth);
  return match?.id ?? "custom";
}

function applyBreakpointVars(
  css: CSSProperties & Record<string, string | number>,
  breakpoint: "tablet" | "mobile",
  style?: { fontSize?: number; maxWidth?: number | null },
) {
  if (!style) return;
  if (typeof style.fontSize === "number") css[`--node-font-size-${breakpoint}`] = `${style.fontSize}px`;
  if (style.maxWidth === WIDTH_FULL) css[`--node-max-width-${breakpoint}`] = "100%";
  else if (typeof style.maxWidth === "number") css[`--node-max-width-${breakpoint}`] = `${style.maxWidth}px`;
  else if (style.maxWidth === null) css[`--node-max-width-${breakpoint}`] = "100%";
}

function firstNumber(...values: Array<number | null | undefined>): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}
