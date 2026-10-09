import { AdminPageHeader } from "@/components/admin/AdminShell";
import { AdminUsersList, type AdminListRow } from "@/components/admin/AdminUsersList";
import { ContactSettings, SettingsCard } from "@/components/admin/ContactSettings";
import { getAdminUser } from "@/lib/auth/admin";
import { getSiteSettings } from "@/lib/content/queries";
import { createServerSupabase } from "@/lib/supabase/server";

async function adminRows(): Promise<AdminListRow[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("admin_users").select("user_id, role, display_name, created_at").order("created_at");
  const rows = data ?? [];
  // Older rows may lack a display name; look the e-mail up so nobody is listed by id.
  const emails = new Map<string, string>();
  if (rows.some((row) => !row.display_name)) {
    try {
      const { createServiceSupabase } = await import("@/lib/supabase/service");
      const service = createServiceSupabase();
      await Promise.all(
        rows
          .filter((row) => !row.display_name)
          .map(async (row) => {
            const { data: user } = await service.auth.admin.getUserById(row.user_id);
            if (user.user?.email) emails.set(row.user_id, user.user.email);
          }),
      );
    } catch {
      // Without the service key the list still works; unnamed admins show a generic label.
    }
  }
  return rows.map((row) => ({
    user_id: row.user_id,
    role: row.role,
    label: row.display_name || emails.get(row.user_id) || "Administraator",
  }));
}

export default async function SettingsPage() {
  const [settings, admin] = await Promise.all([getSiteSettings(), getAdminUser()]);
  const owner = admin?.role === "owner";
  const users = owner ? await adminRows() : [];

  return (
    <div className="vr-admin-page vr-admin-page--narrow">
      <AdminPageHeader title="Seaded" description="Kontaktandmed, registreerimine ja ligipääs. Lehtede sisu ja kujundust muudad editoris." />
      <ContactSettings settings={settings} />
      {owner && admin ? <AdminUsersList admin={admin} users={users} /> : null}
      <SettingsCard id="varukoopia" title="Varukoopia" description="Laadi alla kogu saidi sisu (lehed, sektsioonid, seaded, kujundus) JSON-failina.">
        <div>
          <a className="vr-admin-btn vr-admin-btn--ghost" href="/admin/export/site-content.json" download>
            Laadi varukoopia
          </a>
        </div>
      </SettingsCard>
    </div>
  );
}
