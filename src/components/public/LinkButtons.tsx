import Link from "next/link";
import { visibleLinkButtons, type LinkButton } from "@/lib/content/form-buttons";

export function LinkButtonRow({
  buttons,
  draft = false,
  direction = "horizontal",
  align = "center",
}: {
  buttons: LinkButton[];
  draft?: boolean;
  direction?: "horizontal" | "vertical";
  align?: "start" | "center";
}) {
  const items = visibleLinkButtons(buttons, draft);
  if (!items.length) return null;
  const className = [
    "vr-button-group",
    `vr-button-group--${direction === "vertical" ? "vertical" : "horizontal"}`,
    align === "start" ? "vr-form-links" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={className}>
      {items.map((item, index) => {
        const key = `${item.label}-${item.href ?? "draft"}-${index}`;
        if (!item.href) return <span key={key} className="vr-cta">{item.label}</span>;
        if (/^https?:\/\//i.test(item.href)) {
          return (
            <a key={key} className="vr-cta" href={item.href} target="_blank" rel="noreferrer">
              {item.label}
            </a>
          );
        }
        if (item.href.startsWith("mailto:") || item.href.startsWith("tel:")) {
          return (
            <a key={key} className="vr-cta" href={item.href}>
              {item.label}
            </a>
          );
        }
        return (
          <Link key={key} className="vr-cta" href={item.href}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
