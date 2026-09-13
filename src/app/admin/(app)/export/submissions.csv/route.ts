import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";

const CSV_HEADERS = ["created_at", "kind", "page_slug", "name", "email", "phone", "preferred_date", "message"];

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });
  const supabase = await createServerSupabase();
  const full = await supabase
    .from("form_submissions")
    .select("created_at, kind, page_slug, name, email, phone, preferred_date, message")
    .order("created_at", { ascending: false });
  const fallback = full.error
    ? await supabase
        .from("form_submissions")
        .select("created_at, kind, name, email, phone, preferred_date, message")
        .order("created_at", { ascending: false })
    : null;
  if (full.error && fallback?.error) return new NextResponse("Export failed", { status: 500 });
  const data = (full.error ? fallback?.data : full.data) as Array<Record<string, unknown>> | null;
  const rows = [
    CSV_HEADERS.join(","),
    ...(data ?? []).map((row) => CSV_HEADERS.map((key) => csvCell((row as Record<string, unknown>)[key])).join(",")),
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
