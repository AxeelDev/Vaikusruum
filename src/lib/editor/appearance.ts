import type { CSSProperties } from "react";
import { parseColorToHex } from "@/lib/editor/color";
import { readTextStyle, textStyleToCss, writeTextStylePatch } from "@/lib/editor/text-style";
import type { ImageCrop, SectionRow, TextAppearance } from "@/types/content";

export function fieldStyle(section: SectionRow | undefined, field: string): TextAppearance | undefined {
  return section?.style?.fieldStyles?.[field];
}

export function appearanceToStyle(appearance?: TextAppearance): CSSProperties {
  return textStyleToCss(readTextStyle(appearance));
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
  const canonicalPatch = writeTextStylePatch(readTextStyle(patch));
  const next: TextAppearance = { ...current, ...canonicalPatch, ...patch };
  if (patch.color !== undefined || canonicalPatch.color !== undefined) {
    const color = parseColorToHex(patch.color ?? canonicalPatch.color);
    if (color) next.color = color;
    else {
      delete next.color;
    }
  }
  if (patch.maxWidth === null) {
    next.maxWidth = null;
    delete next.width;
  }
  if (patch.maxWidth === 0) {
    next.maxWidth = 0;
    next.width = 0;
  }
  return {
    ...section,
    style: {
      ...section.style,
      fieldStyles: {
        ...section.style?.fieldStyles,
        [field]: next,
      },
    },
  };
}

export function clearFieldStyleKeys(section: SectionRow, field: string, keys: Array<keyof TextAppearance>): SectionRow {
  const current = { ...(fieldStyle(section, field) ?? {}) };
  for (const key of keys) delete current[key];
  return {
    ...section,
    style: {
      ...section.style,
      fieldStyles: {
        ...section.style?.fieldStyles,
        [field]: current,
      },
    },
  };
}
