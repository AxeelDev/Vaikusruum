import type { SiteSettings } from "@/types/content";

function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("372")) return `tel:+${digits}`;
  return `tel:+372${digits}`;
}

export function ContactDetails({ settings }: { settings: SiteSettings }) {
  const email = settings.contact_email?.trim() || "";
  const phone = settings.contact_phone?.trim() || "";
  const name = settings.contact_name?.trim() || "";
  const company = settings.company_name?.trim() || "";
  const registry = settings.registry_code?.trim() || "";
  const iban = settings.iban?.trim() || "";
  const bank = settings.bank?.trim() || "";
  const hasPersonal = Boolean(name || email || phone);
  const hasCompany = Boolean(company || registry || iban || bank);
  if (!hasPersonal && !hasCompany) return null;

  return (
    <div className="vr-contact-details">
      {hasPersonal ? (
        <address className="vr-contact-personal">
          {name ? <p className="vr-contact-name">{name}</p> : null}
          {email ? (
            <p>
              <a href={`mailto:${email}`}>{email}</a>
            </p>
          ) : null}
          {phone ? (
            <p>
              <a href={phoneHref(phone)}>{phone}</a>
            </p>
          ) : null}
        </address>
      ) : null}
      {hasCompany ? (
        <div className="vr-contact-company">
          {company ? <p>{company}</p> : null}
          {registry ? (
            <p>
              <span className="vr-contact-label">Registrikood</span> {registry}
            </p>
          ) : null}
          {iban ? (
            <p>
              <span className="vr-contact-label">Arvelduskonto</span>{" "}
              <span className="vr-iban">{iban}</span>
            </p>
          ) : null}
          {bank ? <p>{bank}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
