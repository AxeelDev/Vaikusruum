/**
 * Texts a visitor reads around a form or the contact details that no field of its own holds.
 * They live in the section's content under these keys; a missing or blank one falls back to the default,
 * so older sections keep reading as they always did.
 */
export const FORM_COPY_DEFAULTS = {
  formKindLabel: "Teema",
  formKindContact: "Küsimus",
  formKindLesson: "Eratund",
  formClassLabel: "Milline tund?",
  formUnsure: "Pole veel kindel",
  formName: "Nimi",
  formEmail: "E-post",
  formPhone: "Telefon",
  formDate: "Eelistatud kuupäev",
  formMessage: "Sõnum",
  formConsent: "Nõustun, et mu andmeid kasutatakse sellele sõnumile vastamiseks.",
  formPrivacyLink: "Privaatsusteave",
  formSubmit: "Saada",
  formSending: "Saadan…",
  formSuccess: "Aitäh. Sõnum on kohale jõudnud.",
  formWriteLabel: "Või kirjuta:",
  contactRegistryLabel: "Registrikood",
  contactIbanLabel: "Arvelduskonto",
  registerCta: "Registreeri",
} as const;

export type FormCopyKey = keyof typeof FORM_COPY_DEFAULTS;
export type FormCopy = Record<FormCopyKey, string>;

/** How each text is named in the editor; also the order of the form's text list. */
export const FORM_COPY_LABELS: Record<FormCopyKey, string> = {
  formKindLabel: "Teema silt",
  formKindContact: "Teema: küsimus",
  formKindLesson: "Teema: eratund",
  formClassLabel: "Tunni küsimus",
  formUnsure: "Tund: pole veel kindel",
  formName: "Nime väli",
  formEmail: "E-posti väli",
  formPhone: "Telefoni väli",
  formDate: "Eelistatud kuupäeva väli",
  formMessage: "Sõnumi väli",
  formConsent: "Nõusoleku tekst",
  formPrivacyLink: "Privaatsuslingi tekst",
  formSubmit: "Saatmisnupp",
  formSending: "Saatmise ajal",
  formSuccess: "Pärast saatmist",
  formWriteLabel: "Kirjutamise kutse",
  contactRegistryLabel: "Registrikoodi silt",
  contactIbanLabel: "Arvelduskonto silt",
  registerCta: "Registreerumisnupp",
};

export function isFormCopyKey(field: string | null | undefined): field is FormCopyKey {
  return Boolean(field) && Object.prototype.hasOwnProperty.call(FORM_COPY_DEFAULTS, field as string);
}

/** The saved text, or the default when none (or only blanks) was saved. */
export function readFormCopyValue(content: Record<string, unknown>, key: FormCopyKey): string {
  const raw = content[key];
  return typeof raw === "string" && raw.trim() ? raw : FORM_COPY_DEFAULTS[key];
}

export function readFormCopy(content: Record<string, unknown>): FormCopy {
  return Object.fromEntries((Object.keys(FORM_COPY_DEFAULTS) as FormCopyKey[]).map((key) => [key, readFormCopyValue(content, key)])) as FormCopy;
}

/** Site-wide contact details shown in the contact block; edited in place, saved with the site settings. */
export const CONTACT_SETTING_KEYS = ["contact_name", "contact_email", "contact_phone", "company_name", "registry_code", "iban", "bank"] as const;
export type ContactSettingKey = (typeof CONTACT_SETTING_KEYS)[number];

export const CONTACT_SETTING_LABELS: Record<ContactSettingKey, string> = {
  contact_name: "Kontaktisiku nimi",
  contact_email: "Kontakt e-post",
  contact_phone: "Kontakt telefon",
  company_name: "Ettevõtte nimi",
  registry_code: "Registrikood",
  iban: "Arvelduskonto",
  bank: "Pank",
};

export function isContactSettingKey(field: string | null | undefined): field is ContactSettingKey {
  return (CONTACT_SETTING_KEYS as readonly string[]).includes(field ?? "");
}
