import { OfferingsEditor } from "@/components/admin/OfferingsEditor";
import { createServerSupabase } from "@/lib/supabase/server";
import type { EventRow, OfferingRow } from "@/types/content";

export default async function TunnidPage() {
  const supabase = await createServerSupabase();
  const [{ data: offerings }, { data: events }] = await Promise.all([
    supabase.from("offerings").select("*").order("title"),
    supabase.from("events").select("*").order("sort_order"),
  ]);
  return <OfferingsEditor offerings={(offerings ?? []) as OfferingRow[]} events={(events ?? []) as EventRow[]} />;
}
