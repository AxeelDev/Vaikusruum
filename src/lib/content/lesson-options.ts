import { privateActionHref, readPrivateLessons, type PrivateLessonItem } from "@/lib/content/private-lessons";

/** Reserved key for "I have not decided yet"; stored as a topic label, never as an offering. */
export const UNSURE_KEY = "pole-kindel";
export const UNSURE_LABEL = "Pole veel kindel";

export type LessonOption = {
  /** Stable, URL-safe; the offering's slug or a slug of the lesson title. */
  key: string;
  label: string;
  /** Set when the choice is one of the active offerings. */
  offeringId: string | null;
};

type OfferingLike = { id: string; slug: string; title: string; short_title: string | null };

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase("et");
}

const ASCII_LETTERS: Record<string, string> = { õ: "o", ä: "a", ö: "o", ü: "u", š: "s", ž: "z" };

/** "Pehme jooga ja gongilõdvestus" becomes "pehme-jooga-ja-gongilodvestus". */
export function lessonKey(title: string): string {
  return normalizeTitle(title)
    .replace(/[õäöüšž]/g, (letter) => ASCII_LETTERS[letter])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Every class a visitor can ask about, without duplicates: the active offerings first, then the
 * private-lesson types from the Eratunnid page that no offering already covers (matched by title),
 * and "Pole veel kindel" last.
 */
export function buildLessonOptions(offerings: OfferingLike[], lessons: Array<Pick<PrivateLessonItem, "title">>): LessonOption[] {
  const options: LessonOption[] = [];
  const seenTitles = new Set<string>();
  const seenKeys = new Set<string>([UNSURE_KEY]);

  const add = (label: string, wanted: string, offeringId: string | null, titles: string[]) => {
    const base = wanted || lessonKey(label) || "tund";
    let key = base;
    for (let n = 2; seenKeys.has(key); n += 1) key = `${base}-${n}`;
    seenKeys.add(key);
    for (const title of titles) seenTitles.add(normalizeTitle(title));
    options.push({ key, label, offeringId });
  };

  for (const offering of offerings) {
    const label = (offering.short_title || offering.title).trim();
    if (!label) continue;
    add(label, offering.slug, offering.id, [offering.title, offering.short_title ?? ""].filter(Boolean));
  }
  for (const lesson of lessons) {
    const title = lesson.title.trim();
    if (!title || seenTitles.has(normalizeTitle(title))) continue;
    add(title, lessonKey(title), null, [title]);
  }
  options.push({ key: UNSURE_KEY, label: UNSURE_LABEL, offeringId: null });
  return options;
}

/** Private-lesson types listed on the site, from the sections that carry them. */
export function lessonsFromSections(sections: Array<{ section_type: string; enabled?: boolean; content: Record<string, unknown> }>): PrivateLessonItem[] {
  return sections
    .filter((section) => section.section_type === "private_lessons" && section.enabled !== false)
    .flatMap((section) => readPrivateLessons(section.content));
}

/** The contact link for one class on the Eratunnid page; the form preselects it from "tund". */
export function privateLessonHref(content: Record<string, unknown>, title: string): string {
  const base = privateActionHref(content);
  const key = lessonKey(title);
  // A custom button address (another page, an external site) is not ours to extend.
  if (!key || !/^\/kontakt(\?|$)/.test(base)) return base;
  return `${base}${base.includes("?") ? "&" : "?"}tund=${key}`;
}

/** The option a "tund" link points at: by key, or by the key of its label. */
export function resolveLessonParam(options: LessonOption[], param: string | null | undefined): LessonOption | undefined {
  if (!param) return undefined;
  return options.find((option) => option.key === param) ?? options.find((option) => lessonKey(option.label) === param);
}

export function findLessonOption(options: LessonOption[], key: string | null | undefined): LessonOption | undefined {
  if (!key) return undefined;
  return options.find((option) => option.key === key);
}

/** What the admin and the notification e-mail show for a submission's class. */
export function submissionClassLabel(input: { topic?: string | null; offeringTitle?: string | null }): string | null {
  return input.offeringTitle?.trim() || input.topic?.trim() || null;
}
