import { sanitizeHref } from "@/lib/content/markdown";
import type { SectionRow } from "@/types/content";

export type LinkButton = {
  label: string;
  href: string;
};

/** Built-in contact and registration forms store links on the section. Added form and button elements store them on their own field. */
export function isButtonLinksField(field?: string | null): boolean {
  if (!field) return false;
  if (field === "form" || field === "formButtons") return true;
  return field.startsWith("custom.form.") || field.startsWith("custom.buttons.");
}

export function normalizeLinkButtons(value: unknown): LinkButton[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return [{
      label: typeof record.label === "string" ? record.label : "",
      href: typeof record.href === "string" ? record.href : "",
    }];
  });
}

export function readButtonLinks(content: Record<string, unknown>, field?: string | null): LinkButton[] {
  if (!field || field === "form" || field === "formButtons") return normalizeLinkButtons(content.formButtons);
  const raw = content[field];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return normalizeLinkButtons((raw as { buttons?: unknown }).buttons);
}

export function writeButtonLinks(section: SectionRow, field: string | undefined, buttons: LinkButton[]): SectionRow {
  if (!field || field === "form" || field === "formButtons") {
    return { ...section, content: { ...section.content, formButtons: buttons } };
  }
  const current = section.content[field];
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : field.startsWith("custom.form.")
        ? { kind: "contact", submitLabel: "Saada", successText: "Aitäh." }
        : { direction: "horizontal" };
  return { ...section, content: { ...section.content, [field]: { ...base, buttons } } };
}

export function linkButtonError(href: string): string | null {
  const value = href.trim();
  if (!value) return null;
  if (sanitizeHref(value)) return null;
  return "Lisa täielik link, mis algab https://. Lehesisene aadress algab kaldkriipsuga, näiteks /kontakt.";
}

export function visibleLinkButtons(buttons: LinkButton[], draft: boolean): Array<{ label: string; href: string | null }> {
  const visible: Array<{ label: string; href: string | null }> = [];
  for (const button of buttons) {
    const href = sanitizeHref(button.href);
    const label = button.label.trim();
    if (href) {
      visible.push({ label: label || "Nupp", href });
      continue;
    }
    if (draft && (label || button.href.trim())) visible.push({ label: label || "Nupp", href: null });
  }
  return visible;
}
