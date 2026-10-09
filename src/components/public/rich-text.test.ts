import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichText } from "@/components/public/RichText";
import type { TiptapNode } from "@/types/content";

const URL = "https://www.ajakirimuusika.ee/jooga-kui-keha-hinge-ja-meele-liit/";

function render(content: TiptapNode[]) {
  return renderToStaticMarkup(createElement(RichText, { value: { type: "doc", content } }));
}

const p = (text?: string, marks?: TiptapNode["marks"]): TiptapNode =>
  text === undefined ? { type: "paragraph" } : { type: "paragraph", content: [{ type: "text", text, marks }] };

describe("RichText", () => {
  it("keeps blank lines between paragraphs as spacing", () => {
    const html = render([p("Loe veel:"), p(), p(), p("2008-2016 EMTA")]);
    expect(html.match(/vr-rich-blank/g)).toHaveLength(2);
    expect(html.indexOf("vr-rich-blank")).toBeGreaterThan(html.indexOf("Loe veel:"));
  });

  it("drops trailing blank lines", () => {
    const html = render([p("Viimane rida"), p(), p(), p()]);
    expect(html).not.toContain("vr-rich-blank");
  });

  it("links a URL whose link mark has no address", () => {
    const html = render([p(URL, [{ type: "link" }])]);
    expect(html).toContain(`<a href="${URL}"`);
    expect(html).toContain('target="_blank"');
  });

  it("keeps an explicit link address", () => {
    const html = render([p("Muusika", [{ type: "link", attrs: { href: URL } }])]);
    expect(html).toContain(`<a href="${URL}"`);
    expect(html).toContain(">Muusika</a>");
  });

  it("turns a bare URL in plain text into a link without swallowing punctuation", () => {
    const html = render([p(`Loe siit: ${URL}.`)]);
    expect(html).toContain(`<a href="${URL}"`);
    expect(html).toContain("</a>.");
  });

  it("leaves a link mark on ordinary words unlinked when it has no address", () => {
    const html = render([p("ajakirjast", [{ type: "link" }])]);
    expect(html).not.toContain("<a");
  });
});
