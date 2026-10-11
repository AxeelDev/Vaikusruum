export type PrivateLessonItem = {
  title: string;
  duration: string;
  description: string;
};

export type PrivatePriceItem = {
  label: string;
  amount: string;
};

export const DEFAULT_PRIVATE_LESSONS: PrivateLessonItem[] = [
  { title: "Kundalini jooga", duration: "1,5 h", description: "" },
  { title: "Pehme jooga ja gongilõdvestus", duration: "1,5 h", description: "" },
  {
    title: "Individuaaltund rasedale",
    duration: "1,5 h",
    description: "Spetsiaalne rasedatejooga tund kundalini jooga võtmes. Õrn, toetav, sünnituseks ettevalmistav.",
  },
];

export const DEFAULT_PRIVATE_PRICES: PrivatePriceItem[] = [
  { label: "Individuaaltund", amount: "80 €" },
  { label: "5 korda", amount: "350 €" },
  { label: "Tule koos sõbraga!", amount: "120 €" },
];

/**
 * The rows as saved, spaces and line breaks included: the inspector edits through this reader,
 * so trimming here would swallow a new line or a space the moment it is typed.
 */
export function readPrivateLessons(content: Record<string, unknown>): PrivateLessonItem[] {
  const raw = content.lessons;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      title: String(row.title ?? ""),
      duration: String(row.duration ?? ""),
      description: String(row.description ?? ""),
    };
  });
}

export function readPrivatePrices(content: Record<string, unknown>): PrivatePriceItem[] {
  const raw = content.prices;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      label: String(row.label ?? ""),
      amount: String(row.amount ?? ""),
    };
  });
}

export function privateActionHref(content: Record<string, unknown>): string {
  const href = typeof content.actionHref === "string" ? content.actionHref.trim() : "";
  return href || "/kontakt?teema=eratund";
}
