import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { createServerSupabase } from "@/lib/supabase/server";
import type { MediaRow } from "@/types/content";

export default async function MediaPage() {
  const supabase = await createServerSupabase();
  const [media, sections, pages] = await Promise.all([
    supabase.from("media").select("*").order("created_at", { ascending: false }),
    supabase.from("sections").select("page_id, content, style"),
    supabase.from("pages").select("id, title, nav_label"),
  ]);
  const items = (media.data ?? []) as MediaRow[];
  const pageName = new Map((pages.data ?? []).map((page) => [page.id, page.nav_label || page.title]));

  // An image is in use when its id appears anywhere in a section's content or style.
  const usage: Record<string, string[]> = {};
  for (const section of sections.data ?? []) {
    const haystack = JSON.stringify([section.content, section.style]);
    for (const item of items) {
      if (!haystack.includes(item.id)) continue;
      const name = pageName.get(section.page_id) ?? "Leht";
      usage[item.id] = [...new Set([...(usage[item.id] ?? []), name])];
    }
  }

  return <MediaLibrary items={items} usage={usage} />;
}
