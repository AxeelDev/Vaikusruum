import { createBrowserSupabase } from "@/lib/supabase/browser";
import { compressImage, fileExtension, isSupportedImageFile } from "@/lib/utils/prepare-image";
import type { MediaRow } from "@/types/content";

export type UploadProgress = "checking" | "preparing" | "uploading" | "saving" | "done";

export type UploadResult =
  | { ok: true; item: MediaRow }
  | { ok: false; error: string };

const MAX_BYTES = 15 * 1024 * 1024;

export function uploadProgressLabel(progress: UploadProgress): string {
  switch (progress) {
    case "checking":
      return "Kontrollin faili…";
    case "preparing":
      return "Valmistan pilti…";
    case "uploading":
      return "Laen faili üles…";
    case "saving":
      return "Salvestan andmed…";
    case "done":
      return "Pilt on lisatud.";
  }
}

export async function uploadSiteMedia(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  onProgress?.("checking");
  if (!isSupportedImageFile(file)) {
    return { ok: false, error: "Kasuta JPEG, PNG, WebP või HEIC pilti." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Fail on liiga suur. Lubatud on kuni 15 MB." };
  }

  onProgress?.("preparing");
  let blob: Blob;
  try {
    blob = await compressImage(file);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Pilti ei õnnestunud töödelda." };
  }

  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : fileExtension(file.name) || "jpg";
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const supabase = createBrowserSupabase();

  onProgress?.("uploading");
  const { error: uploadError } = await supabase.storage.from("site-media").upload(path, blob, {
    contentType: blob.type || file.type || "image/jpeg",
  });
  if (uploadError) {
    return { ok: false, error: uploadError.message ? `Üleslaadimine ebaõnnestus. ${uploadError.message}` : "Üleslaadimine ebaõnnestus." };
  }

  onProgress?.("saving");
  const { data, error } = await supabase
    .from("media")
    .insert({
      storage_path: path,
      alt_text: file.name.replace(/\.[^.]+$/, ""),
    })
    .select("*")
    .single();

  if (error || !data) {
    await supabase.storage.from("site-media").remove([path]);
    return { ok: false, error: "Fail jõudis salvesse, kuid kirje salvestamine ebaõnnestus. Proovi uuesti." };
  }

  onProgress?.("done");
  return { ok: true, item: data as MediaRow };
}
