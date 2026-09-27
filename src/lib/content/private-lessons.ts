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

export function readPrivateLessons(content: Record<string, unknown>): PrivateLessonItem[] {
  const raw = content.lessons;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      title: String(row.title ?? "").trim(),
      duration: String(row.duration ?? "").trim(),
      description: String(row.description ?? "").trim(),
    };
  });
}

export function readPrivatePrices(content: Record<string, unknown>): PrivatePriceItem[] {
  const raw = content.prices;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      label: String(row.label ?? "").trim(),
      amount: String(row.amount ?? "").trim(),
    };
  });
}

export function privateActionHref(content: Record<string, unknown>): string {
  const href = typeof content.actionHref === "string" ? content.actionHref.trim() : "";
  return href || "/kontakt?teema=eratund";
}
