import type { TiptapNode } from "@/types/content";

export function emptyDoc(): TiptapNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function paragraphs(...texts: string[]): TiptapNode {
  return {
    type: "doc",
    content: texts.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}

/** Supports *italic* markers only. Does not change the underlying words. */
export function paragraphWithItalics(text: string): TiptapNode {
  const content: TiptapNode[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      content.push({ type: "text", text: text.slice(last, match.index) });
    }
    content.push({ type: "text", text: match[1], marks: [{ type: "italic" }] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    content.push({ type: "text", text: text.slice(last) });
  }
  return { type: "paragraph", content: content.length ? content : undefined };
}

export function richDoc(nodes: TiptapNode[]): TiptapNode {
  return { type: "doc", content: nodes };
}

export function bulletList(items: Array<string | TiptapNode>): TiptapNode {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [
        typeof item === "string" ? paragraphWithItalics(item) : item,
      ],
    })),
  };
}

export function isTiptapDoc(value: unknown): value is TiptapNode {
  return Boolean(value && typeof value === "object" && (value as TiptapNode).type === "doc");
}

export function docHasText(doc: unknown): boolean {
  if (!isTiptapDoc(doc)) return typeof doc === "string" ? doc.trim().length > 0 : false;
  const walk = (node: TiptapNode): boolean => {
    if (node.text && node.text.trim()) return true;
    return Boolean(node.content?.some(walk));
  };
  return walk(doc);
}
