import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { submissionClassLabel } from "@/lib/content/lesson-options";
import { createServerSupabase } from "@/lib/supabase/server";

const CSV_HEADERS = ["created_at", "kind", "page_slug", "lesson", "name", "email", "phone", "preferred_date", "message"];

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });
  const supabase = await createServerSupabase();
  // Older databases may lack the newest columns; fall back to what exists.
  const selects = [
    "created_at, kind, page_slug, name, email, phone, preferred_date, message, topic, offering:offerings(title, short_title)",
    "created_at, kind, page_slug, name, email, phone, preferred_date, message",
    "created_at, kind, name, email, phone, preferred_date, message",
  ];
  let data: Array<Record<string, unknown>> | null = null;
  for (const select of selects) {
    const result = await supabase.from("form_submissions").select(select).order("created_at", { ascending: false });
    if (!result.error) {
      data = result.data as unknown as Array<Record<string, unknown>>;
      break;
    }
  }
  if (!data) return new NextResponse("Export failed", { status: 500 });
  const rows = [
    CSV_HEADERS.join(","),
    ...data.map((row) => {
      const offering = row.offering as { title?: string; short_title?: string | null } | null | undefined;
      const lesson = submissionClassLabel({ topic: row.topic as string | null | undefined, offeringTitle: offering?.short_title || offering?.title });
      return CSV_HEADERS.map((key) => csvCell(key === "lesson" ? lesson : row[key])).join(",");
    }),
  ];
  return new NextResponse(rows.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="vaikusruum-submissions.csv"`,
    },
  });
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
