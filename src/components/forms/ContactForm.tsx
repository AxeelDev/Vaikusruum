"use client";

import { useMemo, useState } from "react";
import { submitPublicForm } from "@/lib/actions/submit-form";
import type { SiteSettings } from "@/types/content";

const KIND_LABEL = {
  contact: "Üldine küsimus",
  private_lesson: "Eratund",
  registration: "Registreerumine",
} as const;

export function ContactForm({
  kind = "contact",
  offeringId,
  email,
  social,
  showKindSelect = true,
}: {
  kind?: "contact" | "registration" | "private_lesson";
  offeringId?: string;
  email?: string | null;
  social?: SiteSettings["social"];
  showKindSelect?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState("");
  const [selectedKind, setSelectedKind] = useState(kind);

  const links = useMemo(() => {
    const entries: Array<[string, string]> = [];
    if (social?.instagram) entries.push(["Instagram", social.instagram]);
    if (social?.facebook) entries.push(["Facebook", social.facebook]);
    if (social?.pinterest) entries.push(["Pinterest", social.pinterest]);
    if (social?.youtube) entries.push(["YouTube", social.youtube]);
    return entries;
  }, [social]);

  async function onSubmit(formData: FormData) {
    setStatus("sending");
    setError("");
    const result = await submitPublicForm({
      kind: showKindSelect ? formData.get("kind") : kind,
      offeringId: offeringId || null,
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") || null,
      message: formData.get("message") || null,
      preferredDate: formData.get("preferredDate") || null,
      consent: formData.get("consent") === "on",
    });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setStatus("ok");
  }

  if (status === "ok") {
    return <p className="vr-form-success">Aitäh. Sõnum on kohale jõudnud.</p>;
  }

  return (
    <div>
      <form className="vr-form" action={onSubmit}>
        {showKindSelect ? (
          <label className="vr-field">
            Teema
            <select name="kind" value={selectedKind} onChange={(e) => setSelectedKind(e.target.value as typeof kind)}>
              <option value="contact">{KIND_LABEL.contact}</option>
              <option value="private_lesson">{KIND_LABEL.private_lesson}</option>
            </select>
          </label>
        ) : null}
        <label className="vr-field">
          Nimi
          <input name="name" autoComplete="name" required />
        </label>
        <label className="vr-field">
          E-post
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="vr-field">
          Telefon
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
        {kind === "registration" ? (
          <label className="vr-field">
            Eelistatud kuupäev
            <input name="preferredDate" />
          </label>
        ) : null}
        <label className="vr-field">
          Sõnum
          <textarea name="message" />
        </label>
        <label className="vr-check">
          <input name="consent" type="checkbox" required />
          <span>Nõustun, et minu andmeid kasutatakse vastamiseks.</span>
        </label>
        {error ? <p className="vr-form-error">{error}</p> : null}
        <button className="vr-cta" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Saadan…" : "Saada"}
        </button>
      </form>
      {email ? (
        <p className="vr-muted vr-contact-email">
          Või kirjuta: <a href={`mailto:${email}`}>{email}</a>
        </p>
      ) : null}
      {links.length > 0 ? (
        <div className="vr-social">
          {links.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
              {label.slice(0, 1)}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
