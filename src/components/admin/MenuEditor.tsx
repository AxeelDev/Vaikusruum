"use client";

import { useState } from "react";
import { savePageMetaAction } from "@/lib/actions/admin";
import type { PageRow } from "@/types/content";

export function MenuEditor({ pages }: { pages: PageRow[] }) {
  const [rows, setRows] = useState(pages);
  const [message, setMessage] = useState("");

  async function save() {
    for (const [index, page] of rows.entries()) {
      await savePageMetaAction(page.id, {
        title: page.title,
        nav_label: page.nav_label ?? page.title,
        seo_title: page.seo_title ?? "",
        seo_description: page.seo_description ?? "",
        show_in_nav: page.show_in_nav,
        is_published: page.is_published,
        nav_order: index + 1,
      });
    }
    setMessage("Salvestatud.");
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setRows(next);
  }

  return (
    <div>
      <h1 className="vr-admin-title">Menüü</h1>
      {rows.map((page, index) => (
        <div key={page.id} style={{ display: "grid", gap: "0.4rem", marginBottom: "1.2rem" }}>
          <strong>{page.title}</strong>
          <label className="vr-field">
            Menüü nimi
            <input
              value={page.nav_label ?? ""}
              onChange={(e) =>
                setRows(rows.map((row) => (row.id === page.id ? { ...row, nav_label: e.target.value } : row)))
              }
            />
          </label>
          <label className="vr-check">
            <input
              type="checkbox"
              checked={page.show_in_nav}
              onChange={(e) =>
                setRows(rows.map((row) => (row.id === page.id ? { ...row, show_in_nav: e.target.checked } : row)))
              }
            />
            Näita menüüs
          </label>
          <label className="vr-check">
            <input
              type="checkbox"
              checked={page.is_published}
              onChange={(e) =>
                setRows(rows.map((row) => (row.id === page.id ? { ...row, is_published: e.target.checked } : row)))
              }
            />
            Avalik leht
          </label>
          <div>
            <button type="button" onClick={() => move(index, -1)}>
              Üles
            </button>{" "}
            <button type="button" onClick={() => move(index, 1)}>
              Alla
            </button>
          </div>
        </div>
      ))}
      <div className="vr-admin-actions">
        <button className="vr-cta" type="button" onClick={save}>
          Salvesta
        </button>
        {message ? <span>{message}</span> : null}
      </div>
    </div>
  );
}
