import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function SisuPage() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("pages").select("id, slug, title, is_published").order("nav_order");

  return (
    <div>
      <h1 className="vr-admin-title">Sisu</h1>
      <p>
        <Link href="/admin/editor">Ava visuaalne redaktor</Link>
      </p>
      <table className="vr-table">
        <thead>
          <tr>
            <th>Leht</th>
            <th>Olek</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((page) => (
            <tr key={page.id}>
              <td>
                <Link href={`/admin/sisu/${page.slug}`}>{page.title}</Link>
              </td>
              <td>{page.is_published ? "Avalik" : "Peidetud"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
