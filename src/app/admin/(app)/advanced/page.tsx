import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { AdvancedEditor } from "@/components/admin/AdvancedEditor";

export default async function AdvancedPage() {
  const admin = await getAdminUser();
  if (!admin || admin.role !== "owner") redirect("/admin/sisu");
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("advanced_style_settings").select("custom_css").eq("id", 1).maybeSingle();
  return <AdvancedEditor initial={data?.custom_css ?? ""} />;
}
