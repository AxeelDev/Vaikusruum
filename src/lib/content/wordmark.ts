export function splitWordmark(value: string): [string, string] | null {
  const text = value.replace(/ /g, " ").trim();
  if (!text) return null;

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 2) return [lines[0], lines[1]];
  return null;
}

export function wordmarkLines(value: string): string[] {
  return splitWordmark(value) ?? [value];
}
