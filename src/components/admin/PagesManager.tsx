"use client";

import { useState } from "react";
import { savePageMetaAction } from "@/lib/actions/admin";
import type { PageRow } from "@/types/content";

export function PagesManager({ pages }: { pages: PageRow[] }) {
  const [rows, setRows] = useState(pages);
  const [message, setMessage] = useState("");

  async function save(page: PageRow) {
    const result = await savePageMetaAction(page.id, {
      title: page.title,
      nav_label: page.nav_label ?? "",
      slug: page.slug,
      show_in_nav: page.show_in_nav,
      is_published: page.is_published,
      nav_order: page.nav_order,
      seo_title: page.seo_title ?? "",
      seo_description: page.seo_description ?? "",
    });
    setMessage(result && "error" in result ? result.error! : "Salvestatud.");
  }

  function patch(id: string, patch: Partial<PageRow>) {
    setRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  return (
    <div className="vr-admin-panel">
      <h1 className="vr-admin-title">Lehed</h1>
      <p className="vr-admin-note">Sisu muudetakse visuaalses editoris; siin hallatakse lehe metaandmeid ja nähtavust.</p>
      <div className="vr-admin-list">
        {rows.map((page) => (
          <section key={page.id} className="vr-admin-section">
            <h2>{page.title}</h2>
            <label className="vr-field">
              Pealkiri
              <input value={page.title} onChange={(event) => patch(page.id, { title: event.target.value })} />
            </label>
            <label className="vr-field">
              Menüü nimi
              <input value={page.nav_label ?? ""} onChange={(event) => patch(page.id, { nav_label: event.target.value })} />
            </label>
            <label className="vr-field">
              Slug
              <input value={page.slug} onChange={(event) => patch(page.id, { slug: event.target.value })} />
            </label>
            <label className="vr-field">
              Järjekord
              <input type="number" value={page.nav_order} onChange={(event) => patch(page.id, { nav_order: Number(event.target.value) })} />
            </label>
            <label className="vr-check">
              <input type="checkbox" checked={page.is_published} onChange={(event) => patch(page.id, { is_published: event.target.checked })} />
              Avaldatud
            </label>
            <label className="vr-check">
              <input type="checkbox" checked={page.show_in_nav} onChange={(event) => patch(page.id, { show_in_nav: event.target.checked })} />
              Näita menüüs
            </label>
            <label className="vr-field">
              SEO pealkiri
              <input value={page.seo_title ?? ""} onChange={(event) => patch(page.id, { seo_title: event.target.value })} />
            </label>
            <label className="vr-field">
              SEO kirjeldus
              <textarea value={page.seo_description ?? ""} onChange={(event) => patch(page.id, { seo_description: event.target.value })} />
            </label>
            <button className="vr-cta" type="button" onClick={() => save(page)}>
              Salvesta leht
            </button>
          </section>
        ))}
      </div>
      {message ? <p className="vr-admin-note">{message}</p> : null}
    </div>
  );
}
