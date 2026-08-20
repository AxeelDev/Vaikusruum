import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMarkdown, sanitizeHref, resolveMarkdownColor } from "@/lib/content/markdown";

function html(source: string) {
  return renderToStaticMarkup(createElement("div", null, renderMarkdown(source)));
}

describe("markdown", () => {
  it("renders bold, italic, strike, and code", () => {
    expect(html("**Bold**")).toContain("<strong>Bold</strong>");
    expect(html("*Italic*")).toContain("<em>Italic</em>");
    expect(html("~~Strike~~")).toContain("<s>Strike</s>");
    expect(html("`Code`")).toContain("<code");
  });

  it("rejects javascript links", () => {
    expect(sanitizeHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeHref("https://vaikusruum.ee")).toBe("https://vaikusruum.ee");
    expect(html("[x](javascript:alert(1))")).not.toContain("javascript:");
  });

  it("colors named and hex text without treating them as urls", () => {
    expect(resolveMarkdownColor("red")).toBe("#c45c4a");
    expect(resolveMarkdownColor("#d48342")).toBe("#d48342");
    expect(html("[soe](#d48342)")).toContain("color:#d48342");
    expect(html("[soe](#d48342)")).not.toContain("<a ");
  });
});
