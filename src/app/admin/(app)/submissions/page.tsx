import { deleteSubmissionAction } from "@/lib/actions/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function SubmissionsPage() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("form_submissions")
    .select("id, kind, name, email, phone, message, preferred_date, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="vr-admin-panel">
      <h1 className="vr-admin-title">Registreerumised</h1>
      <table className="vr-table vr-table--compact">
        <thead>
          <tr>
            <th>Nimi</th>
            <th>Tüüp</th>
            <th>Kuupäev</th>
            <th>E-post</th>
            <th>Sõnum</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.kind}</td>
              <td>{new Date(row.created_at).toLocaleDateString("et-EE")}</td>
              <td>{row.email}</td>
              <td>
                {row.phone ? `${row.phone} · ` : ""}
                {row.preferred_date ? `${row.preferred_date} · ` : ""}
                {row.message}
              </td>
              <td>
                <form action={async () => { "use server"; await deleteSubmissionAction(row.id); }}>
                  <button type="submit">Eemalda</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(data ?? []).length === 0 ? <p className="vr-admin-note">Sõnumeid veel ei ole.</p> : null}
    </div>
  );
}
