import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { bootstrapSchema } from "@/lib/validation/forms";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bootstrapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Palun sisesta korrektne e-post ja vähemalt 10-täheline parool." }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { data: exists, error: existsError } = await service.rpc("admin_exists");
  if (existsError) {
    return NextResponse.json({ error: "Kontrollimine ebaõnnestus." }, { status: 500 });
  }
  if (exists) {
    return NextResponse.json({ error: "Administraator on juba olemas." }, { status: 409 });
  }

  const { email, password, displayName } = parsed.data;
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName ?? null },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: "Kasutaja loomine ebaõnnestus." }, { status: 500 });
  }

  const { data: claimed, error: claimError } = await service.rpc("claim_first_owner", {
    p_user_id: created.user.id,
    p_display_name: displayName ?? null,
  });

  if (claimError || !claimed) {
    await service.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Administraator on juba olemas." }, { status: 409 });
  }

  const supabase = await createServerSupabase();
  const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
  if (signError) {
    return NextResponse.json({ error: "Konto loodi, kuid sisselogimine ebaõnnestus. Proovi sisse logida." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
