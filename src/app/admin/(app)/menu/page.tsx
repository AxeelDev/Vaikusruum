import { MenuEditor } from "@/components/admin/MenuEditor";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PageRow } from "@/types/content";

export default async function MenuPage() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("pages").select("*").order("nav_order", { ascending: true });
  return (
    <div className="vr-admin-panel">
      <MenuEditor pages={(data ?? []) as PageRow[]} />
    </div>
  );
}
