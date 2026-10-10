import type { ReactNode } from "react";
import type { FormEdit } from "@/components/forms/form-edit";
import { FORM_COPY_DEFAULTS, type FormCopy } from "@/lib/content/form-copy";
import type { SiteSettings } from "@/types/content";

function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("372")) return `tel:+${digits}`;
  return `tel:+372${digits}`;
}

const PLACEHOLDER = {
  contact_name: "Nimi",
  contact_email: "E-post",
  contact_phone: "Telefon",
  company_name: "Ettevõte",
  registry_code: "Registrikood",
  iban: "Arvelduskonto number",
  bank: "Pank",
} as const;

export function ContactDetails({
  settings,
  copy = FORM_COPY_DEFAULTS,
  edit,
}: {
  settings: SiteSettings;
  copy?: Pick<FormCopy, "contactRegistryLabel" | "contactIbanLabel">;
  /** In the editor every line is shown and clickable, even an empty one. */
  edit?: Pick<FormEdit, "copy" | "setting">;
}) {
  const value = (key: keyof typeof PLACEHOLDER) => (settings[key] ?? "").trim();
  const email = value("contact_email");
  const phone = value("contact_phone");
  const name = value("contact_name");
  const company = value("company_name");
  const registry = value("registry_code");
  const iban = value("iban");
  const bank = value("bank");
  const editing = Boolean(edit);
  const hasPersonal = Boolean(name || email || phone);
  const hasCompany = Boolean(company || registry || iban || bank);
  if (!editing && !hasPersonal && !hasCompany) return null;

  // A line that is empty is left out for visitors; in the editor it stays, dimmed, so it can still be filled in.
  const show = (text: string) => editing || Boolean(text);
  const dim = (text: string) => (editing && !text ? "vr-editor-hidden" : undefined);
  const cell = (key: keyof typeof PLACEHOLDER, text: string) => (edit ? edit.setting(key, text || PLACEHOLDER[key]) : text);
  // A label cleared in the editor is left out for visitors; in the editor it stays, dimmed, to be filled in again.
  const label = (key: "contactRegistryLabel" | "contactIbanLabel"): ReactNode => {
    const text = copy[key];
    if (!text) return edit ? <span className="vr-contact-label">{edit.copy(key, FORM_COPY_DEFAULTS[key], true)}</span> : null;
    return <span className="vr-contact-label">{edit ? edit.copy(key, text) : text}</span>;
  };

  return (
    <div className="vr-contact-details">
      {editing || hasPersonal ? (
        <address className="vr-contact-personal">
          {show(name) ? <p className={["vr-contact-name", dim(name)].filter(Boolean).join(" ")}>{cell("contact_name", name)}</p> : null}
          {show(email) ? (
            <p className={dim(email)}>{email ? <a href={`mailto:${email}`}>{cell("contact_email", email)}</a> : cell("contact_email", email)}</p>
          ) : null}
          {show(phone) ? (
            <p className={dim(phone)}>{phone ? <a href={phoneHref(phone)}>{cell("contact_phone", phone)}</a> : cell("contact_phone", phone)}</p>
          ) : null}
        </address>
      ) : null}
      {editing || hasCompany ? (
        <div className="vr-contact-company">
          {show(company) ? <p className={dim(company)}>{cell("company_name", company)}</p> : null}
          {show(registry) ? (
            <p className={dim(registry)}>
              {label("contactRegistryLabel")} {cell("registry_code", registry)}
            </p>
          ) : null}
          {show(iban) ? (
            <p className={dim(iban)}>
              {label("contactIbanLabel")} <span className="vr-iban">{cell("iban", iban)}</span>
            </p>
          ) : null}
          {show(bank) ? <p className={dim(bank)}>{cell("bank", bank)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
