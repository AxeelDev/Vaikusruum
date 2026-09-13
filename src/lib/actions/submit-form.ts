"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validation/forms";

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitPublicForm(input: unknown): Promise<SubmitResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Palun kontrolli välju." };
  }

  const value = parsed.data;

  const row = {
    kind: value.kind,
    offering_id: value.offeringId || null,
    name: value.name,
    email: value.email,
    phone: value.phone || null,
    message: value.message || null,
    preferred_date: value.preferredDate || null,
    page_slug: value.pageSlug || null,
    consent: true,
  };

  const supabase = await createServerSupabase();
  let { error } = await supabase.from("form_submissions").insert(row);
  if (error) {
    const { page_slug: _unused, ...withoutPage } = row;
    void _unused;
    ({ error } = await supabase.from("form_submissions").insert(withoutPage));
  }

  if (error) {
    return { ok: false, error: "Saatmine ei õnnestunud. Proovi palun hetke pärast uuesti." };
  }

  const notifyTo = process.env.CONTACT_NOTIFICATION_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  if (notifyTo && resendKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Vaikusruum <onboarding@resend.dev>",
          to: [notifyTo],
          subject: `Uus ${value.kind} — ${value.name}`,
          text: [`Leht: ${value.pageSlug ?? "—"}`, `Nimi: ${value.name}`, `E-post: ${value.email}`, value.phone ? `Telefon: ${value.phone}` : "", value.message ?? ""]
            .filter(Boolean)
            .join("\n"),
        }),
      });
    } catch {
      // Submission is already stored.
    }
  }

  return { ok: true };
}
