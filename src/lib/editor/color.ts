export type Hsv = { h: number; s: number; v: number };

const HEX3 = /^#([0-9a-f]{3})$/i;
const HEX6 = /^#([0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i;

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function canonicalizeHex(input: string): string | null {
  const value = input.trim();
  const short = value.match(HEX3);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const long = value.match(HEX6);
  if (long) return `#${long[1].toUpperCase()}`;
  return null;
}

export function isHexDraftValid(input: string): boolean {
  const value = input.trim();
  return HEX3.test(value) || HEX6.test(value);
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const canonical = canonicalizeHex(hex);
  if (!canonical) return null;
  return {
    r: parseInt(canonical.slice(1, 3), 16),
    g: parseInt(canonical.slice(3, 5), 16),
    b: parseInt(canonical.slice(5, 7), 16),
  };
}

export function parseColorToHex(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const hex = canonicalizeHex(input);
  if (hex) return hex;
  const rgb = input.trim().match(RGB);
  if (!rgb) return null;
  return rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
}

export function hexToHsv(hex: string): Hsv {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex(hsv: Hsv): string {
  const h = ((hsv.h % 360) + 360) % 360;
  const s = clamp(hsv.s, 0, 1);
  const v = clamp(hsv.v, 0, 1);
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function formatSliderValue(value: number, unit?: string, exact = false): string {
  if (unit === "px") {
    return exact ? `${Math.round(value)}px` : `${(value / 16).toFixed(2).replace(/\.?0+$/, "") || "0"} rem`;
  }
  if (unit === "em") {
    const n = value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return exact ? `${n} em` : n;
  }
  if (unit === "%") return `${Math.round(value)}%`;
  if (unit === "rem") {
    const n = value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `${n} rem`;
  }
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(2)));
}

export type ThemeSwatch = { id: string; label: string; hex: string };

export function themeColorSwatches(theme: {
  text: string;
  textMuted: string;
  bgWarm: string;
  bgMain: string;
  accentOrange: string;
  accentBluegray: string;
}): ThemeSwatch[] {
  return [
    { id: "text", label: "Tekst", hex: canonicalizeHex(theme.text) ?? "#3D3A35" },
    { id: "textMuted", label: "Summutatud tekst", hex: canonicalizeHex(theme.textMuted) ?? "#6D6960" },
    { id: "bgWarm", label: "Soe taust", hex: canonicalizeHex(theme.bgWarm) ?? "#FBF5DC" },
    { id: "bgMain", label: "Hele taust", hex: canonicalizeHex(theme.bgMain) ?? "#FCFAEE" },
    { id: "accentOrange", label: "Oranž aktsent", hex: canonicalizeHex(theme.accentOrange) ?? "#B8642F" },
    { id: "accentBluegray", label: "Sinakashall aktsent", hex: canonicalizeHex(theme.accentBluegray) ?? "#A8BAC3" },
  ];
}

export function matchThemeToken(
  hex: string,
  theme: { text: string; textMuted: string; accentOrange: string; accentBluegray: string; bgMain: string; bgWarm: string },
): ThemeSwatch["id"] | null {
  const canonical = canonicalizeHex(hex);
  if (!canonical) return null;
  const swatches = themeColorSwatches(theme);
  return swatches.find((item) => item.hex === canonical)?.id ?? null;
}
