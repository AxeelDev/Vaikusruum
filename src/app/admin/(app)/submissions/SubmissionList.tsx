"use client";

import { useMemo, useState } from "react";
import { ConfirmButton } from "@/components/admin/AdminShell";
import { deleteSubmissionAction } from "@/lib/actions/admin";

const KIND_LABEL: Record<string, string> = {
  contact: "Üldine küsimus",
  private_lesson: "Eratund",
  registration: "Registreerumine",
};

const FILTERS = [
  { id: "all", label: "Kõik" },
  { id: "registration", label: "Registreerumised" },
  { id: "private_lesson", label: "Eratunnid" },
  { id: "contact", label: "Küsimused" },
] as const;

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

export function SubmissionList({ rows: initial }: { rows: SubmissionCard[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [error, setError] = useState("");
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: rows.length };
    for (const row of rows) map[row.kind] = (map[row.kind] ?? 0) + 1;
    return map;
  }, [rows]);
  const visible = filter === "all" ? rows : rows.filter((row) => row.kind === filter);

  if (!rows.length) {
    return (
      <p className="vr-admin-empty">Sõnumeid veel ei ole. Uued vastused ilmuvad siia kohe pärast saatmist.</p>
    );
  }

  return (
    <>
      <div className="vr-admin-chips" role="tablist" aria-label="Filtreeri">
        {FILTERS.filter((item) => item.id === "all" || counts[item.id]).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className="vr-admin-chip"
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span>{counts[item.id] ?? 0}</span>
          </button>
        ))}
      </div>
      {error ? (
        <p className="vr-admin-inline-status" role="alert" data-tone="error">
          {error}
        </p>
      ) : null}
      <div className="vr-submissions">
        {visible.map((row) => (
          <article key={row.id} className="vr-submission-card">
            <header className="vr-submission-head">
              <div>
                <h2 className="vr-submission-name">{row.name}</h2>
                <div className="vr-submission-meta">
                  <span>
                    {KIND_LABEL[row.kind] ?? row.kind}
                  </span>
                  <span>{row.pageLabel}</span>
                  <time dateTime={row.created_at}>
                    {new Date(row.created_at).toLocaleString("et-EE", { timeZone: "Europe/Tallinn", dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </div>
              </div>
              <ConfirmButton
                label="Kustuta"
                confirmLabel="Kustuta"
                question="Kustutada see sõnum?"
                onConfirm={async () => {
                  const result = await deleteSubmissionAction(row.id);
                  if (result && "error" in result && result.error) setError(result.error);
                  else setRows((current) => current.filter((item) => item.id !== row.id));
                }}
              />
            </header>
            <dl className="vr-submission-fields">
              <SubmissionField label="E-post" value={row.email} href={`mailto:${row.email}`} />
              <SubmissionField label="Telefon" value={row.phone} href={row.phone ? `tel:${row.phone.replace(/\s+/g, "")}` : undefined} />
              <SubmissionField label="Eelistatud aeg" value={row.preferred_date} />
              <SubmissionField label="Sõnum" value={row.message} wide />
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}

function SubmissionField({ label, value, href, wide }: { label: string; value: string | null; href?: string; wide?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (!value) return null;
  const long = value.length > PREVIEW_LIMIT;
  const shown = !long || expanded ? value : `${value.slice(0, PREVIEW_LIMIT).trimEnd()}…`;

  return (
    <div className="vr-submission-field" data-wide={wide ? "true" : undefined}>
      <dt className="vr-submission-field-label">{label}</dt>
      <dd>
        {href ? <a href={href}>{shown}</a> : <p>{shown}</p>}
        {long ? (
          <button type="button" className="vr-admin-link-button" onClick={() => setExpanded((open) => !open)}>
            {expanded ? "Näita vähem" : "Loe rohkem"}
          </button>
        ) : null}
      </dd>
    </div>
  );
}
