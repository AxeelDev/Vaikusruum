"use client";

import { useState } from "react";
import { deleteMediaAction, updateMediaAction } from "@/lib/actions/admin";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/utils/compress-image";
import { mediaPublicUrl } from "@/lib/utils/urls";
import type { MediaRow } from "@/types/content";

export function MediaLibrary({ items }: { items: MediaRow[] }) {
  const [mediaItems, setMediaItems] = useState(items);
  const [message, setMessage] = useState("");

  async function onUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Kasuta JPEG, PNG või WebP pilti.");
      return;
    }
    setMessage("Laen üles…");
    const blob = await compressImage(file);
    const ext = blob.type === "image/webp" ? "webp" : file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const supabase = createBrowserSupabase();
    const { error: uploadError } = await supabase.storage.from("site-media").upload(path, blob, {
      contentType: blob.type || file.type,
    });
    if (uploadError) {
      setMessage("Üleslaadimine ebaõnnestus.");
      return;
    }
    const { data, error } = await supabase.from("media").insert({
      storage_path: path,
      alt_text: file.name.replace(/\.[^.]+$/, ""),
    }).select("*").single();
    if (error || !data) {
      setMessage("Salvestamine ebaõnnestus.");
      return;
    }
    setMediaItems((current) => [data as MediaRow, ...current]);
    setMessage("Pilt on lisatud.");
  }

  return (
    <div className="vr-admin-panel">
      <div className="vr-admin-page-head">
        <h1 className="vr-admin-title">Pildid</h1>
        <label className="vr-admin-upload">
          Laadi üles
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onUpload(e.target.files)} />
        </label>
      </div>
      {message ? <p>{message}</p> : null}
      <div className="vr-media-grid">
        {mediaItems.map((item) => (
          <MediaCard key={item.id} item={item} onDeleted={() => setMediaItems((current) => current.filter((row) => row.id !== item.id))} />
        ))}
      </div>
    </div>
  );
}

function MediaCard({ item, onDeleted }: { item: MediaRow; onDeleted: () => void }) {
  const src = mediaPublicUrl(item.storage_path);
  return (
    <article className="vr-media-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={item.alt_text ?? ""} />
      <label className="vr-field">
        Alternatiivtekst
        <input
          defaultValue={item.alt_text ?? ""}
          onBlur={(e) => updateMediaAction(item.id, { alt_text: e.target.value })}
        />
      </label>
      <p className="vr-admin-note">Fookuspunkt</p>
      <FocalControl item={item} src={src} />
      <button
        type="button"
        onClick={async () => {
          await deleteMediaAction(item.id, item.storage_path);
          onDeleted();
        }}
      >
        Eemalda
      </button>
    </article>
  );
}

function FocalControl({ item, src }: { item: MediaRow; src: string }) {
  return (
    <button
      type="button"
      className="vr-focal"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
        updateMediaAction(item.id, { focal_x: x, focal_y: y });
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
      <span className="vr-focal-point" style={{ left: `${item.focal_x}%`, top: `${item.focal_y}%` }} />
    </button>
  );
}
