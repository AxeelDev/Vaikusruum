import { redirect } from "next/navigation";
import { AdminUsersList } from "@/components/admin/AdminUsersList";
import { getAdminUser } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function AdminsPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin");
  if (admin.role !== "owner") redirect("/admin");
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("admin_users").select("user_id, role, display_name, created_at");
  return <AdminUsersList admin={admin} users={data ?? []} />;
}
