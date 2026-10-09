"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AdminPageHeader, ConfirmButton } from "@/components/admin/AdminShell";
import { Testimonial } from "@/components/public/Testimonials";
import {
  createTestimonialAction,
  deleteTestimonialAction,
  reorderTestimonialsAction,
  updateTestimonialAction,
  type TestimonialFields,
} from "@/lib/actions/admin";
import { NAME_PLACEHOLDER } from "@/lib/content/testimonials";
import { uploadProgressLabel, uploadSiteMedia } from "@/lib/utils/upload-site-media";
import { mediaPublicUrl } from "@/lib/utils/urls";
import type { MediaRow } from "@/types/content";

const MAX_QUOTE = 1200;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export type TestimonialEntry = {
  id: string;
  quote: string;
  name: string;
  photo_media_id: string | null;
  show_name: boolean;
  show_photo: boolean;
  published: boolean;
};

/** One card in the list. `id` is null until the first save. */
type Row = { key: string; id: string | null; fields: TestimonialEntry; saved: TestimonialEntry | null };

const EMPTY: TestimonialEntry = { id: "", quote: "", name: "", photo_media_id: null, show_name: true, show_photo: true, published: true };

function toFields(entry: TestimonialEntry): TestimonialFields {
  return {
    quote: entry.quote,
    name: entry.name,
    photo_media_id: entry.photo_media_id,
    show_name: entry.show_name,
    show_photo: entry.show_photo,
    published: entry.published,
  };
}

function sameFields(a: TestimonialEntry, b: TestimonialEntry) {
  return JSON.stringify(toFields(a)) === JSON.stringify(toFields(b));
}

export function TestimonialsManager({
  initial,
  media: initialMedia,
  pagePublished,
  loadFailed,
}: {
  initial: TestimonialEntry[];
  media: MediaRow[];
  /** Null when the Tagasiside page does not exist. */
  pagePublished: boolean | null;
  loadFailed: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((entry) => ({ key: entry.id, id: entry.id, fields: entry, saved: entry })));
  const [media, setMedia] = useState(initialMedia);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const counter = useRef(0);

  function patchRow(key: string, patch: Partial<TestimonialEntry>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, fields: { ...row.fields, ...patch } } : row)));
    setStatus(null);
  }

  function add() {
    counter.current += 1;
    const key = `new-${counter.current}`;
    setRows((current) => [...current, { key, id: null, fields: { ...EMPTY, id: key }, saved: null }]);
    setStatus(null);
    window.setTimeout(() => document.getElementById(`testimonial-quote-${key}`)?.focus(), 0);
  }

  async function save(key: string) {
    const row = rows.find((item) => item.key === key);
    if (!row) return;
    const result = row.id ? await updateTestimonialAction(row.id, toFields(row.fields)) : await createTestimonialAction(toFields(row.fields));
    if ("error" in result) {
      setStatus({ tone: "error", text: result.error });
      return;
    }
    const id = row.id ?? result.id ?? null;
    setRows((current) =>
      current.map((item) => (item.key === key ? { ...item, id, fields: { ...item.fields, id: id ?? item.fields.id }, saved: { ...item.fields, id: id ?? item.fields.id } } : item)),
    );
    setStatus({ tone: "ok", text: "Salvestatud." });
  }

  async function remove(key: string) {
    const row = rows.find((item) => item.key === key);
    if (!row) return;
    if (row.id) {
      const result = await deleteTestimonialAction(row.id);
      if ("error" in result) {
        setStatus({ tone: "error", text: result.error });
        return;
      }
    }
    setRows((current) => current.filter((item) => item.key !== key));
    setStatus({ tone: "ok", text: "Tagasiside on kustutatud." });
  }

  async function move(key: string, direction: -1 | 1) {
    const index = rows.findIndex((item) => item.key === key);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= rows.length) return;
    if (!rows[index].id || !rows[target].id) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    const result = await reorderTestimonialsAction(next.filter((item) => item.id).map((item) => item.id as string));
    if ("error" in result) {
      setRows(rows);
      setStatus({ tone: "error", text: result.error });
      return;
    }
    setStatus({ tone: "ok", text: "Järjekord salvestatud." });
  }

  return (
    <div className="vr-admin-page vr-admin-page--wide">
      <AdminPageHeader
        title="Tagasiside"
        description="Lisa, muuda ja järjesta tagasisidet. See kuvatakse avalikul lehel „Tagasiside“, kui leht on avaldatud."
        actions={
          <button type="button" className="vr-admin-btn vr-admin-btn--primary" onClick={add}>
            Lisa tagasiside
          </button>
        }
      />
      {pagePublished === false ? (
        <p className="vr-admin-note" data-tone="warn" role="note">
          Leht „Tagasiside“ ei ole veel avalik, nii et külastajad seda ei näe. <Link href="/admin/editor">Ava editor</Link> ja lülita leht seadetes avalikuks.
        </p>
      ) : null}
      {pagePublished === null ? (
        <p className="vr-admin-note" data-tone="warn" role="note">
          Lehte „Tagasiside“ ei leitud. Lisa see editoris, et tagasiside külastajatele nähtavaks saaks.
        </p>
      ) : null}
      {loadFailed ? <p className="vr-admin-inline-status" role="alert" data-tone="error">Tagasiside laadimine ebaõnnestus. Värskenda lehte.</p> : null}
      {status ? (
        <p className="vr-admin-inline-status" role="status" aria-live="polite" data-tone={status.tone}>
          {status.text}
        </p>
      ) : null}

      {rows.length ? (
        <ol className="vr-testi-list">
          {rows.map((row, index) => (
            <TestimonialCard
              key={row.key}
              row={row}
              index={index}
              total={rows.length}
              canMoveUp={index > 0 && Boolean(row.id && rows[index - 1].id)}
              canMoveDown={index < rows.length - 1 && Boolean(row.id && rows[index + 1].id)}
              media={media}
              onMedia={(item) => setMedia((current) => [item, ...current])}
              onChange={(patch) => patchRow(row.key, patch)}
              onSave={() => save(row.key)}
              onDelete={() => remove(row.key)}
              onMove={(direction) => void move(row.key, direction)}
              onError={(text) => setStatus({ tone: "error", text })}
            />
          ))}
        </ol>
      ) : (
        <p className="vr-admin-empty">Tagasisidet veel ei ole. Vajuta „Lisa tagasiside“.</p>
      )}
    </div>
  );
}

function TestimonialCard({
  row,
  index,
  total,
  canMoveUp,
  canMoveDown,
  media,
  onMedia,
  onChange,
  onSave,
  onDelete,
  onMove,
  onError,
}: {
  row: Row;
  index: number;
  total: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  media: MediaRow[];
  onMedia: (item: MediaRow) => void;
  onChange: (patch: Partial<TestimonialEntry>) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onMove: (direction: -1 | 1) => void;
  onError: (text: string) => void;
}) {
  const { fields } = row;
  const [picking, setPicking] = useState(false);
  const [upload, setUpload] = useState("");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = !row.saved || !sameFields(fields, row.saved);
  const quoteError = showErrors && !fields.quote.trim() ? "Tagasiside tekst on kohustuslik." : undefined;
  const photo = media.find((item) => item.id === fields.photo_media_id) ?? null;

  const preview = useMemo(
    () => ({
      id: row.key,
      quote: fields.quote.trim() || "Tagasiside tekst ilmub siia.",
      name: fields.name.trim() || null,
      photo_media_id: fields.photo_media_id,
      show_name: fields.show_name,
      show_photo: fields.show_photo,
      published: fields.published,
      sort_order: index,
      created_at: "",
      updated_at: "",
      photo: photo ? { storage_path: photo.storage_path, alt_text: photo.alt_text } : null,
    }),
    [row.key, fields, index, photo],
  );

  async function submit() {
    if (!fields.quote.trim()) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  async function onFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const result = await uploadSiteMedia(file, (progress) => setUpload(uploadProgressLabel(progress)));
    if (fileRef.current) fileRef.current.value = "";
    if (!result.ok) {
      setUpload("");
      onError(`${file.name}: ${result.error}`);
      return;
    }
    onMedia(result.item);
    onChange({ photo_media_id: result.item.id });
    setUpload("");
    setPicking(false);
  }

  return (
    <li className="vr-testi-item" data-published={fields.published ? "true" : "false"}>
      <div className="vr-testi-form">
        <label className="vr-admin-field" data-invalid={quoteError ? "true" : undefined}>
          <span className="vr-admin-field-label">Tagasiside</span>
          <textarea
            id={`testimonial-quote-${row.key}`}
            rows={5}
            maxLength={MAX_QUOTE}
            value={fields.quote}
            onChange={(event) => onChange({ quote: event.target.value })}
          />
          {quoteError ? (
            <span className="vr-admin-field-error">{quoteError}</span>
          ) : (
            <span className="vr-admin-field-hint">
              {fields.quote.length} / {MAX_QUOTE}
            </span>
          )}
        </label>
        <label className="vr-admin-field">
          <span className="vr-admin-field-label">Nimi</span>
          <input value={fields.name} maxLength={120} placeholder={NAME_PLACEHOLDER} onChange={(event) => onChange({ name: event.target.value })} />
        </label>

        <div className="vr-admin-field">
          <span className="vr-admin-field-label">Pilt</span>
          <div className="vr-testi-photo">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaPublicUrl(photo.storage_path)} alt="" width={56} height={56} />
            ) : (
              <span className="vr-testi-photo-empty">Pilti pole</span>
            )}
            <button type="button" className="vr-admin-btn vr-admin-btn--ghost" aria-expanded={picking} onClick={() => setPicking((open) => !open)}>
              {photo ? "Vaheta pilti" : "Vali pilt"}
            </button>
            <label className="vr-admin-btn vr-admin-btn--ghost" aria-disabled={Boolean(upload) || undefined}>
              Lae üles
              <input ref={fileRef} type="file" accept={ACCEPT} disabled={Boolean(upload)} onChange={(event) => void onFile(event.target.files)} />
            </label>
            {photo ? (
              <button type="button" className="vr-admin-text-action" onClick={() => onChange({ photo_media_id: null })}>
                Eemalda pilt
              </button>
            ) : null}
            {upload ? <span className="vr-admin-status">{upload}</span> : null}
          </div>
          {picking ? (
            <div className="vr-testi-picker" role="listbox" aria-label="Pildid">
              {media.length ? (
                media.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={item.id === fields.photo_media_id}
                    onClick={() => {
                      onChange({ photo_media_id: item.id });
                      setPicking(false);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaPublicUrl(item.storage_path)} alt={item.alt_text ?? ""} loading="lazy" />
                  </button>
                ))
              ) : (
                <p className="vr-admin-empty">Pildikogu on tühi. Lae pilt üles.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="vr-testi-toggles">
          <label>
            <input type="checkbox" checked={fields.show_name} onChange={(event) => onChange({ show_name: event.target.checked })} />
            Näita nime
          </label>
          <label>
            <input type="checkbox" checked={fields.show_photo} onChange={(event) => onChange({ show_photo: event.target.checked })} />
            Näita pilti
          </label>
          <label>
            <input type="checkbox" checked={fields.published} onChange={(event) => onChange({ published: event.target.checked })} />
            Avaldatud
          </label>
        </div>

        <div className="vr-testi-actions">
          <div className="vr-testi-order">
            <button type="button" className="vr-admin-btn vr-admin-btn--ghost" aria-label="Liiguta ülespoole" disabled={!canMoveUp} onClick={() => onMove(-1)}>
              ↑
            </button>
            <button type="button" className="vr-admin-btn vr-admin-btn--ghost" aria-label="Liiguta allapoole" disabled={!canMoveDown} onClick={() => onMove(1)}>
              ↓
            </button>
            <span className="vr-admin-status">
              {index + 1} / {total}
            </span>
          </div>
          <ConfirmButton
            label={row.id ? "Kustuta" : "Tühista"}
            confirmLabel={row.id ? "Kustuta" : "Tühista"}
            question={row.id ? "Kustutada see tagasiside?" : "Loobuda lisamisest?"}
            onConfirm={onDelete}
          />
          <button type="button" className="vr-admin-btn vr-admin-btn--primary" disabled={!dirty || saving} onClick={() => void submit()}>
            {saving ? "Salvestan…" : row.id ? "Salvesta" : "Lisa"}
          </button>
        </div>
      </div>

      <div className="vr-testi-preview" aria-label="Eelvaade">
        <span className="vr-testi-preview-label">Eelvaade{fields.published ? "" : " · peidetud"}</span>
        <Testimonial item={preview} />
      </div>
    </li>
  );
}
