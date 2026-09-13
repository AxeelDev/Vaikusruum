import { clamp } from "@/lib/editor/color";
import type { ImageAppearance, ImageCrop, SectionRow } from "@/types/content";

export const IMAGE_SIZE_MIN = 10;
export const IMAGE_SIZE_MAX = 100;
export const IMAGE_SIZE_DEFAULT = 100;

export type ResolvedImageAppearance = {
  crop: ImageCrop;
  size: number;
  align: "left" | "right" | "center";
};

type ImageContent = ImageAppearance & { mediaId?: string; alt?: string };

export function isCustomImageField(field?: string | null): field is string {
  return Boolean(field?.startsWith("custom."));
}

export function resolveImageMediaId(section: SectionRow, field?: string): string | undefined {
  if (isCustomImageField(field)) {
    const raw = imageContent(section.content[field]);
    return raw?.mediaId || undefined;
  }
  if (Object.prototype.hasOwnProperty.call(section.style ?? {}, "mediaId")) {
    return typeof section.style?.mediaId === "string" && section.style.mediaId ? section.style.mediaId : undefined;
  }
  return typeof section.content.mediaId === "string" && section.content.mediaId ? section.content.mediaId : undefined;
}

export function readImageAppearance(section: SectionRow, field?: string): ResolvedImageAppearance {
  const custom = isCustomImageField(field);
  const raw = custom ? imageContent(section.content[field]) : section.style?.image;
  const fallbackCrop: ImageCrop = !custom && section.section_type === "hero" ? "original" : "landscape";
  return {
    crop: raw?.crop ?? fallbackCrop,
    size: clampImageSize(raw?.size ?? raw?.width),
    align: raw?.align === "left" || raw?.align === "right" ? raw.align : "center",
  };
}

export function patchImageAppearance(
  section: SectionRow,
  field: string | undefined,
  patch: Partial<Pick<ImageAppearance, "crop" | "size" | "align">>,
): SectionRow {
  const currentLook = readImageAppearance(section, field);
  const nextAppearance: ImageAppearance = {
    crop: patch.crop ?? currentLook.crop,
    size: patch.size != null ? clampImageSize(patch.size) : currentLook.size,
    align: patch.align ?? currentLook.align,
  };

  if (isCustomImageField(field)) {
    const current = imageContent(section.content[field]) ?? {};
    const next = { ...current, ...nextAppearance };
    delete next.width;
    delete next.radius;
    return {
      ...section,
      content: {
        ...section.content,
        [field]: next,
      },
    };
  }

  const image = { ...section.style?.image, ...nextAppearance };
  delete image.width;
  delete image.radius;
  return {
    ...section,
    style: {
      ...section.style,
      image,
    },
  };
}

export function assignImageMedia(section: SectionRow, field: string | undefined, mediaId: string | null): SectionRow {
  if (isCustomImageField(field)) {
    const current = imageContent(section.content[field]) ?? {};
    return {
      ...section,
      content: {
        ...section.content,
        [field]: { ...current, mediaId: mediaId ?? "" },
      },
    };
  }
  return {
    ...section,
    style: { ...section.style, mediaId },
  };
}

export function clampImageSize(value?: number | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return IMAGE_SIZE_DEFAULT;
  return clamp(Math.round(value), IMAGE_SIZE_MIN, IMAGE_SIZE_MAX);
}

function imageContent(value: unknown): ImageContent | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as ImageContent;
}
