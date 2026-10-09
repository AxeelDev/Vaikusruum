"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ContactDetails } from "@/components/public/ContactDetails";
import { LinkButtonRow } from "@/components/public/LinkButtons";
import { submitPublicForm } from "@/lib/actions/submit-form";
import type { LinkButton } from "@/lib/content/form-buttons";
import type { SiteSettings } from "@/types/content";

const noopSubscribe = () => () => {};

/** "/kontakt?teema=eratund" preselects the private-lesson topic. Read in the browser so the page can stay static. */
function useTopicFromUrl(): "private_lesson" | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => (new URLSearchParams(window.location.search).get("teema") === "eratund" ? "private_lesson" : null),
    () => null,
  );
}

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
  settings,
  showKindSelect = true,
  pageSlug,
  buttons = [],
  draft = false,
}: {
  kind?: "contact" | "registration" | "private_lesson";
  offeringId?: string;
  email?: string | null;
  social?: SiteSettings["social"];
  settings?: SiteSettings;
  showKindSelect?: boolean;
  pageSlug?: string;
  buttons?: LinkButton[];
  draft?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  // When the form appeared; submissions faster than a person could type are dropped as spam.
  const [startedAt] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [chosenKind, setSelectedKind] = useState<typeof kind | null>(null);
  const topicFromUrl = useTopicFromUrl();
  const selectedKind = chosenKind ?? (showKindSelect ? topicFromUrl : null) ?? kind;

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
      pageSlug: pageSlug || null,
      consent: formData.get("consent") === "on",
      website: formData.get("website"),
      startedAt,
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
    <div className="vr-contact-copy">
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
        {/* Hidden from people; bots that fill every field reveal themselves here. */}
        <div className="vr-hp" aria-hidden="true">
          <label>
            Veebileht
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="vr-check vr-consent">
          <input type="checkbox" name="consent" required />
          <span>
            Nõustun, et mu andmeid kasutatakse sellele sõnumile vastamiseks.{" "}
            <Link href="/privaatsus" target="_blank" className="vr-text-link">
              Privaatsusteave
            </Link>
          </span>
        </label>
        {error ? <p className="vr-form-error" role="alert">{error}</p> : null}
        <button className="vr-cta" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Saadan…" : "Saada"}
        </button>
        <LinkButtonRow buttons={buttons} draft={draft} align="start" />
      </form>
      {settings ? <ContactDetails settings={settings} /> : null}
      {!settings && email ? (
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
