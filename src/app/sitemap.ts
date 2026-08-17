import type { MetadataRoute } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { pageHref } from "@/lib/content/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vaikusruum.ee";
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("pages")
    .select("slug, updated_at")
    .eq("is_published", true);

  return (data ?? []).map((page) => ({
    url: `${base}${pageHref(page.slug)}`,
    lastModified: page.updated_at,
  }));
}
