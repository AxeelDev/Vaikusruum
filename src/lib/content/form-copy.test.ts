import { describe, expect, it } from "vitest";
import { FORM_COPY_DEFAULTS, FORM_COPY_LABELS, isContactSettingKey, isFormCopyKey, readFormCopy, readFormCopyValue } from "@/lib/content/form-copy";
import { defaultFieldText, readEditorContent, textSelection } from "@/lib/editor/content-binding";
import type { EditorDraft } from "@/lib/editor/types";
import type { SectionRow } from "@/types/content";

const section = (content: Record<string, unknown>): SectionRow => ({
  id: "s1",
  page_id: "p1",
  section_key: "contact",
  section_type: "contact",
  sort_order: 1,
  enabled: true,
  content,
  style: {},
  created_at: "",
  updated_at: "",
});

function draft(content: Record<string, unknown> = {}): EditorDraft {
  return {
    pages: [
      { id: "p1", slug: "kontakt", title: "Kontakt", nav_label: null },
      { id: "p2", slug: "privaatsus", title: "Privaatsus", nav_label: "Privaatsuspoliitika" },
    ],
    sectionsByPage: { p1: [section(content)] },
    offerings: {},
    eventsByOffering: {},
    media: {},
    settings: { id: 1, site_name: "Vaikusruum", contact_name: "Miina", contact_email: "m@example.com", iban: "EE12", social: {} },
    theme: {},
    customCss: "",
    deletedSectionIds: [],
  } as unknown as EditorDraft;
}

describe("form copy", () => {
  it("falls back to the default when nothing, or only blanks, is saved", () => {
    expect(readFormCopyValue({}, "formName")).toBe("Nimi");
    expect(readFormCopyValue({ formName: "   " }, "formName")).toBe("Nimi");
    expect(readFormCopyValue({ formName: "Su nimi" }, "formName")).toBe("Su nimi");
    expect(readFormCopy({ formSubmit: "Saada ära" }).formSubmit).toBe("Saada ära");
    expect(readFormCopy({}).formSuccess).toBe(FORM_COPY_DEFAULTS.formSuccess);
  });

  it("names every text in the editor", () => {
    for (const key of Object.keys(FORM_COPY_DEFAULTS)) expect(FORM_COPY_LABELS[key as keyof typeof FORM_COPY_LABELS]).toBeTruthy();
    expect(isFormCopyKey("formName")).toBe(true);
    expect(isFormCopyKey("body")).toBe(false);
    expect(isContactSettingKey("iban")).toBe(true);
    expect(isContactSettingKey("site_name")).toBe(false);
  });
});

describe("editing the texts around a form", () => {
  it("binds a form label to the section and shows the saved text, even a cleared one", () => {
    const selection = textSelection("kontakt", section({}), "formName");
    const empty = readEditorContent(draft(), selection);
    expect(empty).toMatchObject({ format: "plain", value: "Nimi", label: "Nime väli", path: { kind: "section-content", sectionId: "s1", key: "formName" } });
    const cleared = readEditorContent(draft({ formName: "" }), selection);
    expect(cleared.format === "plain" && cleared.value).toBe("");
    expect(defaultFieldText("formName", "contact")).toBe("Nimi");
  });

  it("binds a contact detail to the site settings", () => {
    const content = readEditorContent(draft(), { id: "settings.contact_name", type: "text", field: "contact_name" });
    expect(content).toMatchObject({ format: "plain", value: "Miina", path: { kind: "settings", key: "contact_name" } });
    const empty = readEditorContent(draft(), { id: "settings.bank", type: "text", field: "bank" });
    expect(empty).toMatchObject({ format: "plain", value: "", path: { kind: "settings", key: "bank" } });
  });

  it("binds the footer privacy link to the privacy page's menu label", () => {
    const content = readEditorContent(draft(), { id: "footer.privacy", type: "text", field: "nav_label", navSlug: "privaatsus" });
    expect(content).toMatchObject({ format: "plain", value: "Privaatsuspoliitika", path: { kind: "nav-label", pageId: "p2" } });
  });
});
