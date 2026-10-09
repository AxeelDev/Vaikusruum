import { createClient } from "@supabase/supabase-js";

export function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service environment is not configured.");
  }
  return createClient(url, key, {
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15_000) }) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
