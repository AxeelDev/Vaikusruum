import type { TiptapNode } from "@/types/content";
import { isTiptapDoc } from "@/lib/content/rich-text";

function textOf(node: TiptapNode, key: string): React.ReactNode {
  const children = node.content?.map((child, i) => <NodeView key={`${key}-${i}`} node={child} />) ?? node.text;
  const href = node.marks?.find((m) => m.type === "link")?.attrs?.href;
  let wrapped: React.ReactNode = children;
  if (node.marks?.some((m) => m.type === "bold")) wrapped = <strong>{wrapped}</strong>;
  if (node.marks?.some((m) => m.type === "italic")) wrapped = <em>{wrapped}</em>;
  if (typeof href === "string" && href) {
    wrapped = (
      <a href={href} rel="noreferrer" target={href.startsWith("http") ? "_blank" : undefined}>
        {wrapped}
      </a>
    );
  }
  return wrapped;
}

function NodeView({ node }: { node: TiptapNode }) {
  const children = node.content?.map((child, i) => <NodeView key={i} node={child} />);
  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "paragraph":
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

export function RichText({ value, className }: { value: unknown; className?: string }) {
  if (typeof value === "string") {
    return (
      <div className={className ?? "vr-rich"}>
        {value.split("\n").map((line, i) => (
          <p key={i}>{line || "\u00a0"}</p>
        ))}
      </div>
    );
  }
  if (!isTiptapDoc(value)) return null;
  return (
    <div className={className ?? "vr-rich"}>
      <NodeView node={value} />
    </div>
  );
}
