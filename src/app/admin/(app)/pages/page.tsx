import { PagesManager } from "@/components/admin/PagesManager";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PageRow } from "@/types/content";

export default async function PagesPage() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("pages").select("*").order("nav_order", { ascending: true });
  return <PagesManager pages={(data ?? []) as PageRow[]} />;
}
