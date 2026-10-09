import { mediaPublicUrl } from "@/lib/utils/urls";
import type { TestimonialWithPhoto } from "@/types/content";

/** Shown for "Näita nime" when no name was given. */
export const NAME_PLACEHOLDER = "Joogakäija";
/** Shown for "Näita pilti" when no photo was chosen. */
export const AVATAR_PLACEHOLDER = "/brand/avatar-placeholder.svg";

export type TestimonialDisplay = {
  /** One entry per paragraph. */
  paragraphs: string[];
  /** Null when the name is switched off. */
  name: string | null;
  /** Null when the photo is switched off. */
  photo: string | null;
  /** True when the photo is the stand-in, not one the admin chose. */
  photoIsPlaceholder: boolean;
};

type TestimonialInput = Pick<TestimonialWithPhoto, "quote" | "name" | "show_name" | "show_photo"> & {
  photo?: Pick<NonNullable<TestimonialWithPhoto["photo"]>, "storage_path"> | null;
};

/** What a visitor sees for one testimonial, with the stand-ins for a missing name or photo. */
export function testimonialDisplay(item: TestimonialInput): TestimonialDisplay {
  const paragraphs = item.quote
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const name = item.show_name ? item.name?.trim() || NAME_PLACEHOLDER : null;
  const chosen = item.photo?.storage_path ? mediaPublicUrl(item.photo.storage_path) : "";
  const photo = item.show_photo ? chosen || AVATAR_PLACEHOLDER : null;
  return { paragraphs, name, photo, photoIsPlaceholder: Boolean(photo) && !chosen };
}
