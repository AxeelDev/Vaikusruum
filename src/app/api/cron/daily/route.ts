import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";

// Called once a day by Vercel Cron (vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
export const dynamic = "force-dynamic";

const RETENTION_MONTHS = 12;
const BACKUPS_KEPT = 30;
const BACKUP_TABLES = [
  "pages",
  "sections",
  "offerings",
  "events",
  "media",
  "site_settings",
  "theme_settings",
  "advanced_style_settings",
  "testimonials",
  "form_submissions",
] as const;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabase();
  const report: Record<string, unknown> = {};

  // 1. Retention: form messages are kept for 12 months (see /privaatsus).
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  const { count, error: purgeError } = await supabase
    .from("form_submissions")
    .delete({ count: "exact" })
    .lt("created_at", cutoff.toISOString());
  report.deletedSubmissions = purgeError ? `error: ${purgeError.message}` : count ?? 0;

  // 2. Backup: every content table as one JSON file in the private "backups" bucket.
  const snapshot: Record<string, unknown> = { createdAt: new Date().toISOString() };
  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`[cron] backup read failed for ${table}:`, error.message);
      return NextResponse.json({ ...report, error: `backup read failed: ${table}` }, { status: 500 });
    }
    snapshot[table] = data;
  }
  const name = `site-${new Date().toISOString().slice(0, 10)}.json`;
  const { error: uploadError } = await supabase.storage
    .from("backups")
    .upload(name, JSON.stringify(snapshot), { contentType: "application/json", upsert: true });
  if (uploadError) {
    console.error("[cron] backup upload failed:", uploadError.message);
    return NextResponse.json({ ...report, error: "backup upload failed" }, { status: 500 });
  }
  report.backup = name;

  // 3. Keep the newest backups only.
  const { data: files } = await supabase.storage.from("backups").list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });
  const stale = (files ?? []).filter((file) => file.name.startsWith("site-")).slice(BACKUPS_KEPT).map((file) => file.name);
  if (stale.length) await supabase.storage.from("backups").remove(stale);
  report.removedBackups = stale.length;

  console.log("[cron] daily maintenance:", JSON.stringify(report));
  return NextResponse.json(report);
}
