import { describe, expect, it } from "vitest";
import { withUniqueIds } from "@/lib/editor/layout-tree";
import type { SectionLayoutTree } from "@/types/content";

const offering = (n: number) => ({ id: `layout.s.offering.${n}`, type: "element", label: `Tund ${n}`, elementType: "offering", offeringId: `o${n}` });

function ids(tree: SectionLayoutTree) {
  const out: string[] = [];
  const walk = (node: { id: string; children?: unknown[]; columns?: unknown[] }) => {
    out.push(node.id);
    for (const child of [...(node.children ?? []), ...(node.columns ?? [])]) walk(child as typeof node);
  };
  walk(tree.root as never);
  return out;
}

describe("withUniqueIds", () => {
  it("merges a group that only wraps a group with the same id (as saved on the home page)", () => {
    const tree = {
      version: 1,
      root: {
        id: "layout.s.offerings", type: "group", label: "Tundide tekst", gap: "large",
        children: [{ id: "layout.s.offerings", type: "group", label: "Tundide tekst", gap: "medium", textAlign: "center", children: [offering(1), offering(2)] }],
      },
    } as unknown as SectionLayoutTree;
    const fixed = withUniqueIds(tree);
    expect(ids(fixed)).toEqual(["layout.s.offerings", "layout.s.offering.1", "layout.s.offering.2"]);
    expect((fixed.root as { textAlign?: string }).textAlign).toBe("center");
  });

  it("renames other repeated ids and leaves clean trees untouched", () => {
    const dup = { version: 1, root: { id: "r", type: "group", label: "", children: [offering(1), offering(1)] } } as unknown as SectionLayoutTree;
    expect(ids(withUniqueIds(dup))).toEqual(["r", "layout.s.offering.1", "layout.s.offering.1.2"]);
    const clean = { version: 1, root: { id: "r", type: "group", label: "", children: [offering(1)] } } as unknown as SectionLayoutTree;
    expect(withUniqueIds(clean)).toBe(clean);
  });
});
