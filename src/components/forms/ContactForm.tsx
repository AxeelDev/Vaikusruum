"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { FormEdit } from "@/components/forms/form-edit";
import { ContactDetails } from "@/components/public/ContactDetails";
import { LinkButtonRow } from "@/components/public/LinkButtons";
import { submitPublicForm } from "@/lib/actions/submit-form";
import type { LinkButton } from "@/lib/content/form-buttons";
import { FORM_COPY_DEFAULTS, HIDEABLE_READ_ALOUD, type FormCopy } from "@/lib/content/form-copy";
import { UNSURE_KEY, findLessonOption, resolveLessonParam, type LessonOption } from "@/lib/content/lesson-options";
import type { SiteSettings } from "@/types/content";

const noopSubscribe = () => () => {};

/**
 * "/kontakt?teema=eratund" preselects the private-lesson topic and "&tund=<key>" the class.
 * Read in the browser so the page can stay static.
 */
function useUrlChoice(): { topic: "private_lesson" | null; lesson: string | null } {
  const search = useSyncExternalStore(
    noopSubscribe,
    () => window.location.search,
    () => "",
  );
  return useMemo(() => {
    const params = new URLSearchParams(search);
    const lesson = params.get("tund");
    return { topic: params.get("teema") === "eratund" || lesson ? "private_lesson" : null, lesson };
  }, [search]);
}

const KIND_CHOICES = [
  { value: "contact", copy: "formKindContact" },
  { value: "private_lesson", copy: "formKindLesson" },
] as const;

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
  lessonOptions = [],
  copy = FORM_COPY_DEFAULTS,
  edit,
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
  /** Every class a visitor can ask about; see buildLessonOptions. */
  lessonOptions?: LessonOption[];
  /** The texts around the fields; defaults when not given. */
  copy?: FormCopy;
  /** Set in the editor only: makes every text clickable and editable. */
  edit?: FormEdit;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  // When the form appeared; submissions faster than a person could type are dropped as spam.
  const [startedAt] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [chosenKind, setSelectedKind] = useState<typeof kind | null>(null);
  const [chosenLesson, setChosenLesson] = useState<string | null>(null);
  const fromUrl = useUrlChoice();
  const selectedKind = chosenKind ?? (showKindSelect ? fromUrl.topic : null) ?? kind;
  // In the editor the class list always shows, so its texts can be reached before "Registreerumine" is chosen.
  const askClass = showKindSelect && (selectedKind === "private_lesson" || Boolean(edit)) && lessonOptions.length > 1;
  const classOnlyInEditor = Boolean(edit) && selectedKind !== "private_lesson";
  const text = (key: keyof FormCopy): ReactNode => {
    const value = copy[key];
    // A cleared label is hidden from visitors; fields and groups keep their name for screen readers.
    if (!value) {
      if (edit) return edit.copy(key, FORM_COPY_DEFAULTS[key], true);
      return HIDEABLE_READ_ALOUD.includes(key) ? <span className="vr-sr-only">{FORM_COPY_DEFAULTS[key]}</span> : null;
    }
    return edit ? edit.copy(key, value) : value;
  };
  // The "not sure yet" choice shows the section's own wording; the others are the class names.
  const optionLabel = (option: LessonOption) => {
    if (option.key === UNSURE_KEY) return text("formUnsure");
    return edit ? edit.option(option, option.label) : option.label;
  };
  // Without a choice, "Pole veel kindel" stands; a class named in the link is picked when it exists.
  const selectedLesson =
    findLessonOption(lessonOptions, chosenLesson)?.key ?? resolveLessonParam(lessonOptions, fromUrl.lesson)?.key ?? UNSURE_KEY;

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
      lesson: askClass && selectedKind === "private_lesson" ? formData.get("lesson") : null,
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
    return <p className="vr-form-success">{copy.formSuccess}</p>;
  }

  return (
    <div className="vr-contact-copy">
      <form className="vr-form" action={onSubmit}>
        {showKindSelect ? (
          <fieldset className="vr-choice-group">
            <legend>{text("formKindLabel")}</legend>
            <div className="vr-choices">
              {KIND_CHOICES.map((choice) => (
                <label key={choice.value} className="vr-choice">
                  <input
                    type="radio"
                    name="kind"
                    value={choice.value}
                    checked={selectedKind === choice.value}
                    onChange={() => setSelectedKind(choice.value)}
                  />
                  <span className="vr-choice-face">{text(choice.copy)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {askClass ? (
          <fieldset
            className={["vr-choice-group", classOnlyInEditor ? "vr-editor-hidden" : ""].filter(Boolean).join(" ")}
            title={classOnlyInEditor ? `Külastaja näeb seda, kui valib „${copy.formKindLesson}“` : undefined}
          >
            <legend>{text("formClassLabel")}</legend>
            <div className="vr-choice-list">
              {lessonOptions.map((option) => (
                <label key={option.key} className="vr-choice-row">
                  <input
                    type="radio"
                    name="lesson"
                    value={option.key}
                    checked={selectedLesson === option.key}
                    onChange={() => setChosenLesson(option.key)}
                  />
                  <span>{optionLabel(option)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <label className="vr-field">
          {text("formName")}
          <input name="name" autoComplete="name" required />
        </label>
        <label className="vr-field">
          {text("formEmail")}
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="vr-field">
          {text("formPhone")}
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
        {kind === "registration" ? (
          <label className="vr-field">
            {text("formDate")}
            <input name="preferredDate" />
          </label>
        ) : null}
        <label className="vr-field">
          {text("formMessage")}
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
            {text("formConsent")}{" "}
            <Link href="/privaatsus" target="_blank" className="vr-text-link">
              {text("formPrivacyLink")}
            </Link>
          </span>
        </label>
        {error ? <p className="vr-form-error" role="alert">{error}</p> : null}
        <button className="vr-cta" type="submit" disabled={status === "sending"}>
          {status === "sending" ? copy.formSending : text("formSubmit")}
        </button>
        <LinkButtonRow buttons={buttons} draft={draft} align="start" />
      </form>
      {settings ? <ContactDetails settings={settings} copy={copy} edit={edit} /> : null}
      {!settings && email ? (
        <p className="vr-muted vr-contact-email">
          {text("formWriteLabel")} <a href={`mailto:${email}`}>{edit ? edit.email(email) : email}</a>
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
