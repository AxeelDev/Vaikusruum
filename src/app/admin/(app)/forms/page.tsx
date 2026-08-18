import Link from "next/link";

export default function FormsPage() {
  return (
    <div className="vr-admin-panel">
      <h1 className="vr-admin-title">Vormid</h1>
      <section className="vr-admin-section">
        <h2>Vastused</h2>
        <p className="vr-admin-note">Kontakt- ja registreerumisvormide vastuseid hallatakse vastuste vaates.</p>
        <Link className="vr-cta" href="/admin/submissions">
          Ava vastused
        </Link>
      </section>
      <section className="vr-admin-section">
        <h2>Eksport</h2>
        <p className="vr-admin-note">CSV ekspordi saab alla laadida andmete vaates.</p>
        <Link className="vr-cta" href="/admin/export">
          Ava eksport
        </Link>
      </section>
    </div>
  );
}
