"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { sanitizeHref } from "@/lib/content/markdown";
import type { EditorChanges } from "@/lib/editor/save-payload";
import { parseTheme } from "@/lib/theme/theme";
import { loginSchema } from "@/lib/validation/forms";
import type { RegistrationMode } from "@/types/content";

const REGISTRATION_MODES: RegistrationMode[] = ["form", "email", "external_link", "form_and_email", "disabled"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function cleanRegistrationUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Pole õigust.");
  return admin;
}

/** Public pages are cached; anything visible on them must refresh the cache. */
function refreshPublicSite() {
  revalidatePath("/", "layout");
}

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Palun sisesta e-post ja parool." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Sisselogimine ebaõnnestus." };

  const admin = await getAdminUser();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "Sellel kontol ei ole haldusõigust." };
  }

  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/admin");
}

const optionalUrl = z.string().trim().url().max(300).nullable();

const settingsSchema = z.object({
  site_name: z.string().trim().min(1).max(120),
  contact_name: z.string().trim().max(120).nullable(),
  contact_email: z.string().trim().email().max(200).nullable(),
  contact_phone: z.string().trim().max(40).nullable(),
  company_name: z.string().trim().max(160).nullable(),
  registry_code: z.string().trim().max(40).nullable(),
  iban: z.string().trim().max(40).nullable(),
  bank: z.string().trim().max(80).nullable(),
  default_registration_email: z.string().trim().email().max(200).nullable(),
  footer_text: z.string().trim().max(400).nullable(),
  social: z.object({ instagram: optionalUrl, facebook: optionalUrl, pinterest: optionalUrl, youtube: optionalUrl }),
});

export async function saveSiteSettingsAction(fields: unknown) {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(fields);
  if (!parsed.success) return { error: "Kontrolli välju: mõni e-post või link ei ole korrektne." };
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
  if (error) return { error: "Salvestamine ebaõnnestus." };
  refreshPublicSite();
  return { ok: true };
}

export async function updateMediaAction(id: string, fields: { alt_text?: string | null; focal_x?: number; focal_y?: number }) {
  await requireAdmin();
  if (!UUID.test(id)) return { error: "Pilti ei leitud." };
  const next: Record<string, unknown> = {};
  if (fields.alt_text !== undefined) next.alt_text = fields.alt_text?.trim().slice(0, 300) || null;
  for (const key of ["focal_x", "focal_y"] as const) {
    const value = fields[key];
    if (value !== undefined) next[key] = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("media").update(next).eq("id", id);
  if (error) return { error: "Salvestamine ebaõnnestus." };
  revalidatePath("/admin/media");
  refreshPublicSite();
  return { ok: true };
}

export async function deleteMediaAction(id: string, storagePath: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return { error: "Kustutamine ebaõnnestus." };
  await supabase.storage.from("site-media").remove([storagePath]);
  revalidatePath("/admin/media");
  refreshPublicSite();
  return { ok: true };
}

const newAdminSchema = z.object({
  email: z.string().trim().email("Kontrolli e-posti aadressi."),
  password: z.string().min(10, "Parool peab olema vähemalt 10 märki."),
  role: z.enum(["owner", "editor"]),
});

export async function createAdminAction(email: string, password: string, role: "owner" | "editor") {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return { error: "Ainult omanik saab lisada haldureid." };
  const parsed = newAdminSchema.safeParse({ email, password, role });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };
  const { createServiceSupabase } = await import("@/lib/supabase/service");
  const service = createServiceSupabase();
  const { data, error } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (error || !data.user) return { error: "Kasutaja loomine ebaõnnestus. Võib-olla on see e-post juba kasutusel." };
  const { error: insertError } = await service.from("admin_users").insert({
    user_id: data.user.id,
    role: parsed.data.role,
    display_name: parsed.data.email,
  });
  if (insertError) {
    // Do not leave a login account behind that has no admin role.
    await service.auth.admin.deleteUser(data.user.id);
    return { error: "Halduri lisamine ebaõnnestus." };
  }
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function removeAdminAction(userId: string) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return { error: "Ainult omanik saab haldureid eemaldada." };
  if (admin.id === userId) return { error: "Iseennast ei saa eemaldada." };
  if (!UUID.test(userId)) return { error: "Kasutajat ei leitud." };
  const { createServiceSupabase } = await import("@/lib/supabase/service");
  const service = createServiceSupabase();
  // Deleting the login account also removes the admin row (on delete cascade), so no sign-in remains.
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return { error: "Eemaldamine ebaõnnestus." };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function deleteSubmissionAction(id: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("form_submissions").delete().eq("id", id);
  if (error) return { error: "Kustutamine ebaõnnestus." };
  revalidatePath("/admin/submissions");
  return { ok: true };
}

const testimonialSchema = z.object({
  quote: z.string().trim().min(1, "Tagasiside tekst on kohustuslik.").max(1200, "Tagasiside võib olla kuni 1200 märki pikk."),
  name: z
    .string()
    .trim()
    .max(120, "Nimi võib olla kuni 120 märki pikk.")
    .nullable()
    .transform((value) => value || null),
  photo_media_id: z.string().regex(UUID).nullable(),
  show_name: z.boolean(),
  show_photo: z.boolean(),
  published: z.boolean(),
});

export type TestimonialFields = z.input<typeof testimonialSchema>;
export type TestimonialResult = { ok: true; id?: string } | { error: string };

function refreshTestimonials() {
  revalidatePath("/admin/tagasiside");
  refreshPublicSite();
}

export async function createTestimonialAction(fields: TestimonialFields): Promise<TestimonialResult> {
  await requireAdmin();
  const parsed = testimonialSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };
  const supabase = await createServerSupabase();
  // New testimonials go to the end of the list.
  const { data: last } = await supabase.from("testimonials").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("testimonials")
    .insert({ ...parsed.data, sort_order: (last?.sort_order ?? -1) + 1 })
    .select("id")
    .single();
  if (error || !data) return { error: "Lisamine ebaõnnestus." };
  refreshTestimonials();
  return { ok: true, id: data.id as string };
}

export async function updateTestimonialAction(id: string, fields: TestimonialFields): Promise<TestimonialResult> {
  await requireAdmin();
  if (!UUID.test(id)) return { error: "Tagasisidet ei leitud." };
  const parsed = testimonialSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("testimonials").update(parsed.data).eq("id", id).select("id");
  if (error) return { error: "Salvestamine ebaõnnestus." };
  if (!data?.length) return { error: "Tagasisidet ei leitud. Võib-olla kustutati see vahepeal." };
  refreshTestimonials();
  return { ok: true };
}

export async function deleteTestimonialAction(id: string): Promise<TestimonialResult> {
  await requireAdmin();
  if (!UUID.test(id)) return { error: "Tagasisidet ei leitud." };
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return { error: "Kustutamine ebaõnnestus." };
  refreshTestimonials();
  return { ok: true };
}

/** Saves the order: the ids in the order they should appear. */
export async function reorderTestimonialsAction(ids: string[]): Promise<TestimonialResult> {
  await requireAdmin();
  if (!Array.isArray(ids) || ids.length > 500 || ids.some((id) => !UUID.test(id)) || new Set(ids).size !== ids.length) {
    return { error: "Järjekorda ei õnnestunud salvestada." };
  }
  const supabase = await createServerSupabase();
  for (const [index, id] of ids.entries()) {
    const { error } = await supabase.from("testimonials").update({ sort_order: index }).eq("id", id);
    if (error) return { error: "Järjekorra salvestamine ebaõnnestus." };
  }
  refreshTestimonials();
  return { ok: true };
}

export type SaveDraftResult = { ok: true; revision: number } | { error: string; conflict?: boolean };

function text(value: unknown, max: number): string | null {
  if (value == null) return null;
  return String(value).slice(0, max);
}

/** Checks and normalises the changes before they reach the database, which applies them in one transaction. */
function cleanChanges(changes: EditorChanges, role: "owner" | "editor"): EditorChanges | string {
  const out: EditorChanges = {};
  const ids = (list: string[] | undefined) => (list ?? []).filter((id) => UUID.test(id));

  if (changes.pages?.length) {
    out.pages = [];
    for (const page of changes.pages) {
      if (!UUID.test(page.id)) return "Lehte ei leitud.";
      out.pages.push({
        id: page.id,
        title: text(page.title, 160) || "Leht",
        nav_label: text(page.nav_label, 80),
        show_in_nav: Boolean(page.show_in_nav),
        nav_order: Math.round(Number(page.nav_order) || 0),
        is_published: Boolean(page.is_published),
        seo_title: text(page.seo_title, 160),
        seo_description: text(page.seo_description, 400),
        // Only the owner may change addresses; anyone else keeps the current slug (null leaves it unchanged).
        slug: (role === "owner" && page.slug && SLUG.test(page.slug) ? page.slug : null) as string,
      });
    }
  }

  if (changes.sections?.length) {
    out.sections = [];
    for (const section of changes.sections) {
      if (!UUID.test(section.id) || !UUID.test(section.page_id)) return "Sektsiooni ei leitud.";
      out.sections.push({
        id: section.id,
        page_id: section.page_id,
        section_key: String(section.section_key).slice(0, 80),
        section_type: section.section_type,
        sort_order: Math.round(Number(section.sort_order) || 0),
        enabled: Boolean(section.enabled),
        content: section.content && typeof section.content === "object" ? section.content : {},
        style: section.style && typeof section.style === "object" ? section.style : {},
      });
    }
  }
  if (changes.deletedSectionIds?.length) out.deletedSectionIds = ids(changes.deletedSectionIds);

  if (changes.offerings?.length) {
    out.offerings = [];
    for (const offering of changes.offerings) {
      if (!UUID.test(offering.id)) return "Tundi ei leitud.";
      const mode = REGISTRATION_MODES.includes(offering.registration_mode) ? offering.registration_mode : "form";
      const url = cleanRegistrationUrl(offering.registration_url);
      if (mode === "external_link" && !url) return "Registreerimise link peab algama https://-ga.";
      out.offerings.push({
        id: offering.id,
        title: text(offering.title, 160) || "Tund",
        short_title: text(offering.short_title, 160),
        location_name: text(offering.location_name, 160),
        address: text(offering.address, 200),
        schedule_summary: text(offering.schedule_summary, 200),
        tasakaal: text(offering.tasakaal, 200),
        registration_mode: mode,
        registration_url: url,
        registration_email: text(offering.registration_email?.trim() || null, 200),
      });
    }
  }

  if (changes.events?.length) {
    out.events = [];
    for (const event of changes.events) {
      if (!UUID.test(event.id) || !UUID.test(event.offering_id)) return "Kuupäeva ei leitud.";
      const iso = (value: string | null) => (value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null);
      const startsAt = iso(event.starts_at);
      const endsAt = iso(event.ends_at);
      if (startsAt && endsAt && endsAt < startsAt) return "Tunni lõpp peab olema pärast algust.";
      out.events.push({
        id: event.id,
        offering_id: event.offering_id,
        starts_at: startsAt,
        ends_at: endsAt,
        display_date: text(event.display_date, 60),
        sort_order: Math.round(Number(event.sort_order) || 0),
        active: event.active !== false,
      });
    }
  }
  if (changes.deletedEventIds?.length) out.deletedEventIds = ids(changes.deletedEventIds);

  if (changes.media?.length) {
    out.media = changes.media
      .filter((item) => UUID.test(item.id))
      .map((item) => ({
        id: item.id,
        alt_text: text(item.alt_text, 300),
        focal_x: Math.min(100, Math.max(0, Math.round(Number(item.focal_x) || 0))),
        focal_y: Math.min(100, Math.max(0, Math.round(Number(item.focal_y) || 0))),
      }));
  }

  if (changes.settings) {
    const social = Object.fromEntries(
      Object.entries(changes.settings.social ?? {}).map(([key, value]) => [key, typeof value === "string" && value ? sanitizeHref(value) : null]),
    );
    // An empty line in the contact block means "leave it out", so blanks are stored as null.
    const line = (value: unknown, max: number) => text(typeof value === "string" ? value.trim() || null : value, max);
    out.settings = {
      site_name: text(changes.settings.site_name, 120) || "Vaikusruum",
      contact_name: line(changes.settings.contact_name, 120),
      contact_email: line(changes.settings.contact_email, 200),
      contact_phone: line(changes.settings.contact_phone, 40),
      company_name: line(changes.settings.company_name, 160),
      registry_code: line(changes.settings.registry_code, 40),
      iban: line(changes.settings.iban, 40),
      bank: line(changes.settings.bank, 80),
      footer_text: text(changes.settings.footer_text, 400),
      social,
    };
  }

  if (changes.theme !== undefined) out.theme = parseTheme(changes.theme);

  if (changes.customCss !== undefined) {
    if (role !== "owner") return "Ainult omanik saab muuta täiendavat CSS-i.";
    out.customCss = String(changes.customCss).slice(0, 50_000);
  }

  return out;
}

export async function saveEditorDraftAction(expectedRevision: number, changes: EditorChanges): Promise<SaveDraftResult> {
  const admin = await requireAdmin();
  const cleaned = cleanChanges(changes, admin.role);
  if (typeof cleaned === "string") return { error: cleaned };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("save_editor_draft", {
    p_expected_revision: expectedRevision,
    p_changes: cleaned,
  });
  if (error) {
    if (error.code === "PT409" || error.message.includes("revision_conflict")) {
      return {
        conflict: true,
        error: "Vahepeal on veebilehte muudetud (teises aknas või teise inimese poolt). Laadi editor uuesti, et oma muudatusi mitte üle kirjutada.",
      };
    }
    console.error("[editor] save failed:", error.message);
    return { error: "Salvestamine ebaõnnestus. Midagi ei muudetud; proovi uuesti." };
  }

  refreshPublicSite();
  return { ok: true, revision: Number(data) };
}
