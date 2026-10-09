import type { MetadataRoute } from "next";
import { createPublicSupabase } from "@/lib/supabase/public";
import { pageHref } from "@/lib/content/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vaikusruum.ee";
  const supabase = createPublicSupabase();
  const { data } = await supabase
    .from("pages")
    .select("slug, updated_at")
    .eq("is_published", true);

  return (data ?? []).map((page) => ({
    url: `${base}${pageHref(page.slug)}`,
    lastModified: page.updated_at,
  }));
}
