import { AdminPageHeader } from "@/components/admin/AdminShell";
import { submissionClassLabel } from "@/lib/content/lesson-options";
import { createServerSupabase } from "@/lib/supabase/server";
import { SubmissionList, type SubmissionCard } from "./SubmissionList";

const CLASS_SELECT = "id, kind, name, email, phone, message, preferred_date, created_at, page_slug, topic, offering:offerings(title, short_title)";
const FULL_SELECT = "id, kind, name, email, phone, message, preferred_date, created_at, page_slug";
const FALLBACK_SELECT = "id, kind, name, email, phone, message, preferred_date, created_at";

type SubmissionRow = {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  preferred_date: string | null;
  created_at: string;
  page_slug?: string | null;
  topic?: string | null;
  offering?: { title: string; short_title: string | null } | null;
};

export default async function SubmissionsPage() {
  const supabase = await createServerSupabase();
  const pagesQuery = supabase.from("pages").select("slug, nav_label, title");
  // Older databases may lack the newest columns; fall back to what exists.
  let data: SubmissionRow[] | null = null;
  for (const select of [CLASS_SELECT, FULL_SELECT, FALLBACK_SELECT]) {
    const result = await supabase.from("form_submissions").select(select).order("created_at", { ascending: false });
    if (!result.error) {
      data = result.data as unknown as SubmissionRow[];
      break;
    }
  }
  const { data: pages } = await pagesQuery;
  const pageLabelBySlug = new Map(
    (pages ?? []).map((page) => [page.slug, page.nav_label || page.title || page.slug]),
  );

  const rows: SubmissionCard[] = (data ?? []).map((row) => {
    const slug = row.page_slug ?? null;
    return {
      id: row.id,
      kind: row.kind,
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      preferred_date: row.preferred_date,
      created_at: row.created_at,
      pageLabel: slug ? pageLabelBySlug.get(slug) || slug : "Leht teadmata",
      lesson: submissionClassLabel({ topic: row.topic, offeringTitle: row.offering?.short_title || row.offering?.title }),
    };
  });

  return (
    <div className="vr-admin-page vr-admin-page--wide">
      <AdminPageHeader
        title="Registreerumised"
        description="Kontakt-, eratunni- ja registreerumisvormide kaudu saadetud sõnumid, uusimad eespool."
        actions={
          rows.length ? (
            <a className="vr-admin-btn vr-admin-btn--ghost" href="/admin/export/submissions.csv" download>
              Laadi CSV
            </a>
          ) : null
        }
      />
      <SubmissionList rows={rows} />
    </div>
  );
}
