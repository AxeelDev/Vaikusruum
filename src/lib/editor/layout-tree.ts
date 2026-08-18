import type {
  ColumnBalance,
  LayoutColumnNode,
  LayoutColumnsNode,
  LayoutElementNode,
  LayoutGroupNode,
  LayoutNode,
  SectionLayoutTree,
  SectionRow,
} from "@/types/content";

export type LayoutMoveTarget = {
  parentId: string;
  index: number;
};

export const COLUMN_BALANCE_OPTIONS: Array<{ value: ColumnBalance; label: string; left: number }> = [
  { value: "40-60", label: "40 / 60", left: 40 },
  { value: "45-55", label: "45 / 55", left: 45 },
  { value: "50-50", label: "50 / 50", left: 50 },
  { value: "55-45", label: "55 / 45", left: 55 },
  { value: "60-40", label: "60 / 40", left: 60 },
];

export function ratioToLeftPercent(ratio?: ColumnBalance | "custom", customRatio?: number | null): number {
  if (ratio === "custom" && typeof customRatio === "number") return clampRatio(customRatio);
  return COLUMN_BALANCE_OPTIONS.find((item) => item.value === ratio)?.left ?? 50;
}

export function leftPercentToBalance(left: number): { columnBalance: ColumnBalance | undefined; columnRatio: number | null } {
  const clamped = clampRatio(left);
  const preset = COLUMN_BALANCE_OPTIONS.find((item) => Math.abs(item.left - clamped) <= 1);
  if (preset) return { columnBalance: preset.value, columnRatio: null };
  return { columnBalance: undefined, columnRatio: clamped };
}

export function clampRatio(value: number, min = 30, max = 70): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function getSectionLayoutTree(section: SectionRow): SectionLayoutTree {
  const existing = section.style?.layoutTree;
  if (isLayoutTree(existing)) return existing;
  return defaultLayoutTree(section);
}

export function normalizeSectionLayout(section: SectionRow): SectionRow {
  const tree = getSectionLayoutTree(section);
  const ratio = tree.root.type === "columns" ? tree.root.ratio : undefined;
  const customRatio = tree.root.type === "columns" ? tree.root.customRatio : undefined;
  return {
    ...section,
    style: {
      ...section.style,
      layoutTree: tree,
      columnBalance: ratio && ratio !== "custom" ? ratio : section.style?.columnBalance,
      columnRatio: ratio === "custom" ? customRatio ?? section.style?.columnRatio ?? null : null,
    },
  };
}

export function layoutNodeLabel(section: SectionRow, nodeId: string): string {
  const node = findLayoutNode(getSectionLayoutTree(section).root, nodeId);
  return node?.label ?? nodeId;
}

export function findLayoutNode(node: LayoutNode, nodeId: string): LayoutNode | null {
  if (node.id === nodeId) return node;
  if (node.type === "columns") {
    for (const column of node.columns) {
      const match = findLayoutNode(column, nodeId);
      if (match) return match;
    }
  }
  if (node.type === "column" || node.type === "group") {
    for (const child of node.children) {
      const match = findLayoutNode(child, nodeId);
      if (match) return match;
    }
  }
  return null;
}

export function moveLayoutNode(section: SectionRow, nodeId: string, target: LayoutMoveTarget): SectionRow {
  const tree = structuredClone(getSectionLayoutTree(section));
  if (tree.root.id === nodeId) return section;

  const extracted = removeNode(tree.root, nodeId);
  if (!extracted) return section;
  const inserted = insertNode(tree.root, extracted.node, target.parentId, target.index);
  if (!inserted) return section;

  return {
    ...section,
    style: { ...section.style, layoutTree: tree },
  };
}

export function resizeLayoutColumns(section: SectionRow, leftPercent: number): SectionRow {
  const tree = structuredClone(getSectionLayoutTree(section));
  if (tree.root.type !== "columns") return section;
  const left = clampRatio(leftPercent);
  const { columnBalance, columnRatio } = leftPercentToBalance(left);
  tree.root.ratio = columnBalance ?? "custom";
  tree.root.customRatio = columnBalance ? undefined : left;
  return {
    ...section,
    style: {
      ...section.style,
      layoutTree: tree,
      columnBalance,
      columnRatio,
    },
  };
}

export function sectionLayoutSummary(section: SectionRow): string {
  const tree = getSectionLayoutTree(section);
  if (tree.root.type !== "columns") return "Üks grupp";
  const left = ratioToLeftPercent(tree.root.ratio, tree.root.customRatio ?? section.style?.columnRatio);
  return `${left} / ${100 - left}`;
}

export function defaultLayoutTree(section: SectionRow): SectionLayoutTree {
  const base = sectionNodePrefix(section);
  const ratio: ColumnBalance | "custom" =
    typeof section.style?.columnRatio === "number" ? "custom" : section.style?.columnBalance ?? "50-50";
  const customRatio = typeof section.style?.columnRatio === "number" ? clampRatio(section.style.columnRatio) : undefined;

  if (section.section_type === "hero") {
    return {
      version: 1,
      root: columns(`${base}.columns`, "Hero columns", ratio, customRatio, [
        column(`${base}.left`, "Left column", [
          group(`${base}.textGroup`, "Hero text group", [
            text(`${base}.title`, "Hero title", "title"),
            text(`${base}.intro`, "Hero introduction", "intro"),
          ], "large"),
        ]),
        column(`${base}.right`, "Right column", [image(`${base}.image`, "Hero artwork")]),
      ]),
    };
  }

  if (section.section_key === "miina") {
    return splitTree(base, "Tutvustus columns", "Tutvustuse foto", "Tutvustuse tekst", section, "plain");
  }

  if (section.section_key === "yoga") {
    return splitTree(base, "Jooga tutvustus columns", "Jooga foto", "Jooga tekst", section, "body");
  }

  if (section.section_key === "offerings") {
    return {
      version: 1,
      root: columns(`${base}.columns`, "Tundide columns", ratio, customRatio, [
        column(`${base}.left`, "Tundide tekst", [
          group(`${base}.offerings`, "Tundide tekst", offeringElements(section)),
        ]),
        column(`${base}.right`, "Right column", [image(`${base}.image`, "Tundide foto")]),
      ]),
    };
  }

  if (section.section_type === "contact" || section.section_key === "contact") {
    return {
      version: 1,
      root: columns(`${base}.columns`, "Kontakt columns", ratio, customRatio, [
        column(`${base}.left`, "Kontakti sisu", [
          group(`${base}.contactContent`, "Kontakti sisu", [
            text(`${base}.heading`, "Kontakti pealkiri", "heading"),
            text(`${base}.intro`, "Kontakti sissejuhatus", "intro"),
            element(`${base}.form`, "form", "Kontaktivorm"),
          ]),
        ]),
        column(`${base}.right`, "Right column", [image(`${base}.image`, "Kontakti foto")]),
      ]),
    };
  }

  if (section.section_type === "split_media_text") {
    return splitTree(base, "Columns", "Pilt", "Tekst", section, "plain");
  }

  return {
    version: 1,
    root: group(`${base}.content`, "Content group", defaultTextElements(section)),
  };
}

function splitTree(
  base: string,
  label: string,
  imageLabel: string,
  textLabel: string,
  section: SectionRow,
  bodyField: string,
): SectionLayoutTree {
  const ratio: ColumnBalance | "custom" =
    typeof section.style?.columnRatio === "number" ? "custom" : section.style?.columnBalance ?? "50-50";
  const customRatio = typeof section.style?.columnRatio === "number" ? clampRatio(section.style.columnRatio) : undefined;
  const textChildren = defaultTextElements(section, bodyField);
  const imageNode = image(`${base}.image`, imageLabel);
  const left = section.style?.layout === "image-right" ? textChildren : [imageNode];
  const right = section.style?.layout === "image-right" ? [imageNode] : textChildren;
  return {
    version: 1,
    root: columns(`${base}.columns`, label, ratio, customRatio, [
      column(`${base}.left`, "Left column", left),
      column(`${base}.right`, "Right column", right),
    ]),
  };
}

function defaultTextElements(section: SectionRow, bodyField = "body"): LayoutNode[] {
  const items: LayoutNode[] = [];
  if (typeof section.content.heading === "string") items.push(text(sectionNodePrefix(section) + ".heading", "Pealkiri", "heading"));
  if (typeof section.content.title === "string") items.push(text(sectionNodePrefix(section) + ".title", "Pealkiri", "title"));
  if (typeof section.content.intro === "string") items.push(text(sectionNodePrefix(section) + ".intro", "Sissejuhatus", "intro"));
  if (typeof section.content.plain === "string") items.push(text(sectionNodePrefix(section) + ".plain", "Tekst", "plain"));
  if (bodyField !== "plain" && section.content[bodyField]) items.push(text(sectionNodePrefix(section) + `.${bodyField}`, "Tekst", bodyField));
  return items.length ? items : [text(sectionNodePrefix(section) + ".body", "Tekst", "body")];
}

function offeringElements(section: SectionRow): LayoutNode[] {
  const ids = Array.isArray(section.content.offeringIds) ? (section.content.offeringIds as string[]) : [];
  return ids.length
    ? ids.map((id) => element(`${sectionNodePrefix(section)}.offering.${id}`, "offering", id.includes("0001") ? "Kundalini jooga info" : "Gongi info", { offeringId: id }))
    : [element(`${sectionNodePrefix(section)}.offering.empty`, "offering", "Tunni info")];
}

function sectionNodePrefix(section: SectionRow) {
  return `layout.${section.id}`;
}

function columns(
  id: string,
  label: string,
  ratio: ColumnBalance | "custom",
  customRatio: number | undefined,
  columnNodes: [LayoutColumnNode, LayoutColumnNode],
): LayoutColumnsNode {
  return {
    id,
    type: "columns",
    label,
    ratio,
    customRatio,
    gap: "large",
    verticalAlign: "center",
    horizontalAlign: "center",
    mobile: { mode: "stack", order: "left-first" },
    columns: columnNodes,
  };
}

function column(id: string, label: string, children: LayoutNode[]): LayoutColumnNode {
  return { id, type: "column", label, horizontalAlign: "center", verticalAlign: "center", children };
}

function group(id: string, label: string, children: LayoutNode[], gap: "small" | "medium" | "large" = "medium"): LayoutGroupNode {
  return { id, type: "group", label, gap, horizontalAlign: "center", textAlign: "center", children };
}

function text(id: string, label: string, field: string): LayoutElementNode {
  return element(id, "text", label, { field });
}

function image(id: string, label: string): LayoutElementNode {
  return element(id, "image", label, { field: "image" });
}

function element(
  id: string,
  elementType: LayoutElementNode["elementType"],
  label: string,
  extra: Partial<LayoutElementNode> = {},
): LayoutElementNode {
  return { id, type: "element", elementType, label, ...extra };
}

function isLayoutTree(value: unknown): value is SectionLayoutTree {
  if (!value || typeof value !== "object") return false;
  const tree = value as Partial<SectionLayoutTree>;
  return tree.version === 1 && Boolean(tree.root);
}

function removeNode(parent: LayoutNode, nodeId: string): { node: LayoutNode } | null {
  if (parent.type === "columns") {
    for (const column of parent.columns) {
      const match = removeNode(column, nodeId);
      if (match) return match;
    }
  }
  if (parent.type !== "column" && parent.type !== "group") return null;
  const index = parent.children.findIndex((child) => child.id === nodeId);
  if (index >= 0) {
    const [node] = parent.children.splice(index, 1);
    return { node };
  }
  for (const child of parent.children) {
    const match = removeNode(child, nodeId);
    if (match) return match;
  }
  return null;
}

function insertNode(parent: LayoutNode, node: LayoutNode, parentId: string, index: number): boolean {
  if ((parent.type === "column" || parent.type === "group") && parent.id === parentId) {
    const nextIndex = Math.min(Math.max(index, 0), parent.children.length);
    parent.children.splice(nextIndex, 0, node);
    return true;
  }
  if (parent.type === "columns") {
    return parent.columns.some((columnNode) => insertNode(columnNode, node, parentId, index));
  }
  if (parent.type === "column" || parent.type === "group") {
    return parent.children.some((child) => insertNode(child, node, parentId, index));
  }
  return false;
}
