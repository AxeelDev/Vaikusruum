"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createServiceSupabase } from "@/lib/supabase/service";
import { sendMail } from "@/lib/email/send";
import { submissionEmail } from "@/lib/email/submission";
import { contactSchema } from "@/lib/validation/forms";

export type SubmitResult = { ok: true } | { ok: false; error: string };

const RATE_LIMIT = { max: 5, windowMinutes: 10 };
// A person needs a few seconds to fill the form; bots post instantly.
const MIN_FILL_MS = 2500;

function hashIp(ip: string) {
  const salt = process.env.IP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "vaikusruum";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

async function clientIp() {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
}

export async function submitPublicForm(input: unknown): Promise<SubmitResult> {
  // Honeypot and timing: answer "ok" so a bot learns nothing, but store nothing.
  const raw = (input ?? {}) as Record<string, unknown>;
  const startedAt = Number(raw.startedAt);
  if (typeof raw.website === "string" && raw.website.trim()) return { ok: true };
  if (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_FILL_MS) return { ok: true };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Palun kontrolli välju." };
  }
  const value = parsed.data;

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch (error) {
    console.error("[form] service client unavailable:", error);
    return { ok: false, error: "Saatmine ei õnnestunud. Proovi palun hetke pärast uuesti." };
  }

  const ipHash = hashIp(await clientIp());
  const since = new Date(Date.now() - RATE_LIMIT.windowMinutes * 60_000).toISOString();
  const { count } = await supabase
    .from("form_submissions")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((count ?? 0) >= RATE_LIMIT.max) {
    return { ok: false, error: "Liiga palju sõnumeid lühikese aja jooksul. Proovi palun mõne minuti pärast uuesti." };
  }

  const { error } = await supabase.from("form_submissions").insert({
    kind: value.kind,
    offering_id: value.offeringId || null,
    name: value.name,
    email: value.email,
    phone: value.phone || null,
    message: value.message || null,
    preferred_date: value.preferredDate || null,
    page_slug: value.pageSlug || null,
    consent: value.consent,
    ip_hash: ipHash,
  });
  if (error) {
    console.error("[form] insert failed:", error.message);
    return { ok: false, error: "Saatmine ei õnnestunud. Proovi palun hetke pärast uuesti." };
  }

  // The message is stored; a failed e-mail is logged but never shown to the visitor as a failure.
  try {
    const [{ data: settings }, offering] = await Promise.all([
      supabase.from("site_settings").select("site_name, contact_email, default_registration_email").eq("id", 1).maybeSingle(),
      value.offeringId
        ? supabase.from("offerings").select("title, registration_email").eq("id", value.offeringId).maybeSingle().then((r) => r.data)
        : Promise.resolve(null),
    ]);
    const to =
      (value.kind === "registration" ? offering?.registration_email || settings?.default_registration_email : null) ||
      settings?.contact_email ||
      process.env.CONTACT_NOTIFICATION_EMAIL;
    if (to) {
      const mail = submissionEmail({ ...value, offeringTitle: offering?.title ?? null, siteName: settings?.site_name ?? "Vaikusruum" });
      await sendMail({ to, replyTo: value.email, subject: mail.subject, text: mail.text });
    } else {
      console.error("[form] no notification address configured");
    }
  } catch (mailError) {
    console.error("[form] notification failed:", mailError);
  }

  return { ok: true };
}
