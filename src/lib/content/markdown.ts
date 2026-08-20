import { createElement, Fragment, type ReactNode } from "react";

const COLOR_NAMES: Record<string, string> = {
  red: "#c45c4a",
  orange: "#b8642f",
  gold: "#e4b23e",
  yellow: "#e4b23e",
  green: "#5d8a6a",
  blue: "#5b7c8a",
  teal: "#35b7b8",
  purple: "#7a6a8a",
  pink: "#c47a8a",
  brown: "#8a6a4a",
  gray: "#6d6960",
  grey: "#6d6960",
  black: "#3d3a35",
  white: "#fcfaee",
};

const MARKDOWN_HINT = /[*_`~^|=\\[]/;

export function looksLikeMarkdown(value: string): boolean {
  return MARKDOWN_HINT.test(value);
}

export function sanitizeHref(href: string): string | null {
  const value = href.trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("mailto:")) return value;
  if (value.startsWith("#") && !isHexColor(value)) return value;
  return null;
}

export function resolveMarkdownColor(value: string): string | null {
  const trimmed = value.trim();
  if (isHexColor(trimmed)) return trimmed.length === 4 ? expandHex(trimmed) : trimmed.toLowerCase();
  return COLOR_NAMES[trimmed.toLowerCase()] ?? null;
}

export function renderMarkdown(source: string): ReactNode {
  if (!source) return null;
  if (!looksLikeMarkdown(source)) return source;
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  lines.forEach((line, index) => {
    if (index > 0) blocks.push(createElement("br", { key: `br-${index}` }));
    blocks.push(createElement(Fragment, { key: `ln-${index}` }, parseInline(unescapeBreaks(line), `l${index}`)));
  });
  return blocks;
}

function unescapeBreaks(line: string): string {
  return line.replace(/\\\s/g, "\u00a0");
}

function parseInline(input: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = input;
  let n = 0;
  while (rest.length) {
    const key = `${keyPrefix}-${n++}`;
    const code = rest.match(/^`([^`]+)`/);
    if (code) {
      nodes.push(createElement("code", { key, className: "vr-md-code" }, code[1]));
      rest = rest.slice(code[0].length);
      continue;
    }
    const link = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (link) {
      const inner = parseInline(link[1], `${key}-in`);
      const color = resolveMarkdownColor(link[2]);
      const href = color ? null : sanitizeHref(link[2]);
      if (color) nodes.push(createElement("span", { key, style: { color } }, inner));
      else if (href) nodes.push(createElement("a", { key, href, className: "vr-text-link" }, inner));
      else nodes.push(...inner);
      rest = rest.slice(link[0].length);
      continue;
    }
    const boldItalic = rest.match(/^\*\*\*([^*]+)\*\*\*/);
    if (boldItalic) {
      nodes.push(createElement("strong", { key }, createElement("em", null, boldItalic[1])));
      rest = rest.slice(boldItalic[0].length);
      continue;
    }
    const bold = rest.match(/^\*\*([^*]+)\*\*/);
    if (bold) {
      nodes.push(createElement("strong", { key }, bold[1]));
      rest = rest.slice(bold[0].length);
      continue;
    }
    const underline = rest.match(/^__([^_]+)__/);
    if (underline) {
      nodes.push(createElement("span", { key, style: { textDecoration: "underline" } }, underline[1]));
      rest = rest.slice(underline[0].length);
      continue;
    }
    const italicStar = rest.match(/^\*([^*]+)\*/);
    if (italicStar) {
      nodes.push(createElement("em", { key }, italicStar[1]));
      rest = rest.slice(italicStar[0].length);
      continue;
    }
    const italicUnder = rest.match(/^_([^_]+)_/);
    if (italicUnder) {
      nodes.push(createElement("em", { key }, italicUnder[1]));
      rest = rest.slice(italicUnder[0].length);
      continue;
    }
    const strike = rest.match(/^~~([^~]+)~~/);
    if (strike) {
      nodes.push(createElement("s", { key }, strike[1]));
      rest = rest.slice(strike[0].length);
      continue;
    }
    const highlight = rest.match(/^==([^=]+)==/);
    if (highlight) {
      nodes.push(createElement("mark", { key, className: "vr-md-mark" }, highlight[1]));
      rest = rest.slice(highlight[0].length);
      continue;
    }
    const spoiler = rest.match(/^\|\|([^|]+)\|\|/);
    if (spoiler) {
      nodes.push(createElement("span", { key, className: "vr-md-spoiler" }, spoiler[1]));
      rest = rest.slice(spoiler[0].length);
      continue;
    }
    const sup = rest.match(/^\^([^^]+)\^/);
    if (sup) {
      nodes.push(createElement("sup", { key }, sup[1]));
      rest = rest.slice(sup[0].length);
      continue;
    }
    const sub = rest.match(/^~([^~]+)~/);
    if (sub) {
      nodes.push(createElement("sub", { key }, sub[1]));
      rest = rest.slice(sub[0].length);
      continue;
    }
    const next = rest.search(/[`\[]|\*\*\*|\*\*|__|\*|_|~~|==|\|\||\^|~/);
    if (next === 0) {
      nodes.push(rest[0]);
      rest = rest.slice(1);
      continue;
    }
    const chunk = next === -1 ? rest : rest.slice(0, next);
    nodes.push(chunk);
    rest = next === -1 ? "" : rest.slice(next);
  }
  return nodes;
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function expandHex(value: string): string {
  const raw = value.slice(1);
  return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
}

export const RICH_MARKDOWN_HELP_ITEMS = [
  { sample: "**Bold**", hint: "Bold" },
  { sample: "*Italic*", hint: "Italic" },
  { sample: "[Link text](https://…)", hint: "Link" },
] as const;

export const MARKDOWN_HELP_ITEMS = [
  { sample: "**Bold**", hint: "Bold" },
  { sample: "*Italic* or _Italic_", hint: "Italic" },
  { sample: "***Bold Italic***", hint: "Bold Italic" },
  { sample: "__Underline__", hint: "Underline" },
  { sample: "[Link text](https://…)", hint: "Link" },
  { sample: "`Code`", hint: "Code" },
  { sample: "~~Strike~~", hint: "Strike" },
  { sample: "==Highlight==", hint: "Highlight" },
  { sample: "^Superscript^", hint: "Superscript" },
  { sample: "~Subscript~", hint: "Subscript" },
  { sample: "||Spoiler||", hint: "Spoiler" },
  { sample: "[color text](red)", hint: "Named color" },
  { sample: "[color text](#d48342)", hint: "Hex color" },
  { sample: "Line\\Break", hint: "Line break" },
  { sample: "Non-Breaking\\ Space", hint: "Non-breaking space" },
] as const;
