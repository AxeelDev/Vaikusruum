"use client";

import { useState } from "react";
import { deleteMediaAction, updateMediaAction } from "@/lib/actions/admin";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/utils/compress-image";
import { mediaPublicUrl } from "@/lib/utils/urls";
import type { MediaRow } from "@/types/content";

export function MediaLibrary({ items }: { items: MediaRow[] }) {
  const [message, setMessage] = useState("");

  async function onUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
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
    const { error } = await supabase.from("media").insert({
      storage_path: path,
      alt_text: file.name.replace(/\.[^.]+$/, ""),
    });
    setMessage(error ? "Salvestamine ebaõnnestus." : "Pilt on lisatud. Värskenda lehte.");
  }

  return (
    <div>
      <h1 className="vr-admin-title">Pildid</h1>
      <label className="vr-field">
        Vali uus pilt
        <input type="file" accept="image/*" onChange={(e) => onUpload(e.target.files)} />
      </label>
      {message ? <p>{message}</p> : null}
      <div className="vr-media-grid">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function MediaCard({ item }: { item: MediaRow }) {
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
      <p className="vr-muted">Fookus</p>
      <FocalControl item={item} src={src} />
      <button type="button" onClick={() => deleteMediaAction(item.id, item.storage_path)}>
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
