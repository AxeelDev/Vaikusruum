"use client";

import { useRef, useState } from "react";
import { AdminPageHeader, ConfirmButton } from "@/components/admin/AdminShell";
import { deleteMediaAction, updateMediaAction } from "@/lib/actions/admin";
import { uploadProgressLabel, uploadSiteMedia } from "@/lib/utils/upload-site-media";
import { mediaPublicUrl } from "@/lib/utils/urls";
import type { MediaRow } from "@/types/content";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export function MediaLibrary({ items, usage }: { items: MediaRow[]; usage: Record<string, string[]> }) {
  const [mediaItems, setMediaItems] = useState(items);
  const [status, setStatus] = useState<{ tone: "ok" | "error" | "busy"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onUpload(fileList: FileList | null) {
    const files = [...(fileList ?? [])];
    if (!files.length) return;
    setBusy(true);
    let added = 0;
    for (const [index, file] of files.entries()) {
      const prefix = files.length > 1 ? `${index + 1}/${files.length}: ` : "";
      setStatus({ tone: "busy", text: prefix + uploadProgressLabel("checking") });
      const result = await uploadSiteMedia(file, (progress) => setStatus({ tone: "busy", text: prefix + uploadProgressLabel(progress) }));
      if (!result.ok) {
        setStatus({ tone: "error", text: `${file.name}: ${result.error}` });
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      added++;
      setMediaItems((current) => [result.item, ...current]);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    setStatus({ tone: "ok", text: added === 1 ? "Pilt on lisatud." : `${added} pilti on lisatud.` });
  }

  return (
    <div className="vr-admin-page vr-admin-page--wide">
      <AdminPageHeader
        title="Pildid"
        description="Kõik veebilehel kasutatavad pildid. Pildi lisamiseks lehele vali editoris pilt ja vajuta „Vaheta pilti“."
        actions={
          <label className="vr-admin-btn vr-admin-btn--primary" aria-disabled={busy || undefined}>
            {busy ? "Laen üles…" : "Laadi pilte üles"}
            <input ref={inputRef} type="file" accept={ACCEPT} multiple disabled={busy} onChange={(e) => void onUpload(e.target.files)} />
          </label>
        }
      />
      <p className="vr-admin-note">
        JPEG, PNG, WebP või HEIC; suured pildid vähendatakse automaatselt. Puuduta pilti, et valida fookuspunkt: see osa jääb
        kärbitud pildil alati nähtavale.
      </p>
      {status ? (
        <p className="vr-admin-inline-status" role="status" aria-live="polite" data-tone={status.tone}>
          {status.text}
        </p>
      ) : null}
      {mediaItems.length ? (
        <div className="vr-media-grid">
          {mediaItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              usedOn={usage[item.id] ?? []}
              onError={(text) => setStatus({ tone: "error", text })}
              onDeleted={() => {
                setMediaItems((current) => current.filter((row) => row.id !== item.id));
                setStatus({ tone: "ok", text: "Pilt on eemaldatud." });
              }}
            />
          ))}
        </div>
      ) : (
        <p className="vr-admin-empty">Pilte veel ei ole.</p>
      )}
    </div>
  );
}

function MediaCard({
  item,
  usedOn,
  onDeleted,
  onError,
}: {
  item: MediaRow;
  usedOn: string[];
  onDeleted: () => void;
  onError: (text: string) => void;
}) {
  const src = mediaPublicUrl(item.storage_path);
  const [alt, setAlt] = useState(item.alt_text ?? "");
  const [savedAlt, setSavedAlt] = useState(item.alt_text ?? "");
  const [focal, setFocal] = useState({ x: item.focal_x, y: item.focal_y });
  const [note, setNote] = useState("");

  async function saveAlt() {
    if (alt === savedAlt) return;
    const result = await updateMediaAction(item.id, { alt_text: alt.trim() || null });
    if (result && "error" in result && result.error) return onError(result.error);
    setSavedAlt(alt);
    setNote("Kirjeldus salvestatud");
  }

  async function saveFocal(x: number, y: number) {
    setFocal({ x, y });
    const result = await updateMediaAction(item.id, { focal_x: x, focal_y: y });
    if (result && "error" in result && result.error) return onError(result.error);
    setNote("Fookuspunkt salvestatud");
  }

  return (
    <article className="vr-media-card">
      <button
        type="button"
        className="vr-focal"
        aria-label="Vali fookuspunkt: koht, mis jääb kärbitud pildil alati nähtavale"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = Math.min(100, Math.max(0, Math.round(((event.clientX - rect.left) / rect.width) * 100)));
          const y = Math.min(100, Math.max(0, Math.round(((event.clientY - rect.top) / rect.height) * 100)));
          void saveFocal(x, y);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" />
        <span className="vr-focal-point" style={{ left: `${focal.x}%`, top: `${focal.y}%` }} />
      </button>
      <div className="vr-media-card-body">
        <div className="vr-media-usage">
          {usedOn.length ? (
            <span className="vr-admin-status" title={usedOn.join(", ")}>
              Kasutusel: {usedOn.join(", ")}
            </span>
          ) : (
            <span className="vr-admin-status" data-tone="muted">
              Pole kasutusel
            </span>
          )}
        </div>
        <label className="vr-admin-field">
          <input
            aria-label="Pildi kirjeldus (alt-tekst)"
            value={alt}
            placeholder="Pildi kirjeldus"
            onChange={(e) => {
              setAlt(e.target.value);
              setNote("");
            }}
            onBlur={() => void saveAlt()}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </label>
        <div className="vr-media-actions">
          <span className="vr-media-hint" role="status" aria-live="polite">
            {note}
          </span>
          <a className="vr-admin-text-action" href={src} target="_blank" rel="noreferrer">
            Ava
          </a>
          <ConfirmButton
            label="Eemalda"
            confirmLabel="Eemalda"
            question={usedOn.length ? "Pilt on lehel kasutusel. Eemaldada?" : "Eemaldada pilt?"}
            onConfirm={async () => {
              const result = await deleteMediaAction(item.id, item.storage_path);
              if (result && "error" in result && result.error) onError(result.error);
              else onDeleted();
            }}
          />
        </div>
      </div>
    </article>
  );
}
