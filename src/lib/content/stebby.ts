/**
 * A Stebby link element shows the Stebby logo and links to the studio's Stebby page.
 * The link is set once in Seaded (site_settings.social.stebby); each element only keeps its look.
 */
export type StebbyVariant = "green" | "color";

export type StebbyConfig = {
  variant: StebbyVariant;
  /** Logo height in pixels. */
  size: number;
};

export const STEBBY_VARIANTS: Array<{ value: StebbyVariant; label: string; src: string }> = [
  { value: "green", label: "Roheline", src: "/brand/stebby/stebby-green.png" },
  { value: "color", label: "Värviline", src: "/brand/stebby/stebby-color.png" },
];

export const STEBBY_SIZE = { min: 24, max: 120, default: 44 };

export function isStebbyField(field?: string | null): boolean {
  return Boolean(field?.startsWith("custom.stebby."));
}

export function readStebbyConfig(value: unknown): StebbyConfig {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const variant = STEBBY_VARIANTS.some((item) => item.value === raw.variant) ? (raw.variant as StebbyVariant) : "green";
  const size = typeof raw.size === "number" && Number.isFinite(raw.size)
    ? Math.min(STEBBY_SIZE.max, Math.max(STEBBY_SIZE.min, Math.round(raw.size)))
    : STEBBY_SIZE.default;
  return { variant, size };
}

export function stebbyLogoSrc(variant: StebbyVariant): string {
  return STEBBY_VARIANTS.find((item) => item.value === variant)?.src ?? STEBBY_VARIANTS[0].src;
}
