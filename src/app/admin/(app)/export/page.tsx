export default function ExportPage() {
  return (
    <div className="vr-admin-panel">
      <h1 className="vr-admin-title">Andmed / eksport</h1>
      <section className="vr-admin-section">
        <h2>Saidi sisu</h2>
        <p className="vr-admin-note">Ekspordib lehed, sektsioonid, seaded, kujunduse ja meedia metaandmed JSON-ina.</p>
        <a className="vr-cta" href="/admin/export/site-content.json">
          Laadi JSON
        </a>
      </section>
      <section className="vr-admin-section">
        <h2>Vormide vastused</h2>
        <p className="vr-admin-note">Ekspordib kontakt- ja registreerumisvormide vastused CSV-failina.</p>
        <a className="vr-cta" href="/admin/export/submissions.csv">
          Laadi CSV
        </a>
      </section>
    </div>
  );
}
