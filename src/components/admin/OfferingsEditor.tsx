"use client";

import { useState } from "react";
import { createEventAction, deleteEventAction, saveEventAction, saveOfferingAction } from "@/lib/actions/admin";
import type { EventRow, OfferingRow, RegistrationMode } from "@/types/content";

const MODES: { id: RegistrationMode; label: string }[] = [
  { id: "form", label: "Ankeet" },
  { id: "email", label: "E-post" },
  { id: "form_and_email", label: "Ankeet ja e-post" },
  { id: "external_link", label: "Väline link" },
  { id: "disabled", label: "Peidetud" },
];

export function OfferingsEditor({
  offerings,
  events,
}: {
  offerings: OfferingRow[];
  events: EventRow[];
}) {
  return (
    <div className="vr-admin-panel">
      <h1 className="vr-admin-title">Tunnid</h1>
      {offerings.map((offering) => (
        <OfferingForm
          key={offering.id}
          offering={offering}
          events={events.filter((event) => event.offering_id === offering.id)}
        />
      ))}
    </div>
  );
}

function OfferingForm({ offering, events }: { offering: OfferingRow; events: EventRow[] }) {
  const [row, setRow] = useState(offering);
  const [message, setMessage] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newIso, setNewIso] = useState("");

  async function save() {
    const result = await saveOfferingAction(row.id, {
      title: row.title,
      short_title: row.short_title,
      location_name: row.location_name,
      address: row.address,
      schedule_summary: row.schedule_summary,
      tasakaal: row.tasakaal || null,
      registration_mode: row.registration_mode,
      registration_email: row.registration_email || null,
      registration_url: row.registration_url || null,
      active: row.active,
    });
    setMessage(result && "error" in result ? result.error! : "Salvestatud.");
  }

  return (
    <section>
      <h2 className="vr-heading">{offering.title}</h2>
      <label className="vr-field">
        Pealkiri
        <input value={row.title} onChange={(e) => setRow({ ...row, title: e.target.value })} />
      </label>
      <label className="vr-field">
        Toimumisaeg
        <input value={row.schedule_summary ?? ""} onChange={(e) => setRow({ ...row, schedule_summary: e.target.value })} />
      </label>
      <label className="vr-field">
        Asukoht
        <input value={row.location_name ?? ""} onChange={(e) => setRow({ ...row, location_name: e.target.value })} />
      </label>
      <label className="vr-field">
        Aadress
        <input value={row.address ?? ""} onChange={(e) => setRow({ ...row, address: e.target.value })} />
      </label>
      <label className="vr-field">
        Tasakaal
        <input value={row.tasakaal ?? ""} onChange={(e) => setRow({ ...row, tasakaal: e.target.value || null })} />
      </label>
      <label className="vr-field">
        Registreerimine
        <select
          value={row.registration_mode}
          onChange={(e) => setRow({ ...row, registration_mode: e.target.value as RegistrationMode })}
        >
          {MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      <label className="vr-field">
        Registreerimise e-post
        <input value={row.registration_email ?? ""} onChange={(e) => setRow({ ...row, registration_email: e.target.value })} />
      </label>
      <label className="vr-field">
        Väline link
        <input value={row.registration_url ?? ""} onChange={(e) => setRow({ ...row, registration_url: e.target.value })} />
      </label>
      <div className="vr-admin-actions">
        <button className="vr-cta" type="button" onClick={save}>
          Salvesta
        </button>
        {message ? <span>{message}</span> : null}
      </div>
      <h3 className="vr-heading-sm">Kuupäevad</h3>
      <ul>
        {events.map((event) => (
          <li key={event.id} style={{ marginBottom: "0.6rem" }}>
            <input
              defaultValue={event.display_date ?? ""}
              onBlur={async (e) => {
                await saveEventAction(event.id, { display_date: e.target.value || null });
              }}
            />{" "}
            <button type="button" onClick={() => deleteEventAction(event.id)}>
              Eemalda
            </button>
          </li>
        ))}
      </ul>
      <div className="vr-admin-actions">
        <input placeholder="28.09" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
        <input type="datetime-local" value={newIso} onChange={(e) => setNewIso(e.target.value)} />
        <button
          type="button"
          onClick={async () => {
            await createEventAction(offering.id, newDate, newIso ? new Date(newIso).toISOString() : null);
            setNewDate("");
            setNewIso("");
          }}
        >
          Lisa kuupäev
        </button>
      </div>
    </section>
  );
}
