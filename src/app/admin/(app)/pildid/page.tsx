import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { createServerSupabase } from "@/lib/supabase/server";
import type { MediaRow } from "@/types/content";

export default async function PildidPage() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("media").select("*").order("created_at", { ascending: false });
  return <MediaLibrary items={(data ?? []) as MediaRow[]} />;
}
