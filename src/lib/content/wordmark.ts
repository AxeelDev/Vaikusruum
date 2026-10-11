/** The wordmark's own lines, when the client broke it over two or more; null for a one-line wordmark. */
export function splitWordmark(value: string): string[] | null {
  const text = value.replace(/ /g, " ").trim();
  if (!text) return null;

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length >= 2 ? lines : null;
}

export function wordmarkLines(value: string): string[] {
  return splitWordmark(value) ?? [value];
}
