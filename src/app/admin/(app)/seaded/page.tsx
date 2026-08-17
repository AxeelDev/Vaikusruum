import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { SeadedForm } from "@/components/admin/SeadedForm";

export default async function SeadedPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin");
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("admin_users").select("user_id, role, display_name, created_at");
  return <SeadedForm admin={admin} users={data ?? []} />;
}
