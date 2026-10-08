import { parseTheme, type ThemeTokens } from "@/lib/theme/theme";

const SHARED_COLOUR = {
  bgMain: "#FBF8F3",
  bgSoft: "#FFFFFF",
  bgWarm: "#EEE3D4",
  bgContrast: "#7A2148",
  contrastText: "#FBF8F3",
  contrastHeading: "#E6C985",
  text: "#30272B",
  textMuted: "#5C4F55",
  accentOrange: "#7A2148",
  accentGold: "#6B5018",
  accentBluegray: "#7A2148",
  line: "#E2D3C4",
  speck: "#C4B4A8",
  socialBg: "#7A2148",
  socialText: "#FBF8F3",
  buttonBg: "#7A2148",
  buttonText: "#FFFFFF",
  specksColor: "#C4B4A8",
  bodyFont: "cormorant" as const,
  displayFont: "cormorant" as const,
  wordmarkFont: "cormorant" as const,
  bodyLineHeight: 1.6,
};

export const THEME_PRESET_A = {
  ...SHARED_COLOUR,
} satisfies Partial<ThemeTokens>;

export const THEME_PRESET_B = {
  bgMain: "#2A1520",
  bgSoft: "#351A28",
  bgWarm: "#3D1C2C",
  bgContrast: "#7A2148",
  contrastText: "#FBF8F3",
  contrastHeading: "#E6C985",
  text: "#F7F1EA",
  textMuted: "#D2C0C6",
  accentOrange: "#C45A7A",
  accentGold: "#E6C985",
  headingColor: "#E6C985",
  accentBluegray: "#C45A7A",
  line: "#5C3344",
  speck: "#8A5A6A",
  socialBg: "#E6C985",
  socialText: "#2A1520",
  buttonBg: "#E6C985",
  buttonText: "#2A1520",
  specksColor: "#8A5A6A",
  bodyFont: "cormorant",
  displayFont: "cormorant",
  wordmarkFont: "cormorant",
  bodyLineHeight: 1.55,
} satisfies Partial<ThemeTokens>;

/** Same palette as A on pure white surfaces, for comparing against the cream backgrounds. */
export const THEME_PRESET_WHITE = {
  ...SHARED_COLOUR,
  bgMain: "#FFFFFF",
  bgSoft: "#FFFFFF",
  bgWarm: "#F7F2F4",
} satisfies Partial<ThemeTokens>;

export type ThemePresetId = "a" | "b" | "white";

const PRESETS: Record<ThemePresetId, Partial<ThemeTokens>> = {
  a: THEME_PRESET_A,
  b: THEME_PRESET_B,
  white: THEME_PRESET_WHITE,
};

export function applyThemePreset(base: ThemeTokens, preset: ThemePresetId): ThemeTokens {
  return parseTheme({
    ...base,
    ...PRESETS[preset],
  });
}
