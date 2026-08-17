import type { CSSProperties } from "react";
import { fontCssById } from "@/lib/theme/theme";
import type { ImageCrop, SectionRow, TextAppearance } from "@/types/content";

export function fieldStyle(section: SectionRow | undefined, field: string): TextAppearance | undefined {
  return section?.style?.fieldStyles?.[field];
}

export function appearanceToStyle(appearance?: TextAppearance): CSSProperties {
  if (!appearance) return {};
  const style: CSSProperties = {};
  if (appearance.color) style.color = appearance.color;
  const font = fontCssById(appearance.fontId);
  if (font) style.fontFamily = font;
  if (typeof appearance.size === "number") style.fontSize = `${appearance.size}px`;
  if (typeof appearance.weight === "number") style.fontWeight = appearance.weight;
  if (typeof appearance.lineHeight === "number") style.lineHeight = appearance.lineHeight;
  if (typeof appearance.letterSpacing === "number") style.letterSpacing = `${appearance.letterSpacing}em`;
  if (appearance.align) style.textAlign = appearance.align;
  if (typeof appearance.width === "number") style.maxWidth = `${appearance.width}px`;
  return style;
}

export function photoClassName(crop?: ImageCrop, extra?: string): string {
  const parts = ["vr-photo"];
  if (crop === "portrait") parts.push("vr-photo--portrait");
  else if (crop === "landscape") parts.push("vr-photo--landscape");
  else if (crop === "square") parts.push("vr-photo--square");
  else if (crop === "original") parts.push("vr-photo--original");
  if (extra) parts.push(extra);
  return parts.join(" ");
}

export function mergeFieldStyle(
  section: SectionRow,
  field: string,
  patch: Partial<TextAppearance>,
): SectionRow {
  const current = fieldStyle(section, field) ?? {};
  return {
    ...section,
    style: {
      ...section.style,
      fieldStyles: {
        ...section.style?.fieldStyles,
        [field]: { ...current, ...patch },
      },
    },
  };
}
