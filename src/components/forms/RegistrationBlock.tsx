import { ContactForm } from "@/components/forms/ContactForm";
import { LinkButtonRow } from "@/components/public/LinkButtons";
import { EditableNode } from "@/components/site/Editable";
import type { LinkButton } from "@/lib/content/form-buttons";
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
}: {
  offering: OfferingRow;
  fallbackEmail: string | null;
  heading?: ReactNode;
  pageSlug?: string;
  buttons?: LinkButton[];
  draft?: boolean;
  editSelection?: EditorSelection;
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
            {email}
          </a>
        </p>
      ) : null}
      {showLink ? (
        <p>
          <a className="vr-cta" href={offering.registration_url!} rel="noreferrer">
            Registreeri
          </a>
        </p>
      ) : null}
    </div>
  );
}
