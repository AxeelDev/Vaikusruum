export function contactHeadingTag(slug: string): "h1" | "h2" {
  return slug === "kontakt" ? "h1" : "h2";
}

export function contactHeadingClass(slug: string): string {
  return slug === "kontakt" ? "vr-page-title" : "vr-heading";
}
