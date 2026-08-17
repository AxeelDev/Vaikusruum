"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseTheme } from "@/lib/theme/theme";
import { loginSchema } from "@/lib/validation/forms";

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Pole õigust.");
  return admin;
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

  redirect("/admin/sisu");
}

export async function logoutAction() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/admin");
}

export async function saveSectionAction(id: string, content: Record<string, unknown>, style: Record<string, unknown>, enabled: boolean) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("sections").update({ content, style, enabled }).eq("id", id);
  if (error) return { error: "Salvestamine ebaõnnestus." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function savePageMetaAction(
  id: string,
  fields: { title: string; nav_label: string; seo_title: string; seo_description: string; show_in_nav: boolean; is_published: boolean; nav_order: number },
) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("pages").update(fields).eq("id", id);
  if (error) return { error: "Salvestamine ebaõnnestus." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveOfferingAction(id: string, fields: Record<string, unknown>) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("offerings").update(fields).eq("id", id);
  if (error) return { error: "Salvestamine ebaõnnestus." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveEventAction(id: string, fields: Record<string, unknown>) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").update(fields).eq("id", id);
  if (error) return { error: "Salvestamine ebaõnnestus." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createEventAction(offeringId: string, displayDate: string, startsAt: string | null) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").insert({
    offering_id: offeringId,
    display_date: displayDate || null,
    starts_at: startsAt,
    active: true,
    sort_order: 99,
  });
  if (error) return { error: "Kuupäeva lisamine ebaõnnestus." };
  revalidatePath("/admin/tunnid");
  return { ok: true };
}

export async function deleteEventAction(id: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: "Kustutamine ebaõnnestus." };
  revalidatePath("/admin/tunnid");
  return { ok: true };
}

export async function saveThemeAction(tokens: unknown) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("theme_settings").update({ tokens: parseTheme(tokens) }).eq("id", 1);
  if (error) return { error: "Salvestamine ebaõnnestus." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveCustomCssAction(customCss: string) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return { error: "Ainult omanik saab muuta täiendavat CSS-i." };
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("advanced_style_settings")
    .update({ custom_css: customCss, updated_by: admin.id })
    .eq("id", 1);
  if (error) return { error: "Salvestamine ebaõnnestus." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveSiteSettingsAction(fields: Record<string, unknown>) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("site_settings").update(fields).eq("id", 1);
  if (error) return { error: "Salvestamine ebaõnnestus." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateMediaAction(id: string, fields: Record<string, unknown>) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("media").update(fields).eq("id", id);
  if (error) return { error: "Salvestamine ebaõnnestus." };
  revalidatePath("/admin/pildid");
  return { ok: true };
}

export async function deleteMediaAction(id: string, storagePath: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  await supabase.storage.from("site-media").remove([storagePath]);
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return { error: "Kustutamine ebaõnnestus." };
  revalidatePath("/admin/pildid");
  return { ok: true };
}

export async function createAdminAction(email: string, password: string, role: "owner" | "editor") {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return { error: "Ainult omanik saab lisada haldureid." };
  const { createServiceSupabase } = await import("@/lib/supabase/service");
  const service = createServiceSupabase();
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) return { error: "Kasutaja loomine ebaõnnestus." };
  const { error: insertError } = await service.from("admin_users").insert({
    user_id: data.user.id,
    role,
    display_name: email,
  });
  if (insertError) return { error: "Halduri lisamine ebaõnnestus." };
  revalidatePath("/admin/seaded");
  return { ok: true };
}

export async function removeAdminAction(userId: string) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return { error: "Ainult omanik saab haldureid eemaldada." };
  if (admin.id === userId) return { error: "Iseennast ei saa eemaldada." };
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("admin_users").delete().eq("user_id", userId);
  if (error) return { error: "Eemaldamine ebaõnnestus." };
  revalidatePath("/admin/seaded");
  return { ok: true };
}

export async function deleteSubmissionAction(id: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("form_submissions").delete().eq("id", id);
  if (error) return { error: "Kustutamine ebaõnnestus." };
  revalidatePath("/admin/registreerumised");
  return { ok: true };
}
