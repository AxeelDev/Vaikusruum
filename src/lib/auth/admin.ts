import { createServerSupabase } from "@/lib/supabase/server";
import type { AdminRole } from "@/types/content";

export type AdminUser = {
  id: string;
  email: string | null;
  role: AdminRole;
  displayName: string | null;
};

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("admin_users")
    .select("role, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    role: data.role as AdminRole,
    displayName: data.display_name,
  };
}

export async function adminExists(): Promise<boolean> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("admin_exists");
  if (error) return false;
  return Boolean(data);
}
