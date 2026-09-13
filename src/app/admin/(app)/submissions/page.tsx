import { createServerSupabase } from "@/lib/supabase/server";
import { SubmissionList, type SubmissionCard } from "./SubmissionList";

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
};

export default async function SubmissionsPage() {
  const supabase = await createServerSupabase();
  const pagesQuery = supabase.from("pages").select("slug, nav_label, title");
  const full = await supabase.from("form_submissions").select(FULL_SELECT).order("created_at", { ascending: false });
  const fallback = full.error
    ? await supabase.from("form_submissions").select(FALLBACK_SELECT).order("created_at", { ascending: false })
    : null;
  const data = (full.error ? fallback?.data : full.data) as SubmissionRow[] | null;
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
    };
  });

  return (
    <div className="vr-admin-panel">
      <h1 className="vr-admin-title">Registreerumised</h1>
      <SubmissionList rows={rows} />
    </div>
  );
}
