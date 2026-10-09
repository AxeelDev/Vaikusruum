import { ContactForm } from "@/components/forms/ContactForm";
import type { FormEdit } from "@/components/forms/form-edit";
import { LinkButtonRow } from "@/components/public/LinkButtons";
import { EditableNode } from "@/components/site/Editable";
import type { LinkButton } from "@/lib/content/form-buttons";
import { FORM_COPY_DEFAULTS, type FormCopy } from "@/lib/content/form-copy";
import type { EditorSelection } from "@/lib/editor/types";
import type { OfferingRow } from "@/types/content";
import type { ReactNode } from "react";

export function RegistrationBlock({
  offering,
  fallbackEmail,
  heading,
  pageSlug,
  buttons = [],
  draft = false,
  editSelection,
  copy = FORM_COPY_DEFAULTS,
  edit,
}: {
  offering: OfferingRow;
  fallbackEmail: string | null;
  heading?: ReactNode;
  pageSlug?: string;
  buttons?: LinkButton[];
  draft?: boolean;
  editSelection?: EditorSelection;
  copy?: FormCopy;
  /** Set in the editor only: makes the form's texts clickable and editable. */
  edit?: FormEdit;
}) {
  const mode = offering.registration_mode;
  if (mode === "disabled") return null;

  const email = offering.registration_email || fallbackEmail;
  const showForm = mode === "form" || mode === "form_and_email";
  const showEmail = (mode === "email" || mode === "form_and_email") && email;
  const showLink = mode === "external_link" && offering.registration_url;

  const form = showForm ? (
    <ContactForm
      kind="registration"
      offeringId={offering.id}
      showKindSelect={false}
      email={showEmail ? email : null}
      pageSlug={pageSlug}
      buttons={buttons}
      draft={draft}
      copy={copy}
      edit={edit}
    />
  ) : buttons.length ? (
    <LinkButtonRow buttons={buttons} draft={draft} align="start" />
  ) : null;

  if (!form && !showEmail && !showLink) return null;

  return (
    <div>
      {heading ?? <h2 className="vr-heading">Registreeri tundi</h2>}
      {form && editSelection ? <EditableNode selection={editSelection}>{form}</EditableNode> : form}
      {!showForm && showEmail ? (
        <p>
          <a className="vr-cta" href={`mailto:${email}`}>
            {edit ? edit.email(email!) : email}
          </a>
        </p>
      ) : null}
      {showLink ? (
        <p>
          <a className="vr-cta" href={offering.registration_url!} rel="noreferrer">
            {edit ? edit.copy("registerCta", copy.registerCta) : copy.registerCta}
          </a>
        </p>
      ) : null}
    </div>
  );
}
