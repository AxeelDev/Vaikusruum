import { describe, expect, it } from "vitest";
import { contactHeadingClass, contactHeadingTag } from "@/lib/content/headings";

describe("contact headings", () => {
  it("keeps one page h1 on /kontakt and a section heading elsewhere", () => {
    expect(contactHeadingTag("kontakt")).toBe("h1");
    expect(contactHeadingClass("kontakt")).toBe("vr-page-title");
    expect(contactHeadingTag("avaleht")).toBe("h2");
    expect(contactHeadingClass("avaleht")).toBe("vr-heading");
  });
});
