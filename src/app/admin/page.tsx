import Link from "next/link";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { BootstrapForm, LoginForm } from "@/components/admin/AuthForms";
import { adminExists, getAdminUser } from "@/lib/auth/admin";
import { getTheme } from "@/lib/content/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import { themeToCssVars } from "@/lib/theme/theme";

const KIND_LABEL: Record<string, string> = {
  contact: "Üldine küsimus",
  private_lesson: "Eratund",
  registration: "Registreerumine",
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function AdminEntryPage() {
  const admin = await getAdminUser();
  const theme = await getTheme();

  if (!admin) {
    const exists = await adminExists();
    return (
      <div className="vr-login" style={themeToCssVars(theme)}>
        <div className="vr-login-box">
          <p className="vr-wordmark vr-wordmark--header">VAIKUSRUUM</p>
          <h1 className="vr-admin-title">{exists ? "Logi sisse" : "Loo administraatori konto"}</h1>
          {exists ? <LoginForm /> : <BootstrapForm />}
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabase();
  // Read once per request; the overview only needs a rough "this week" window.
  // eslint-disable-next-line react-hooks/purity
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();
  const [recent, weekCount, totalCount, mediaCount, pages] = await Promise.all([
    supabase.from("form_submissions").select("id, kind, name, created_at, page_slug").order("created_at", { ascending: false }).limit(5),
    supabase.from("form_submissions").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("form_submissions").select("id", { count: "exact", head: true }),
    supabase.from("media").select("id", { count: "exact", head: true }),
    supabase.from("pages").select("slug, title, nav_label, is_published, show_in_nav, nav_order").order("nav_order", { ascending: true }),
  ]);
  const pageLabel = new Map((pages.data ?? []).map((page) => [page.slug, page.nav_label || page.title]));
  const rows = recent.data ?? [];

  return (
    <div className="vr-admin" style={themeToCssVars(theme)}>
      <AdminShell admin={admin}>
        <AdminPageHeader
          title="Ülevaade"
          actions={
            <Link className="vr-admin-btn vr-admin-btn--primary" href="/admin/editor">
              Muuda veebilehte
            </Link>
          }
        />

        <section className="vr-admin-block">
          <header className="vr-admin-block-head">
            <h2>Viimased vastused</h2>
            <span className="vr-admin-block-meta">
              {weekCount.count ?? 0} viimase 7 päeva jooksul · {totalCount.count ?? 0} kokku
            </span>
            <Link href="/admin/submissions" className="vr-admin-block-link">
              Kõik
            </Link>
          </header>
          {rows.length ? (
            <ul className="vr-admin-rows">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link href="/admin/submissions">
                    <span>
                      <strong>{row.name}</strong>
                      <small>
                        {KIND_LABEL[row.kind] ?? row.kind}
                        {row.page_slug ? ` · ${pageLabel.get(row.page_slug) ?? row.page_slug}` : ""}
                      </small>
                    </span>
                    <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleDateString("et-EE", { timeZone: "Europe/Tallinn" })}</time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vr-admin-empty">Vastuseid veel ei ole.</p>
          )}
        </section>

        <section className="vr-admin-block">
          <header className="vr-admin-block-head">
            <h2>Lehed</h2>
            <span className="vr-admin-block-meta">{mediaCount.count ?? 0} pilti galeriis</span>
            <Link href="/admin/editor" className="vr-admin-block-link">
              Muuda editoris
            </Link>
          </header>
          <ul className="vr-admin-rows">
            {(pages.data ?? []).map((page) => (
              <li key={page.slug}>
                <a href={page.slug === "avaleht" ? "/" : `/${page.slug}`} target="_blank" rel="noreferrer">
                  <span>
                    <strong>{page.nav_label || page.title}</strong>
                    <small>/{page.slug === "avaleht" ? "" : page.slug}</small>
                  </span>
                  {!page.is_published ? (
                    <span className="vr-admin-status" data-tone="warn">Avaldamata</span>
                  ) : !page.show_in_nav ? (
                    <span className="vr-admin-status">Menüüst peidetud</span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </AdminShell>
    </div>
  );
}
