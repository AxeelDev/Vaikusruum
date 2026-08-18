import type { LayoutNode, SectionRow } from "@/types/content";

export function semanticSectionName(section: SectionRow, slug = ""): string {
  if (section.section_key === "hero") return "Hero";
  if (section.section_key === "miina") return "Tutvustus";
  if (section.section_key === "yoga") return "Jooga tutvustus";
  if (section.section_key === "offerings") return "Tunnid";
  if (section.section_key === "contact") return "Kontakt";
  if (slug === "minust" && section.section_key === "bio") return "Minust";
  const heading = section.content.heading || section.content.title || section.content.label;
  if (typeof heading === "string" && heading.trim() && section.section_type !== "hero") {
    return heading.trim().slice(0, 34);
  }
  switch (section.section_type) {
    case "hero":
      return "Hero";
    case "split_media_text":
      return "Pilt ja tekst";
    case "offering_overview":
      return "Tunnid";
    case "private_lessons":
      return "Eratunnid";
    case "faq":
      return "Küsimused ja vastused";
    case "important_info":
      return "Head teada";
    case "contact":
      return "Kontakt";
    case "testimonials":
      return "Tagasiside";
    case "rich_text":
      return "Tekst";
    case "spacer":
      return "Vahe";
    default:
      return "Sektsioon";
  }
}

export function imageLabel(section: SectionRow, slug = ""): string {
  if (section.section_key === "hero") return "Hero kujund";
  if (section.section_key === "miina") return "Tutvustuse foto";
  if (section.section_key === "yoga") return "Jooga foto";
  if (section.section_key === "offerings") return "Tundide foto";
  if (section.section_key === "contact") return "Kontakti foto";
  if (slug === "minust" && section.section_key === "bio") return "Portree";
  return "Pilt";
}

export function clientLayoutLabel(
  section: SectionRow,
  node: Pick<LayoutNode, "id" | "label"> & { type?: string; elementType?: string },
  slug = "",
): string {
  if (node.type === "section" || node.id.startsWith("section.")) return semanticSectionName(section, slug);
  if (node.id.includes(".right") || /right column/i.test(node.label) || node.label === "Right column") {
    return "Parem pool";
  }
  if (node.type === "column" || /left column/i.test(node.label) || node.id.includes(".left") || node.label === "Left column") {
    return "Vasak pool";
  }
  if (node.type === "columns") return "Kaks veergu";
  if (node.elementType === "image" || node.label.toLowerCase().includes("foto") || node.label.toLowerCase().includes("kujund") || node.label.toLowerCase().includes("pilt") || node.label.toLowerCase().includes("artwork") || node.label.toLowerCase().includes("image")) {
    if (node.elementType === "image") return imageLabel(section, slug);
  }
  if (node.label === "Hero title" || node.id.endsWith(".title")) {
    return section.section_type === "hero" ? "Hero pealkiri" : "Pealkiri";
  }
  if (node.label === "Hero introduction" || node.id.endsWith(".intro")) {
    return section.section_type === "hero" ? "Hero sissejuhatus" : "Sissejuhatus";
  }
  if (node.label === "Hero text group") return "Hero tekst";
  if (node.label === "Left column") return "Vasak pool";
  if (node.label === "Right column") return "Parem pool";
  if (node.label === "Hero columns" || node.label === "Columns") return "Kaks veergu";
  if (node.label === "Content group") return "Sisu";
  return node.label;
}
