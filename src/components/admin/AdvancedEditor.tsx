"use client";

import { useState } from "react";
import { saveCustomCssAction } from "@/lib/actions/admin";

export function AdvancedEditor({ initial }: { initial: string }) {
  const [css, setCss] = useState(initial);
  const [message, setMessage] = useState("");

  return (
    <div>
      <h1 className="vr-admin-title">Advanced</h1>
      <p className="vr-warn">Vale CSS võib avaliku lehe paigutuse rikkuda. Haldusleht jääb eraldi.</p>
      <p className="vr-muted">
        Kasuta stabiilseid klasse: .vr-site, .vr-header, .vr-wordmark, .vr-section, .vr-section--hero,
        .vr-section--split, .vr-page-title, .vr-body, .vr-cta, .vr-photo
      </p>
      <textarea className="vr-code" value={css} onChange={(e) => setCss(e.target.value)} />
      <div className="vr-admin-actions">
        <button
          className="vr-cta"
          type="button"
          onClick={async () => {
            const result = await saveCustomCssAction(css);
            setMessage(result && "error" in result ? result.error! : "Salvestatud.");
          }}
        >
          Salvesta
        </button>
        <button
          type="button"
          onClick={async () => {
            setCss("");
            await saveCustomCssAction("");
            setMessage("Tühjendatud.");
          }}
        >
          Lähtesta CSS
        </button>
        {message ? <span>{message}</span> : null}
      </div>
    </div>
  );
}
