"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { saveSiteSettingsAction } from "@/lib/actions/admin";
import type { SiteSettings } from "@/types/content";

type Social = SiteSettings["social"];

function payload(row: SiteSettings) {
  const text = (value: string | null | undefined) => value?.trim() || null;
  return {
    site_name: row.site_name.trim(),
    contact_name: text(row.contact_name),
    contact_email: text(row.contact_email),
    contact_phone: text(row.contact_phone),
    company_name: text(row.company_name),
    registry_code: text(row.registry_code),
    iban: text(row.iban),
    bank: text(row.bank),
    default_registration_email: text(row.default_registration_email),
    footer_text: text(row.footer_text),
    social: {
      instagram: text(row.social.instagram),
      facebook: text(row.social.facebook),
      pinterest: text(row.social.pinterest),
      youtube: text(row.social.youtube),
    },
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_LIKE = /^https?:\/\/\S+\.\S+/;

function validate(row: SiteSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!row.site_name.trim()) errors.site_name = "Saidi nimi on kohustuslik.";
  if (row.contact_email?.trim() && !EMAIL.test(row.contact_email.trim())) errors.contact_email = "Kontrolli e-posti aadressi.";
  if (row.default_registration_email?.trim() && !EMAIL.test(row.default_registration_email.trim()))
    errors.default_registration_email = "Kontrolli e-posti aadressi.";
  for (const key of ["instagram", "facebook", "pinterest", "youtube"] as const) {
    const value = row.social[key]?.trim();
    if (value && !URL_LIKE.test(value)) errors[`social.${key}`] = "Lisa täielik link, mis algab https://";
  }
  return errors;
}

export function ContactSettings({ settings }: { settings: SiteSettings }) {
  const [saved, setSaved] = useState(settings);
  const [row, setRow] = useState(settings);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const dirty = useMemo(() => JSON.stringify(payload(row)) !== JSON.stringify(payload(saved)), [row, saved]);
  const errors = useMemo(() => validate(row), [row]);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setRow((current) => ({ ...current, [key]: value }));
    setStatus(null);
  }

  function setSocial(key: keyof Social, value: string) {
    setRow((current) => ({ ...current, social: { ...current.social, [key]: value } }));
    setStatus(null);
  }

  async function save() {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      setStatus({ tone: "error", text: "Paranda märgitud väljad." });
      return;
    }
    setSaving(true);
    const result = await saveSiteSettingsAction(payload(row));
    setSaving(false);
    if (result && "error" in result && result.error) {
      setStatus({ tone: "error", text: result.error });
      return;
    }
    setSaved(row);
    setShowErrors(false);
    setStatus({ tone: "ok", text: "Salvestatud." });
  }

  const error = (key: string) => (showErrors ? errors[key] : undefined);

  return (
    <>
      <SettingsCard title="Üldine" description="Nimi ja jalus, mis kuvatakse igal lehel.">
        <Field label="Saidi nimi" error={error("site_name")}>
          <input value={row.site_name} onChange={(e) => set("site_name", e.target.value)} />
        </Field>
        <Field label="Jaluse tekst">
          <input value={row.footer_text ?? ""} onChange={(e) => set("footer_text", e.target.value)} />
        </Field>
      </SettingsCard>

      <SettingsCard title="Kontakt" description="Kuvatakse kontaktilehel ja kontaktisektsioonis.">
        <div className="vr-admin-grid-2">
          <Field label="Nimi">
            <input value={row.contact_name ?? ""} autoComplete="name" onChange={(e) => set("contact_name", e.target.value)} />
          </Field>
          <Field label="Telefon">
            <input value={row.contact_phone ?? ""} type="tel" inputMode="tel" autoComplete="tel" onChange={(e) => set("contact_phone", e.target.value)} />
          </Field>
        </div>
        <Field label="E-post" error={error("contact_email")}>
          <input value={row.contact_email ?? ""} type="email" inputMode="email" autoComplete="email" onChange={(e) => set("contact_email", e.target.value)} />
        </Field>
      </SettingsCard>

      <SettingsCard title="Registreerimine" description="Kuhu saadetakse vormi kaudu tulnud registreerumised, kui tunnil pole oma aadressi.">
        <Field label="Registreerumiste e-post" error={error("default_registration_email")}>
          <input
            value={row.default_registration_email ?? ""}
            type="email"
            inputMode="email"
            placeholder={row.contact_email ?? ""}
            onChange={(e) => set("default_registration_email", e.target.value)}
          />
        </Field>
      </SettingsCard>

      <SettingsCard title="Ettevõte ja maksmine" description="Arveldusandmed tasakaalu maksmiseks.">
        <div className="vr-admin-grid-2">
          <Field label="Ettevõte">
            <input value={row.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} />
          </Field>
          <Field label="Registrikood">
            <input value={row.registry_code ?? ""} inputMode="numeric" onChange={(e) => set("registry_code", e.target.value)} />
          </Field>
          <Field label="Arvelduskonto (IBAN)">
            <input value={row.iban ?? ""} autoCapitalize="characters" spellCheck={false} onChange={(e) => set("iban", e.target.value)} />
          </Field>
          <Field label="Pank">
            <input value={row.bank ?? ""} onChange={(e) => set("bank", e.target.value)} />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title="Sotsiaalmeedia" description="Täielikud lingid profiilidele. Tühjad väljad jäetakse lehelt välja.">
        <div className="vr-admin-grid-2">
          {(["instagram", "facebook", "youtube", "pinterest"] as const).map((key) => (
            <Field key={key} label={key === "youtube" ? "YouTube" : key[0].toUpperCase() + key.slice(1)} error={error(`social.${key}`)}>
              <input
                value={row.social[key] ?? ""}
                type="url"
                inputMode="url"
                placeholder="https://"
                spellCheck={false}
                onChange={(e) => setSocial(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </SettingsCard>

      <div className="vr-admin-savebar" data-visible={dirty || status ? "true" : undefined}>
        <span role="status" aria-live="polite" data-tone={status?.tone}>
          {status?.text ?? (dirty ? "Salvestamata muudatused" : "")}
        </span>
        <div className="vr-admin-savebar-actions">
          {dirty ? (
            <button
              type="button"
              className="vr-admin-btn vr-admin-btn--ghost"
              disabled={saving}
              onClick={() => {
                setRow(saved);
                setShowErrors(false);
                setStatus(null);
              }}
            >
              Tühista
            </button>
          ) : null}
          <button type="button" className="vr-admin-btn vr-admin-btn--primary" disabled={!dirty || saving} onClick={save}>
            {saving ? "Salvestan…" : "Salvesta"}
          </button>
        </div>
      </div>
    </>
  );
}

export function SettingsCard({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="vr-admin-settings-section">
      <header className="vr-admin-settings-head">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="vr-admin-settings-body">{children}</div>
    </section>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="vr-admin-field" data-invalid={error ? "true" : undefined}>
      <span className="vr-admin-field-label">{label}</span>
      {children}
      {error ? <span className="vr-admin-field-error">{error}</span> : hint ? <span className="vr-admin-field-hint">{hint}</span> : null}
    </label>
  );
}
