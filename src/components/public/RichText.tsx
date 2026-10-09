import type { CSSProperties, ReactNode } from "react";
import type { TiptapNode } from "@/types/content";
import { isTiptapDoc } from "@/lib/content/rich-text";
import { sanitizeHref } from "@/lib/content/markdown";

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

function isUrl(text: string | undefined): text is string {
  return Boolean(text && /^https?:\/\/\S+$/.test(text.trim()));
}

function linkElement(href: string, children: ReactNode, key?: string) {
  return (
    <a key={key} href={href} rel="noreferrer" target={href.startsWith("http") ? "_blank" : undefined}>
      {children}
    </a>
  );
}

/** Plain text with bare web addresses turned into links, so a pasted URL is always clickable. */
function linkify(text: string, key: string): ReactNode {
  const parts = text.split(URL_PATTERN);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (i % 2 === 1 ? linkElement(part, part, `${key}-u${i}`) : part));
}

function textOf(node: TiptapNode, key: string): ReactNode {
  const link = node.marks?.find((m) => m.type === "link");
  let href = link?.attrs?.href;
  // A link mark saved without an address still points at its own text when that text is a URL.
  if (link && (typeof href !== "string" || !href) && isUrl(node.text)) href = node.text.trim();
  // Same rule as Markdown links: no javascript:, data: or vbscript: addresses.
  href = typeof href === "string" ? sanitizeHref(href) ?? undefined : undefined;
  const hasHref = typeof href === "string" && Boolean(href);
  const children =
    node.content?.map((child, i) => <NodeView key={`${key}-${i}`} node={child} />) ??
    (hasHref || !node.text ? node.text : linkify(node.text, key));
  let wrapped: ReactNode = children;
  if (node.marks?.some((m) => m.type === "bold")) wrapped = <strong>{wrapped}</strong>;
  if (node.marks?.some((m) => m.type === "italic")) wrapped = <em>{wrapped}</em>;
  if (hasHref) wrapped = linkElement(href as string, wrapped);
  return wrapped;
}

function isEmptyParagraph(node: TiptapNode) {
  return node.type === "paragraph" && !node.content?.some((child) => child.type !== "text" || child.text?.trim());
}

/** Trailing blank lines carry no meaning on the page; blank lines between content are kept as spacing. */
function trimTrailingEmpty(nodes: TiptapNode[]) {
  let end = nodes.length;
  while (end > 0 && isEmptyParagraph(nodes[end - 1])) end--;
  return nodes.slice(0, end);
}

function NodeView({ node }: { node: TiptapNode }) {
  const children = node.content?.map((child, i) => <NodeView key={i} node={child} />);
  switch (node.type) {
    case "doc":
      return <>{trimTrailingEmpty(node.content ?? []).map((child, i) => <NodeView key={i} node={child} />)}</>;
    case "paragraph":
      // An empty paragraph is a deliberate blank line; give it a line of height like the editor does.
      if (isEmptyParagraph(node)) return <p className="vr-rich-blank" aria-hidden="true"><br /></p>;
      return <p>{children ?? node.text}</p>;
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      if (level === 3) return <h3 className="vr-heading-sm">{children}</h3>;
      return <h2 className="vr-heading">{children}</h2>;
    }
    case "bulletList":
      return <ul>{children}</ul>;
    case "orderedList":
      return <ol>{children}</ol>;
    case "listItem":
      return <li>{children}</li>;
    case "hardBreak":
      return <br />;
    case "text":
      return <>{textOf(node, "t")}</>;
    default:
      return <>{children}</>;
  }
}

export function RichText({ value, className, style }: { value: unknown; className?: string; style?: CSSProperties }) {
  if (typeof value === "string") {
    return (
      <div className={className ?? "vr-rich"} style={style}>
        {value.split("\n").map((line, i) => (
          <p key={i}>{line || "\u00a0"}</p>
        ))}
      </div>
    );
  }
  if (!isTiptapDoc(value)) return null;
  return (
    <div className={className ?? "vr-rich"} style={style}>
      <NodeView node={value} />
    </div>
  );
}
