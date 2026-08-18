import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getEditorBundle } from "@/lib/content/queries";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });
  const bundle = await getEditorBundle();
  return NextResponse.json(bundle, {
    headers: {
      "content-disposition": `attachment; filename="vaikusruum-site-content.json"`,
    },
  });
}
