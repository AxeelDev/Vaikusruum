import { notFound } from "next/navigation";
import { PageEditor } from "@/components/admin/PageEditor";
import { createServerSupabase } from "@/lib/supabase/server";
import type { MediaRow, PageRow, SectionRow } from "@/types/content";

export default async function SisuSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServerSupabase();
  const { data: page } = await supabase.from("pages").select("*").eq("slug", slug).maybeSingle();
  if (!page) notFound();
  const [{ data: sections }, { data: media }] = await Promise.all([
    supabase.from("sections").select("*").eq("page_id", page.id).order("sort_order"),
    supabase.from("media").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <PageEditor
      page={page as PageRow}
      sections={(sections ?? []) as SectionRow[]}
      media={(media ?? []) as MediaRow[]}
    />
  );
}
