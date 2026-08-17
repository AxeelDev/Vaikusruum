import type { CSSProperties } from "react";

export const DISPLAY_FONTS = [
  { id: "cormorant", label: "Cormorant Garamond", css: "var(--font-cormorant), 'Times New Roman', serif" },
  { id: "eb-garamond", label: "EB Garamond", css: "var(--font-eb-garamond), 'Times New Roman', serif" },
  { id: "bodoni-moda", label: "Bodoni Moda", css: "var(--font-bodoni), 'Times New Roman', serif" },
] as const;

export const BODY_FONTS = [
  { id: "source-sans-3", label: "Source Sans 3", css: "var(--font-source-sans), system-ui, sans-serif" },
  { id: "lato", label: "Lato", css: "var(--font-lato), system-ui, sans-serif" },
] as const;

export type DisplayFontId = (typeof DISPLAY_FONTS)[number]["id"];
export type BodyFontId = (typeof BODY_FONTS)[number]["id"];
export type SpeckDensity = "off" | "very-low" | "low";

export type ThemeTokens = {
  bgMain: string;
  bgWarm: string;
  bgSoft: string;
  text: string;
  textMuted: string;
  accentOrange: string;
  accentGold: string;
  accentBluegray: string;
  line: string;
  speck: string;
  socialBg: string;
  socialText: string;
  displayFont: DisplayFontId;
  bodyFont: BodyFontId;
  wordmarkFont: DisplayFontId;
  bodySize: number;
  bodyLineHeight: number;
  headingScale: number;
  pageTitleSize: number;
  wordmarkSize: number;
  wordmarkTracking: number;
  headingTracking: number;
  paragraphMaxWidth: number;
  contentMaxWidth: number;
  gutterDesktop: number;
  gutterMobile: number;
  sectionSpace: number;
  splitGap: number;
  headerHeight: number;
  paragraphSpacing: number;
  imageRadius: number;
  buttonRadius: number;
  buttonHeight: number;
  buttonPaddingX: number;
  buttonTracking: number;
  buttonBg: string;
  buttonText: string;
  specksEnabled: boolean;
  specksOpacity: number;
  specksDensity: SpeckDensity;
  specksColor: string;
};

export const DEFAULT_THEME: ThemeTokens = {
  bgMain: "#FCFAEE",
  bgWarm: "#FBF5DC",
  bgSoft: "#F8F4DF",
  text: "#3D3A35",
  textMuted: "#6D6960",
  accentOrange: "#B8642F",
  accentGold: "#E4B23E",
  accentBluegray: "#A8BAC3",
  line: "#DDD7BF",
  speck: "#A8AAA3",
  socialBg: "#A8BAC3",
  socialText: "#3D3A35",
  displayFont: "cormorant",
  bodyFont: "source-sans-3",
  wordmarkFont: "cormorant",
  bodySize: 18,
  bodyLineHeight: 1.7,
  headingScale: 1,
  pageTitleSize: 42,
  wordmarkSize: 56,
  wordmarkTracking: 0.22,
  headingTracking: 0.08,
  paragraphMaxWidth: 38,
  contentMaxWidth: 1180,
  gutterDesktop: 64,
  gutterMobile: 22,
  sectionSpace: 120,
  splitGap: 64,
  headerHeight: 88,
  paragraphSpacing: 18,
  imageRadius: 0,
  buttonRadius: 999,
  buttonHeight: 52,
  buttonPaddingX: 36,
  buttonTracking: 0.04,
  buttonBg: "#A8BAC3",
  buttonText: "#3D3A35",
  specksEnabled: true,
  specksOpacity: 0.28,
  specksDensity: "very-low",
  specksColor: "#A8AAA3",
};

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function hex(value: unknown, fallback: string): string {
  if (typeof value === "string" && HEX.test(value.trim())) return value.trim();
  return fallback;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : fallback;
  return clamp(n, min, max);
}

function fontId<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseTheme(input: unknown): ThemeTokens {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const density = raw.specksDensity;
  return {
    bgMain: hex(raw.bgMain, DEFAULT_THEME.bgMain),
    bgWarm: hex(raw.bgWarm, DEFAULT_THEME.bgWarm),
    bgSoft: hex(raw.bgSoft, DEFAULT_THEME.bgSoft),
    text: hex(raw.text, DEFAULT_THEME.text),
    textMuted: hex(raw.textMuted, DEFAULT_THEME.textMuted),
    accentOrange: hex(raw.accentOrange, DEFAULT_THEME.accentOrange),
    accentGold: hex(raw.accentGold, DEFAULT_THEME.accentGold),
    accentBluegray: hex(raw.accentBluegray, DEFAULT_THEME.accentBluegray),
    line: hex(raw.line, DEFAULT_THEME.line),
    speck: hex(raw.speck, DEFAULT_THEME.speck),
    socialBg: hex(raw.socialBg, DEFAULT_THEME.socialBg),
    socialText: hex(raw.socialText, DEFAULT_THEME.socialText),
    displayFont: fontId(raw.displayFont, DISPLAY_FONTS.map((f) => f.id), DEFAULT_THEME.displayFont),
    bodyFont: fontId(raw.bodyFont, BODY_FONTS.map((f) => f.id), DEFAULT_THEME.bodyFont),
    wordmarkFont: fontId(raw.wordmarkFont, DISPLAY_FONTS.map((f) => f.id), DEFAULT_THEME.wordmarkFont),
    bodySize: num(raw.bodySize, DEFAULT_THEME.bodySize, 14, 24),
    bodyLineHeight: num(raw.bodyLineHeight, DEFAULT_THEME.bodyLineHeight, 1.3, 2.2),
    headingScale: num(raw.headingScale, DEFAULT_THEME.headingScale, 0.8, 1.4),
    pageTitleSize: num(raw.pageTitleSize, DEFAULT_THEME.pageTitleSize, 24, 72),
    wordmarkSize: num(raw.wordmarkSize, DEFAULT_THEME.wordmarkSize, 24, 96),
    wordmarkTracking: num(raw.wordmarkTracking, DEFAULT_THEME.wordmarkTracking, 0.08, 0.4),
    headingTracking: num(raw.headingTracking, DEFAULT_THEME.headingTracking, 0, 0.3),
    paragraphMaxWidth: num(raw.paragraphMaxWidth, DEFAULT_THEME.paragraphMaxWidth, 24, 60),
    contentMaxWidth: num(raw.contentMaxWidth, DEFAULT_THEME.contentMaxWidth, 720, 1400),
    gutterDesktop: num(raw.gutterDesktop, DEFAULT_THEME.gutterDesktop, 24, 120),
    gutterMobile: num(raw.gutterMobile, DEFAULT_THEME.gutterMobile, 12, 40),
    sectionSpace: num(raw.sectionSpace, DEFAULT_THEME.sectionSpace, 48, 200),
    splitGap: num(raw.splitGap, DEFAULT_THEME.splitGap, 16, 120),
    headerHeight: num(raw.headerHeight, DEFAULT_THEME.headerHeight, 56, 140),
    paragraphSpacing: num(raw.paragraphSpacing, DEFAULT_THEME.paragraphSpacing, 8, 40),
    imageRadius: num(raw.imageRadius, DEFAULT_THEME.imageRadius, 0, 24),
    buttonRadius: num(raw.buttonRadius, DEFAULT_THEME.buttonRadius, 0, 999),
    buttonHeight: num(raw.buttonHeight, DEFAULT_THEME.buttonHeight, 36, 72),
    buttonPaddingX: num(raw.buttonPaddingX, DEFAULT_THEME.buttonPaddingX, 16, 64),
    buttonTracking: num(raw.buttonTracking, DEFAULT_THEME.buttonTracking, 0, 0.2),
    buttonBg: hex(raw.buttonBg, DEFAULT_THEME.buttonBg),
    buttonText: hex(raw.buttonText, DEFAULT_THEME.buttonText),
    specksEnabled: raw.specksEnabled !== false,
    specksOpacity: num(raw.specksOpacity, DEFAULT_THEME.specksOpacity, 0, 1),
    specksDensity: density === "off" || density === "low" || density === "very-low" ? density : DEFAULT_THEME.specksDensity,
    specksColor: hex(raw.specksColor, DEFAULT_THEME.specksColor),
  };
}

function fontCss(id: string, list: readonly { id: string; css: string }[]): string {
  return list.find((f) => f.id === id)?.css ?? list[0].css;
}

export function themeToCssVars(theme: ThemeTokens): CSSProperties {
  const t = parseTheme(theme);
  return {
    "--vr-bg-main": t.bgMain,
    "--vr-bg-warm": t.bgWarm,
    "--vr-bg-soft": t.bgSoft,
    "--vr-text": t.text,
    "--vr-text-muted": t.textMuted,
    "--vr-accent-orange": t.accentOrange,
    "--vr-accent-gold": t.accentGold,
    "--vr-accent-bluegray": t.accentBluegray,
    "--vr-line": t.line,
    "--vr-speck": t.speck,
    "--vr-social-bg": t.socialBg,
    "--vr-social-text": t.socialText,
    "--vr-font-display": fontCss(t.displayFont, DISPLAY_FONTS),
    "--vr-font-body": fontCss(t.bodyFont, BODY_FONTS),
    "--vr-font-wordmark": fontCss(t.wordmarkFont, DISPLAY_FONTS),
    "--vr-body-size": `${t.bodySize}px`,
    "--vr-body-line-height": String(t.bodyLineHeight),
    "--vr-heading-scale": String(t.headingScale),
    "--vr-page-title-size": `${t.pageTitleSize}px`,
    "--vr-wordmark-size": `${t.wordmarkSize}px`,
    "--vr-wordmark-tracking": `${t.wordmarkTracking}em`,
    "--vr-heading-tracking": `${t.headingTracking}em`,
    "--vr-paragraph-max-width": `${t.paragraphMaxWidth}rem`,
    "--vr-content-width": `${t.contentMaxWidth}px`,
    "--vr-gutter-desktop": `${t.gutterDesktop}px`,
    "--vr-gutter-mobile": `${t.gutterMobile}px`,
    "--vr-section-space": `${t.sectionSpace}px`,
    "--vr-split-gap": `${t.splitGap}px`,
    "--vr-header-height": `${t.headerHeight}px`,
    "--vr-paragraph-spacing": `${t.paragraphSpacing}px`,
    "--vr-image-radius": `${t.imageRadius}px`,
    "--vr-button-radius": t.buttonRadius >= 999 ? "999px" : `${t.buttonRadius}px`,
    "--vr-button-height": `${t.buttonHeight}px`,
    "--vr-button-padding-x": `${t.buttonPaddingX}px`,
    "--vr-button-tracking": `${t.buttonTracking}em`,
    "--vr-button-bg": t.buttonBg,
    "--vr-button-text": t.buttonText,
    "--vr-speck-opacity": t.specksEnabled && t.specksDensity !== "off" ? String(t.specksOpacity) : "0",
    "--vr-speck-color": t.specksColor,
  } as CSSProperties;
}

export function sanitizeCustomCss(css: string): string {
  return css.replace(/<\/style/gi, "").replace(/<script/gi, "");
}
