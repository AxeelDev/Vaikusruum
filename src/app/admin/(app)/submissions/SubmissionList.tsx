"use client";

import { useState } from "react";
import { deleteSubmissionAction } from "@/lib/actions/admin";

const KIND_LABEL: Record<string, string> = {
  contact: "Üldine küsimus",
  private_lesson: "Eratund",
  registration: "Registreerumine",
};

const PREVIEW_LIMIT = 280;

export type SubmissionCard = {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  preferred_date: string | null;
  created_at: string;
  pageLabel: string;
};

export function SubmissionList({ rows }: { rows: SubmissionCard[] }) {
  if (!rows.length) {
    return (
      <div className="vr-submissions">
        <p className="vr-admin-note">Sõnumeid veel ei ole.</p>
      </div>
    );
  }

  return (
    <div className="vr-submissions">
      {rows.map((row) => (
        <article key={row.id} className="vr-submission-card">
          <header className="vr-submission-head">
            <h2 className="vr-submission-name">{row.name}</h2>
            <form action={async () => { await deleteSubmissionAction(row.id); }}>
              <button type="submit">Eemalda</button>
            </form>
          </header>
          <div className="vr-submission-meta">
            <span className="vr-submission-page">{row.pageLabel}</span>
            <span>{KIND_LABEL[row.kind] ?? row.kind}</span>
            <time dateTime={row.created_at}>
              {new Date(row.created_at).toLocaleString("et-EE")}
            </time>
          </div>
          <div className="vr-submission-fields">
            <SubmissionField label="E-post" value={row.email} />
            <SubmissionField label="Telefon" value={row.phone} />
            <SubmissionField label="Eelistatud kuupäev" value={row.preferred_date} />
            <SubmissionField label="Sõnum" value={row.message} />
          </div>
        </article>
      ))}
    </div>
  );
}

function SubmissionField({ label, value }: { label: string; value: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!value) return null;
  const long = value.length > PREVIEW_LIMIT;
  const shown = !long || expanded ? value : `${value.slice(0, PREVIEW_LIMIT).trimEnd()}…`;

  return (
    <div className="vr-submission-field">
      <span className="vr-submission-field-label">{label}</span>
      <p>{shown}</p>
      {long ? (
        <button type="button" className="vr-submission-more" onClick={() => setExpanded((open) => !open)}>
          {expanded ? "Näita vähem" : "Loe rohkem"}
        </button>
      ) : null}
    </div>
  );
}
