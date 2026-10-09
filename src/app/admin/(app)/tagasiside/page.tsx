import { TestimonialsManager, type TestimonialEntry } from "@/components/admin/TestimonialsManager";
import { createServerSupabase } from "@/lib/supabase/server";
import type { MediaRow, TestimonialRow } from "@/types/content";

export default async function TestimonialsPage() {
  const supabase = await createServerSupabase();
  const [rows, media, page] = await Promise.all([
    supabase.from("testimonials").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("media").select("*").order("created_at", { ascending: false }),
    supabase.from("pages").select("is_published").eq("slug", "tagasiside").maybeSingle(),
  ]);

  const entries: TestimonialEntry[] = ((rows.data ?? []) as TestimonialRow[]).map((row) => ({
    id: row.id,
    quote: row.quote,
    name: row.name ?? "",
    photo_media_id: row.photo_media_id,
    show_name: row.show_name,
    show_photo: row.show_photo,
    published: row.published,
  }));

  return (
    <TestimonialsManager
      initial={entries}
      media={(media.data ?? []) as MediaRow[]}
      pagePublished={page.data ? Boolean(page.data.is_published) : null}
      loadFailed={Boolean(rows.error)}
    />
  );
}
