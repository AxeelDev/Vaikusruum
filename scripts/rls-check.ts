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

  // Visitors may not write submissions directly; the server inserts them after validation and rate limiting.
  const marker = `rls-probe-${Date.now()}@example.test`;
  const { error: insertProbe } = await supabase.from("form_submissions").insert({
    kind: "contact",
    name: "RLS probe",
    email: marker,
    consent: true,
  });
  if (!insertProbe) {
    if (process.argv.includes("--before-submission-lockdown")) {
      console.warn("note: anon can still insert submissions (migration 20261009150000 not applied yet)");
    } else {
      throw new Error("anon can insert form submissions directly; apply migration 20261009150000");
    }
  }

  const { data: revision } = await supabase.from("site_revision").select("revision");
  if (revision && revision.length > 0) throw new Error("anon can read the site revision");

  const { error: rpcError } = await supabase.rpc("save_editor_draft", { p_expected_revision: 0, p_changes: {} });
  if (!rpcError) throw new Error("anon was able to call save_editor_draft");

  const { data: backups } = await supabase.storage.from("backups").list();
  if (backups && backups.length > 0) throw new Error("anon can list backups");

  await checkTestimonials();

  const { data: css } = await supabase.from("advanced_style_settings").update({ custom_css: "body{}" }).eq("id", 1).select();
  if (css && css.length > 0) throw new Error("anon was able to edit custom CSS");

  if (service) {
    const admin = createClient(url, service, { auth: { persistSession: false } });
    await admin.from("form_submissions").delete().eq("email", marker);
  }

  console.log("RLS spot checks passed.");
}

/** The public sees published testimonials only and can change none. */
async function checkTestimonials() {
  const { error: insertError } = await supabase.from("testimonials").insert({ quote: "rls probe", published: true });
  if (!insertError) throw new Error("anon was able to insert a testimonial");

  if (!service) {
    console.warn("note: no service key, skipped the unpublished-testimonial visibility check");
    return;
  }
  const admin = createClient(url!, service, { auth: { persistSession: false } });
  const marker = `rls-probe-${Date.now()}`;
  const { data: rows, error: seedError } = await admin
    .from("testimonials")
    .insert([
      { quote: `${marker} published`, published: true },
      { quote: `${marker} hidden`, published: false },
    ])
    .select("id, quote, published");
  if (seedError || !rows) throw new Error(`could not create probe testimonials: ${seedError?.message}`);
  try {
    const { data: seen, error } = await supabase.from("testimonials").select("id, quote, published").like("quote", `${marker}%`);
    if (error) throw new Error(`anon cannot read published testimonials: ${error.message}`);
    if (!seen?.some((row) => row.published)) throw new Error("anon cannot see a published testimonial");
    if (seen.some((row) => !row.published)) throw new Error("unpublished testimonial leaked to anon");

    const hidden = rows.find((row) => !row.published)!;
    const shown = rows.find((row) => row.published)!;
    await supabase.from("testimonials").update({ quote: "changed by anon" }).eq("id", shown.id);
    await supabase.from("testimonials").delete().eq("id", shown.id);
    await supabase.from("testimonials").delete().eq("id", hidden.id);
    const { data: after } = await admin.from("testimonials").select("id, quote").in("id", rows.map((row) => row.id));
    if (after?.length !== 2) throw new Error("anon was able to delete a testimonial");
    if (after.some((row) => row.quote === "changed by anon")) throw new Error("anon was able to edit a testimonial");
  } finally {
    await admin.from("testimonials").delete().like("quote", `${marker}%`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "RLS check failed");
  process.exit(1);
});
