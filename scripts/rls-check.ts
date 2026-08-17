import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon) {
  console.error("Missing public Supabase env");
  process.exit(1);
}

const supabase = createClient(url, anon, { auth: { persistSession: false } });

async function main() {
  const { data: pages, error: pagesError } = await supabase.from("pages").select("slug, is_published");
  if (pagesError) throw new Error(`anon cannot read pages: ${pagesError.message}`);
  const slugs = (pages ?? []).map((p) => p.slug);
  if (!slugs.includes("avaleht")) throw new Error("published homepage missing");
  if (slugs.includes("tagasiside")) throw new Error("unpublished tagasiside leaked");

  const { error: updateError } = await supabase.from("pages").update({ title: "x" }).eq("slug", "avaleht");
  if (!updateError) {
    const { data: check } = await supabase.from("pages").select("title").eq("slug", "avaleht").maybeSingle();
    if (check?.title === "x") throw new Error("anon was able to update pages");
  }

  const { data: submissions } = await supabase.from("form_submissions").select("id");
  if (submissions && submissions.length > 0) throw new Error("anon can read submissions");

  const marker = `rls-probe-${Date.now()}@example.test`;
  const { error: insertProbe } = await supabase.from("form_submissions").insert({
    kind: "contact",
    name: "RLS probe",
    email: marker,
    consent: true,
  });
  if (insertProbe) throw new Error(`anon cannot submit forms: ${insertProbe.message}`);

  const { data: css } = await supabase.from("advanced_style_settings").update({ custom_css: "body{}" }).eq("id", 1).select();
  if (css && css.length > 0) throw new Error("anon was able to edit custom CSS");

  if (service) {
    const admin = createClient(url, service, { auth: { persistSession: false } });
    await admin.from("form_submissions").delete().eq("email", marker);
  }

  console.log("RLS spot checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "RLS check failed");
  process.exit(1);
});
