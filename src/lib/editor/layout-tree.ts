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
import type { AddableElementType } from "@/lib/editor/types";

export type LayoutMoveTarget = {
  parentId: string;
  index: number;
  placement?: "before" | "after" | "left" | "right" | "inside";
  targetNodeId?: string;
};

export const COLUMN_BALANCE_OPTIONS: Array<{ value: ColumnBalance; label: string; left: number }> = [
  { value: "40-60", label: "40 / 60", left: 40 },
  { value: "45-55", label: "45 / 55", left: 45 },
  { value: "46-54", label: "46 / 54", left: 46 },
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
  const tree = simplifyLayoutTree(getSectionLayoutTree(section));
  const ratio = tree.root.type === "columns" ? tree.root.ratio : tree.root.preferredRatio;
  const customRatio = tree.root.type === "columns" ? tree.root.customRatio : tree.root.preferredCustomRatio;
  const preferred = rememberPreferredSplit(section, tree);
  return {
    ...section,
    style: {
      ...section.style,
      layoutTree: tree,
      columnBalance: ratio && ratio !== "custom" ? ratio : preferred.columnBalance,
      columnRatio: ratio === "custom" ? customRatio ?? preferred.columnRatio ?? null : preferred.columnRatio,
      preferredColumnBalance: preferred.columnBalance,
      preferredColumnRatio: preferred.columnRatio,
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
  const inserted =
    target.placement === "left" || target.placement === "right"
      ? insertNodeBeside(tree, extracted.node, target, preferredSplitFrom(section))
      : insertNode(tree.root, extracted.node, target.parentId, target.index);
  if (!inserted) return section;

  return {
    ...section,
    style: { ...section.style, layoutTree: simplifyLayoutTree(tree) },
  };
}

export function insertLayoutElement(section: SectionRow, addType: AddableElementType, target: LayoutMoveTarget): { section: SectionRow; node: LayoutNode } {
  const tree = structuredClone(getSectionLayoutTree(section));
  const node =
    addType === "container"
      ? group(`${sectionNodePrefix(section)}.container.${crypto.randomUUID()}`, "Konteiner", [])
      : createElementNode(section, addType, createElementField(addType));
  let inserted =
    target.placement === "left" || target.placement === "right"
      ? insertNodeBeside(tree, node, target, preferredSplitFrom(section))
      : insertNode(tree.root, node, target.parentId, target.index);
  if (!inserted && target.targetNodeId) {
    const parent = findParentWithChild(tree.root, target.targetNodeId);
    if (parent) inserted = insertNode(tree.root, node, parent.parent.id, parent.index + (target.placement === "before" ? 0 : 1));
  }
  if (!inserted) {
    inserted = insertNode(tree.root, node, firstInsertableParentId(tree.root), Number.MAX_SAFE_INTEGER);
  }
  if (!inserted) {
    throw new Error(`Could not insert ${addType} into section ${section.id}`);
  }
  const field = node.type === "element" ? node.field : undefined;
  const next = {
    ...section,
    content: field ? { ...section.content, [field]: defaultElementContent(addType) } : section.content,
    style: { ...section.style, layoutTree: simplifyLayoutTree(tree) },
  };
  return { section: next, node };
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
  const fallbackRatio: ColumnBalance = section.section_type === "hero" ? "46-54" : "50-50";
  const ratio: ColumnBalance | "custom" =
    typeof section.style?.columnRatio === "number" ? "custom" : section.style?.columnBalance ?? fallbackRatio;
  const customRatio = typeof section.style?.columnRatio === "number" ? clampRatio(section.style.columnRatio) : undefined;

  if (section.section_type === "hero") {
    return {
      version: 1,
      root: columns(`${base}.columns`, "Kaks veergu", ratio, customRatio, [
        column(`${base}.left`, "Vasak pool", [
          group(`${base}.textGroup`, "Hero tekst", [
            text(`${base}.title`, "Hero pealkiri", "title"),
            text(`${base}.intro`, "Hero sissejuhatus", "intro"),
          ], "large"),
        ]),
        column(`${base}.right`, "Parem pool", [image(`${base}.image`, "Hero kujund")]),
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
      root: columns(`${base}.columns`, "Kaks veergu", ratio, customRatio, [
        column(`${base}.left`, "Vasak pool", [
          group(`${base}.offerings`, "Tundide tekst", offeringElements(section)),
        ]),
        column(`${base}.right`, "Parem pool", [image(`${base}.image`, "Tundide foto")]),
      ]),
    };
  }

  if (section.section_type === "contact" || section.section_key === "contact") {
    return {
      version: 1,
      root: columns(`${base}.columns`, "Kaks veergu", ratio, customRatio, [
        column(`${base}.left`, "Vasak pool", [
          group(`${base}.contactContent`, "Kontakti sisu", [
            text(`${base}.heading`, "Kontakti pealkiri", "heading"),
            text(`${base}.intro`, "Kontakti sissejuhatus", "intro"),
            element(`${base}.form`, "form", "Kontaktivorm"),
          ]),
        ]),
        column(`${base}.right`, "Parem pool", [image(`${base}.image`, "Kontakti foto")]),
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
      column(`${base}.left`, "Vasak pool", left),
      column(`${base}.right`, "Parem pool", right),
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

function group(id: string, label: string, children: LayoutNode[], gap: "small" | "medium" | "large" = "medium", extra: Partial<LayoutGroupNode> = {}): LayoutGroupNode {
  return { id, type: "group", label, gap, horizontalAlign: "center", textAlign: "center", children, ...extra };
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

function createElementField(addType: AddableElementType) {
  return `custom.${addType}.${crypto.randomUUID().slice(0, 8)}`;
}

function createElementNode(section: SectionRow, addType: AddableElementType, field: string): LayoutElementNode {
  const base = sectionNodePrefix(section);
  const id = `${base}.${field}`;
  switch (addType) {
    case "links":
      return element(id, "link", "Links", { field });
    case "container":
      return element(id, "text", "Konteiner", { field });
    default:
      return element(id, addType, elementLabel(addType), { field });
  }
}

function elementLabel(addType: AddableElementType) {
  switch (addType) {
    case "text":
      return "Text";
    case "list":
      return "List";
    case "image":
      return "Image";
    case "buttons":
      return "Buttons";
    case "video":
      return "Video";
    case "links":
      return "Links";
    case "audio":
      return "Audio";
    case "icons":
      return "Icons";
    case "gallery":
      return "Gallery";
    case "table":
      return "Table";
    case "timer":
      return "Timer";
    case "divider":
      return "Divider";
    case "slideshow":
      return "Slideshow";
    case "form":
      return "Form";
    case "widget":
      return "Widget";
    case "embed":
      return "Embed";
    case "control":
      return "Control";
    case "container":
      return "Container";
  }
}

function defaultElementContent(addType: AddableElementType): unknown {
  switch (addType) {
    case "text":
      return "Uus tekst";
    case "list":
      return { style: "bullet", items: ["Esimene punkt", "Teine punkt"] };
    case "buttons":
      return { buttons: [{ label: "Nupp", href: "/" }], direction: "horizontal" };
    case "video":
      return { url: "", title: "", controls: true, autoplay: false, muted: true, loop: false };
    case "links":
      return { items: [{ label: "Link", href: "/" }], direction: "horizontal" };
    case "audio":
      return { url: "", title: "Audio", controls: true, loop: false };
    case "icons":
      return { items: [{ icon: "circle", label: "Ikoon", href: "" }], size: 28 };
    case "gallery":
      return { images: [], columns: 3, gap: "medium", captions: false };
    case "table":
      return { header: true, rows: [["Pealkiri", "Väärtus"], ["", ""]] };
    case "timer":
      return { label: "Aeg", target: "", completionText: "Valmis" };
    case "divider":
      return { thickness: 1, opacity: 0.35 };
    case "slideshow":
      return { images: [], duration: 5, transition: "fade", autoplay: false };
    case "form":
      return { kind: "contact", submitLabel: "Saada", successText: "Aitäh." };
    case "widget":
      return { kind: "contact", title: "Kontakt" };
    case "embed":
      return { url: "", title: "Embed" };
    case "control":
      return { kind: "anchor", label: "Anchor" };
    case "container":
      return "Uus container";
    case "image":
      return { mediaId: "", alt: "" };
  }
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

function firstInsertableParentId(node: LayoutNode): string {
  if (node.type === "group" || node.type === "column") return node.id;
  if (node.type === "columns") return node.columns[0].id;
  return node.id;
}

function findParentWithChild(
  parent: LayoutNode,
  childId: string,
): { parent: LayoutColumnNode | LayoutGroupNode; index: number } | null {
  if (parent.type === "column" || parent.type === "group") {
    const index = parent.children.findIndex((child) => child.id === childId);
    if (index >= 0) return { parent, index };
    for (const child of parent.children) {
      const match = findParentWithChild(child, childId);
      if (match) return match;
    }
  }
  if (parent.type === "columns") {
    for (const columnNode of parent.columns) {
      const match = findParentWithChild(columnNode, childId);
      if (match) return match;
    }
  }
  return null;
}

function insertNodeBeside(
  tree: SectionLayoutTree,
  node: LayoutNode,
  target: LayoutMoveTarget,
  preferred: { ratio: ColumnBalance | "custom"; customRatio?: number },
): boolean {
  const targetNodeId = target.targetNodeId;
  if (!targetNodeId || targetNodeId === node.id) return false;
  const match = findParentWithChild(tree.root, targetNodeId);
  if (!match) return false;
  const placement = target.placement === "left" ? "left" : "right";

  const reused = reuseExistingColumns(tree.root, targetNodeId, node, placement);
  if (reused) return true;

  const restored = restorePreferredColumns(match.parent, match.index, node, placement, preferred);
  if (restored) return true;

  const [targetNode] = match.parent.children.splice(match.index, 1);
  const leftChildren = placement === "left" ? [node] : [targetNode];
  const rightChildren = placement === "left" ? [targetNode] : [node];
  const wrapper = columns(`${targetNodeId}.columns.${crypto.randomUUID().slice(0, 8)}`, "Kaks veergu", preferred.ratio, preferred.customRatio, [
    column(`${targetNodeId}.left.${crypto.randomUUID().slice(0, 6)}`, "Vasak pool", leftChildren),
    column(`${targetNodeId}.right.${crypto.randomUUID().slice(0, 6)}`, "Parem pool", rightChildren),
  ]);
  match.parent.children.splice(match.index, 0, wrapper);
  return true;
}

function reuseExistingColumns(
  root: LayoutNode,
  targetNodeId: string,
  node: LayoutNode,
  placement: "left" | "right",
): boolean {
  const owner = findColumnsOwner(root, targetNodeId);
  if (!owner) return false;
  const [left, right] = owner.columns;
  const inLeft = Boolean(findLayoutNode(left, targetNodeId));
  const inRight = Boolean(findLayoutNode(right, targetNodeId));
  if (placement === "right" && inLeft) {
    right.children.push(node);
    return true;
  }
  if (placement === "left" && inRight) {
    left.children.push(node);
    return true;
  }
  if (placement === "left" && inLeft && right.children.length === 0) {
    const match = findParentWithChild(left, targetNodeId);
    if (!match) return false;
    const [targetNode] = match.parent.children.splice(match.index, 1);
    match.parent.children.splice(match.index, 0, node);
    right.children.push(targetNode);
    return true;
  }
  if (placement === "right" && inRight && left.children.length === 0) {
    const match = findParentWithChild(right, targetNodeId);
    if (!match) return false;
    const [targetNode] = match.parent.children.splice(match.index, 1);
    match.parent.children.splice(match.index, 0, node);
    left.children.push(targetNode);
    return true;
  }
  return false;
}

function restorePreferredColumns(
  parent: LayoutColumnNode | LayoutGroupNode,
  index: number,
  node: LayoutNode,
  placement: "left" | "right",
  preferred: { ratio: ColumnBalance | "custom"; customRatio?: number },
): boolean {
  if (parent.type !== "group") return false;
  const targetNode = parent.children[index];
  if (!targetNode) return false;
  if (parent.preferredRatio || parent.ephemeral) {
    const leftChildren = placement === "left" ? [node] : [targetNode];
    const rightChildren = placement === "left" ? [targetNode] : [node];
    parent.children.splice(index, 1, columns(
      `${parent.id}.columns`,
      "Kaks veergu",
      parent.preferredRatio ?? preferred.ratio,
      parent.preferredCustomRatio ?? preferred.customRatio,
      [
        column(`${parent.id}.left`, "Vasak pool", leftChildren),
        column(`${parent.id}.right`, "Parem pool", rightChildren),
      ],
    ));
    return true;
  }
  return false;
}

function findColumnsOwner(node: LayoutNode, childId: string): LayoutColumnsNode | null {
  if (node.type === "columns") {
    if (node.columns.some((columnNode) => columnNode.id === childId || findLayoutNode(columnNode, childId))) {
      return node;
    }
    for (const columnNode of node.columns) {
      const nested = findColumnsOwner(columnNode, childId);
      if (nested) return nested;
    }
  }
  if (node.type === "column" || node.type === "group") {
    for (const child of node.children) {
      const nested = findColumnsOwner(child, childId);
      if (nested) return nested;
    }
  }
  return null;
}

function preferredSplitFrom(section: SectionRow): { ratio: ColumnBalance | "custom"; customRatio?: number } {
  if (typeof section.style?.preferredColumnRatio === "number") {
    return { ratio: "custom", customRatio: clampRatio(section.style.preferredColumnRatio) };
  }
  if (section.style?.preferredColumnBalance) return { ratio: section.style.preferredColumnBalance };
  if (typeof section.style?.columnRatio === "number") return { ratio: "custom", customRatio: clampRatio(section.style.columnRatio) };
  return { ratio: section.style?.columnBalance ?? (section.section_type === "hero" ? "46-54" : "50-50") };
}

function rememberPreferredSplit(section: SectionRow, tree: SectionLayoutTree): { columnBalance?: ColumnBalance; columnRatio: number | null } {
  if (tree.root.type === "columns") {
    if (tree.root.ratio === "custom") return { columnBalance: undefined, columnRatio: tree.root.customRatio ?? section.style?.preferredColumnRatio ?? 50 };
    return { columnBalance: tree.root.ratio ?? "50-50", columnRatio: null };
  }
  if (tree.root.preferredRatio === "custom") {
    return { columnBalance: undefined, columnRatio: tree.root.preferredCustomRatio ?? section.style?.preferredColumnRatio ?? 50 };
  }
  return {
    columnBalance: tree.root.preferredRatio ?? section.style?.preferredColumnBalance ?? section.style?.columnBalance,
    columnRatio: section.style?.preferredColumnRatio ?? section.style?.columnRatio ?? null,
  };
}

function simplifyLayoutTree(tree: SectionLayoutTree): SectionLayoutTree {
  return { ...tree, root: simplifyNode(tree.root) as SectionLayoutTree["root"] };
}

function simplifyNode(node: LayoutNode): LayoutNode {
  if (node.type === "columns") {
    const left = { ...node.columns[0], children: flattenChildren(node.columns[0].children.map(simplifyNode)) };
    const right = { ...node.columns[1], children: flattenChildren(node.columns[1].children.map(simplifyNode)) };
    const promoted = flattenNestedColumns(node, left, right);
    if (promoted) return simplifyNode(promoted);
    const nonEmpty = [left, right].filter((columnNode) => columnNode.children.length > 0);
    if (nonEmpty.length === 1) {
      return group(`${node.id}.collapsed`, nonEmpty[0].label, nonEmpty[0].children, "medium", {
        ephemeral: true,
        preferredRatio: node.ratio,
        preferredCustomRatio: node.customRatio,
      });
    }
    return { ...node, columns: [left, right] };
  }
  if (node.type === "column" || node.type === "group") {
    const children = flattenChildren(node.children.map(simplifyNode));
    if (node.type === "group" && node.ephemeral && children.length === 1 && children[0].type === "columns") {
      return children[0];
    }
    if (node.type === "group" && node.ephemeral && children.length === 1 && children[0].type === "group") {
      return children[0];
    }
    return { ...node, children };
  }
  return node;
}

function flattenChildren(children: LayoutNode[]): LayoutNode[] {
  return children.flatMap((child) => {
    if (child.type === "group" && child.ephemeral && child.children.length === 1) {
      const only = child.children[0];
      if (only.type === "group" || only.type === "columns") return [only];
    }
    return [child];
  });
}

function flattenNestedColumns(
  outer: LayoutColumnsNode,
  left: LayoutColumnNode,
  right: LayoutColumnNode,
): LayoutNode | null {
  const leftOnly = left.children.length === 1 ? left.children[0] : null;
  const rightOnly = right.children.length === 1 ? right.children[0] : null;
  if (leftOnly?.type === "columns" && right.children.length === 0) return leftOnly;
  if (rightOnly?.type === "columns" && left.children.length === 0) return rightOnly;
  if (leftOnly?.type === "columns" && right.children.length === 0) return leftOnly;
  void outer;
  return null;
}

export function listLayoutElements(section: SectionRow): LayoutElementNode[] {
  const found: LayoutElementNode[] = [];
  const walk = (node: LayoutNode) => {
    if (node.type === "element") found.push(node);
    if (node.type === "columns") node.columns.forEach(walk);
    if (node.type === "column" || node.type === "group") node.children.forEach(walk);
  };
  walk(getSectionLayoutTree(section).root);
  return found;
}

export function parentOfNode(section: SectionRow, nodeId: string): { parent: LayoutColumnNode | LayoutGroupNode; index: number } | null {
  return findParentWithChild(getSectionLayoutTree(section).root, nodeId);
}

export function resolveLayoutNodeId(section: SectionRow, selection: { id: string; type?: string; field?: string; layoutNodeId?: string }): string | null {
  const tree = getSectionLayoutTree(section);
  if (selection.layoutNodeId && findLayoutNode(tree.root, selection.layoutNodeId)) return selection.layoutNodeId;
  if (selection.id && findLayoutNode(tree.root, selection.id)) return selection.id;
  const elements = listLayoutElements(section);
  if (selection.field) {
    const byField = elements.find((node) => node.field === selection.field);
    if (byField) return byField.id;
  }
  if (selection.type === "image") {
    const image = elements.find((node) => node.elementType === "image");
    if (image) return image.id;
  }
  return null;
}

export function removeLayoutNode(section: SectionRow, nodeId: string): SectionRow {
  const tree = structuredClone(getSectionLayoutTree(section));
  if (tree.root.id === nodeId) return section;
  const extracted = removeNode(tree.root, nodeId);
  if (!extracted) return section;
  const field = extracted.node.type === "element" ? extracted.node.field : undefined;
  const nextContent = { ...section.content };
  const nextFieldStyles = { ...section.style?.fieldStyles };
  if (field?.startsWith("custom.")) {
    delete nextContent[field];
    delete nextFieldStyles[field];
  }
  return normalizeSectionLayout({
    ...section,
    content: nextContent,
    style: {
      ...section.style,
      fieldStyles: nextFieldStyles,
      layoutTree: simplifyLayoutTree(tree),
    },
  });
}
