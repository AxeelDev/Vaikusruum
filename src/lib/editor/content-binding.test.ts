import { describe, expect, it } from "vitest";
import { textSelection } from "@/lib/editor/content-binding";
import type { SectionRow } from "@/types/content";

const section: SectionRow = {
  id: "s1",
  page_id: "p1",
  section_key: "miina",
  section_type: "split_media_text",
  sort_order: 1,
  enabled: true,
  content: {},
  style: {},
  created_at: "",
  updated_at: "",
};

describe("textSelection", () => {
  it("defaults to a text selection", () => {
    const selection = textSelection("avaleht", section, "plain");
    expect(selection).toMatchObject({ id: "avaleht.miina.plain", type: "text", sectionId: "s1", field: "plain" });
  });

  it("keeps the text type when an optional type is passed as undefined", () => {
    const selection = textSelection("avaleht", section, "plain", { type: undefined });
    expect(selection.type).toBe("text");
    expect(selection.sectionId).toBe("s1");
  });

  it("lets an explicit type win", () => {
    expect(textSelection("avaleht", section, "label", { type: "link" }).type).toBe("link");
  });

  it("includes the offering id in the generated id", () => {
    const selection = textSelection("avaleht", section, "short_title", { offeringId: "o1" });
    expect(selection.id).toBe("avaleht.miina.o1.short_title");
  });
});
