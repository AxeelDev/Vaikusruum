import Link from "next/link";

export default function NotFound() {
  return (
    <div className="vr-site">
      <main className="vr-section">
        <div className="vr-centered">
          <h1 className="vr-page-title">Lehte ei leitud</h1>
          <p>
            <Link href="/">Tagasi avalehele</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
