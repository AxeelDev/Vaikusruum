"use client";

import { useState } from "react";
import { saveSiteSettingsAction } from "@/lib/actions/admin";
import type { SiteSettings } from "@/types/content";

export function ContactSettings({ settings }: { settings: SiteSettings }) {
  const [row, setRow] = useState(settings);
  const [message, setMessage] = useState("");

  async function save() {
    const result = await saveSiteSettingsAction({
      site_name: row.site_name,
      contact_email: row.contact_email || null,
      contact_phone: row.contact_phone || null,
      default_registration_email: row.default_registration_email || null,
      footer_text: row.footer_text || null,
      social: {
        instagram: row.social.instagram || null,
        facebook: row.social.facebook || null,
        pinterest: row.social.pinterest || null,
        youtube: row.social.youtube || null,
      },
    });
    setMessage(result && "error" in result ? result.error! : "Salvestatud.");
  }

  return (
    <div className="vr-admin-panel">
      <h1 className="vr-admin-title">Seaded</h1>
      <section className="vr-admin-section">
        <h2>Üldine</h2>
        <label className="vr-field">
          Saidi nimi
          <input value={row.site_name} onChange={(e) => setRow({ ...row, site_name: e.target.value })} />
        </label>
        <label className="vr-field">
          Jaluse tekst
          <input value={row.footer_text ?? ""} onChange={(e) => setRow({ ...row, footer_text: e.target.value })} />
        </label>
      </section>
      <section className="vr-admin-section">
        <h2>Kontakt</h2>
      <label className="vr-field">
        E-post
        <input value={row.contact_email ?? ""} onChange={(e) => setRow({ ...row, contact_email: e.target.value })} />
      </label>
      <label className="vr-field">
        Telefon
        <input value={row.contact_phone ?? ""} onChange={(e) => setRow({ ...row, contact_phone: e.target.value })} />
      </label>
      </section>
      <section className="vr-admin-section">
        <h2>Registreerimine</h2>
      <label className="vr-field">
        Vaikimisi registreerimise e-post
        <input
          value={row.default_registration_email ?? ""}
          onChange={(e) => setRow({ ...row, default_registration_email: e.target.value })}
        />
      </label>
      </section>
      <section className="vr-admin-section">
        <h2>Sotsiaalmeedia</h2>
      <label className="vr-field">
        Instagram
        <input
          value={row.social.instagram ?? ""}
          onChange={(e) => setRow({ ...row, social: { ...row.social, instagram: e.target.value } })}
        />
      </label>
      <label className="vr-field">
        Facebook
        <input
          value={row.social.facebook ?? ""}
          onChange={(e) => setRow({ ...row, social: { ...row.social, facebook: e.target.value } })}
        />
      </label>
      <label className="vr-field">
        Pinterest
        <input
          value={row.social.pinterest ?? ""}
          onChange={(e) => setRow({ ...row, social: { ...row.social, pinterest: e.target.value } })}
        />
      </label>
      <label className="vr-field">
        YouTube
        <input
          value={row.social.youtube ?? ""}
          onChange={(e) => setRow({ ...row, social: { ...row.social, youtube: e.target.value } })}
        />
      </label>
      </section>
      <section className="vr-admin-section">
        <h2>SEO</h2>
        <p className="vr-admin-note">Lehepõhiseid SEO välju muudetakse visuaalses editoris lehe seadete all.</p>
      </section>
      <div className="vr-admin-actions">
        <button className="vr-cta" type="button" onClick={save}>
          Salvesta
        </button>
        {message ? <span>{message}</span> : null}
      </div>
    </div>
  );
}
