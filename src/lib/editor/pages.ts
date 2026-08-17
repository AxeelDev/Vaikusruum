export function hrefToSlug(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) return null;
  if (/^https?:/i.test(trimmed) && !trimmed.includes("vaikusruum")) {
    try {
      const url = new URL(trimmed);
      if (url.origin !== "https://vaikusruum.ee" && url.origin !== "http://localhost:3000") return null;
      return pathToSlug(url.pathname);
    } catch {
      return null;
    }
  }
  const path = trimmed.split(/[?#]/)[0];
  return pathToSlug(path);
}

function pathToSlug(path: string): string | null {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/" || clean === "") return "avaleht";
  const slug = clean.replace(/^\//, "");
  if (!slug) return "avaleht";
  return slug.split("/")[0] || null;
}

export function pageLabel(page: { nav_label: string | null; title: string }): string {
  return page.nav_label || page.title;
}
