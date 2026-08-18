import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { getSectionLayoutTree, ratioToLeftPercent } from "@/lib/editor/layout-tree";
import type { ColumnBalance, HeightPreset, SectionRow, VerticalAlign } from "@/types/content";

const SCREEN_KEYS = new Set(["hero", "miina", "yoga", "offerings", "contact"]);

export function resolveHeight(section: SectionRow): HeightPreset {
  const height = section.style?.height;
  if (height === "screen" || height === "large" || height === "auto") return height;
  if (section.style?.minHeight === "viewport" || section.section_type === "hero") return "screen";
  if (section.style?.minHeight === "compact") return "large";
  if (section.style?.minHeight === "none") return "auto";
  if (SCREEN_KEYS.has(section.section_key)) return "screen";
  return "auto";
}

export function resolveVerticalAlign(section: SectionRow): VerticalAlign {
  const value = section.style?.verticalAlign;
  if (value === "start" || value === "center" || value === "end") return value;
  return "center";
}

const COLUMN_BALANCES: ColumnBalance[] = ["40-60", "45-55", "46-54", "50-50", "55-45", "60-40"];

export function resolveColumnBalance(section: SectionRow): ColumnBalance {
  const tree = getSectionLayoutTree(section);
  if (tree.root.type === "columns" && tree.root.ratio && tree.root.ratio !== "custom") return tree.root.ratio;
  const value = section.style?.columnBalance;
  if (value && COLUMN_BALANCES.includes(value)) return value;
  return section.section_type === "hero" ? "46-54" : "50-50";
}

export function sectionClassName(section: SectionRow, extra = ""): string {
  const height = resolveHeight(section);
  const align = resolveVerticalAlign(section);
  const bg = section.style?.background;
  const parts = ["vr-section", "vr-screen-section", `vr-screen-section--${height}`, `vr-screen-section--${align}`];
  if (bg === "warm") parts.push("vr-section--warm");
  if (bg === "soft") parts.push("vr-section--soft");
  if (section.section_type === "hero") parts.push("vr-section--hero");
  if (extra) parts.push(extra);
  return parts.join(" ");
}

export function splitClassName(section: SectionRow, hasMedia: boolean): string {
  const layout = section.style?.layout;
  const mobile = section.style?.mobileOrder;
  const tree = getSectionLayoutTree(section);
  const custom = tree.root.type === "columns" && tree.root.ratio === "custom";
  const parts = ["vr-split", custom ? "vr-split--custom" : `vr-split--${resolveColumnBalance(section)}`];
  const align = resolveVerticalAlign(section);
  if (align === "start") parts.push("vr-split--start");
  if (align === "end") parts.push("vr-split--end");
  if (layout === "image-right" || (!layout && hasMedia && section.section_type !== "hero")) {
    parts.push("vr-split--image-right");
  }
  if (mobile === "text-first") parts.push("vr-split--text-first");
  return parts.join(" ");
}

export function sectionPaddingStyle(section: SectionRow): CSSProperties {
  const style: CSSProperties = {};
  if (typeof section.style?.topSpace === "number") style.paddingTop = section.style.topSpace;
  if (typeof section.style?.bottomSpace === "number") style.paddingBottom = section.style.bottomSpace;
  if (typeof section.style?.contentWidth === "number") {
    (style as Record<string, string>)["--vr-content-width"] = `${section.style.contentWidth}px`;
  }
  return style;
}

export function ScreenSection({
  section,
  children,
  className,
  style,
  ...rest
}: {
  section: SectionRow;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={sectionClassName(section, className)}
      style={{ ...sectionPaddingStyle(section), ...style }}
      {...rest}
    >
      {children}
    </section>
  );
}

export function SectionInner({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={["vr-section-inner", className].filter(Boolean).join(" ")} style={style}>
      {children}
    </div>
  );
}

export function SplitLayout({
  section,
  hasMedia,
  children,
  className,
  ...rest
}: {
  section: SectionRow;
  hasMedia: boolean;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const tree = getSectionLayoutTree(section);
  const style: CSSProperties = {};
  if (typeof section.style?.splitGap === "number") style.gap = `${section.style.splitGap}px`;
  if (tree.root.type === "columns") {
    const left = ratioToLeftPercent(tree.root.ratio, tree.root.customRatio ?? section.style?.columnRatio);
    const vars = style as Record<string, string>;
    vars["--vr-left-column"] = `${left}%`;
    vars["--vr-right-column"] = `${100 - left}%`;
    vars["--vr-left-ratio"] = `${left / 100}fr`;
    vars["--vr-right-ratio"] = `${(100 - left) / 100}fr`;
  }
  return (
    <div className={[splitClassName(section, hasMedia), className].filter(Boolean).join(" ")} style={style} {...rest}>
      {children}
    </div>
  );
}

export function CenteredText({
  children,
  className,
  align,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <div className={["vr-centered-text", className].filter(Boolean).join(" ")} style={{ textAlign: align }}>
      {children}
    </div>
  );
}

export function ReadingColumn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["vr-reading vr-body", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function MediaFrame({
  children,
  crop,
  width,
  radius,
  align,
}: {
  children: ReactNode;
  crop?: "original" | "landscape" | "portrait" | "square";
  width?: number;
  radius?: number;
  align?: "left" | "right" | "center";
}) {
  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  return (
    <div
      className="vr-media-frame"
      style={{
        display: "flex",
        justifyContent: justify,
        width: width ? `${width}%` : "100%",
        marginInline: align === "left" ? 0 : align === "right" ? "0 0 auto" : "auto",
        maxWidth: "100%",
      }}
    >
      <div style={{ width: "100%", borderRadius: radius, overflow: radius ? "hidden" : undefined }} data-crop={crop}>
        {children}
      </div>
    </div>
  );
}
