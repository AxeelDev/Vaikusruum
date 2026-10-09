"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page] render error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="vr-site">
      <main className="vr-section">
        <div className="vr-centered">
          <h1 className="vr-page-title">Midagi läks nihu</h1>
          <p>Lehe laadimine ebaõnnestus. Proovi palun uuesti.</p>
          <p>
            <button type="button" className="vr-cta" onClick={() => reset()}>
              Proovi uuesti
            </button>
          </p>
          <p>
            <Link className="vr-text-link" href="/">
              Avalehele
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
