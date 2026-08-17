export function pageHref(slug: string): string {
  return slug === "avaleht" ? "/" : `/${slug}`;
}

export function mediaPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/site-media/${storagePath}`;
}
