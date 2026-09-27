export function splitWordmark(value: string): [string, string] | null {
  const text = value.replace(/\u00a0/g, " ").trim();
  if (!text) return null;

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 2) return [lines[0], lines[1]];

  const spaced = text.split(/\s+/).filter(Boolean);
  if (spaced.length === 2) return [spaced[0], spaced[1]];

  const compact = text.replace(/\s+/g, "");
  if (!/^vaikusruum$/i.test(compact)) return null;
  return [compact.slice(0, 6), compact.slice(6)];
}

export function wordmarkLines(value: string): string[] {
  return splitWordmark(value) ?? [value];
}
