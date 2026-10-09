import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only signed-in areas need the session refreshed; public pages stay cacheable and skip the auth round trip.
  matcher: ["/admin/:path*", "/api/:path*"],
};
