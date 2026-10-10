const NAMED_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

const PROCESSABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/heic-sequence"]);

export function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function guessImageType(file: File): string {
  if (file.type) return file.type;
  return NAMED_TYPES[fileExtension(file.name)] ?? "";
}

export function isSupportedImageFile(file: File): boolean {
  const type = guessImageType(file);
  if (PROCESSABLE.has(type)) return true;
  return Boolean(NAMED_TYPES[fileExtension(file.name)]);
}

export function isHeicLike(file: File): boolean {
  const type = guessImageType(file);
  return type.includes("heic") || type.includes("heif") || /heic|heif/i.test(fileExtension(file.name));
}

export async function compressImage(file: File, maxSize = 2000, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") && !isSupportedImageFile(file)) return file;
  if (file.type === "image/svg+xml") return file;

  const sizes = [maxSize, 1600, 1280, 960];
  let lastError: unknown;
  for (const size of sizes) {
    try {
      return await compressAtSize(file, size, quality);
    } catch (error) {
      lastError = error;
    }
  }
  if (isHeicLike(file)) {
    throw new Error("Seda HEIC/HEIF pilti ei õnnestunud töödelda. Salvesta see JPEG või PNG formaadis ja proovi uuesti.");
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Pilti ei õnnestunud töödelda. Proovi väiksemat JPEG või PNG faili.");
}

async function compressAtSize(file: File, maxSize: number, quality: number): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      isHeicLike(file)
        ? "Seda HEIC/HEIF pilti ei õnnestunud avada. Salvesta see JPEG või PNG formaadis ja proovi uuesti."
        : "Pilti ei õnnestunud avada. Kasuta JPEG, PNG või WebP faili.",
    );
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  if (scale < 1) {
    const resized = await createImageBitmap(bitmap, {
      resizeWidth: Math.round(bitmap.width * scale),
      resizeHeight: Math.round(bitmap.height * scale),
      resizeQuality: "high",
    });
    bitmap.close();
    bitmap = resized;
  }

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Pilti ei õnnestunud vähendada.");
  }
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
  bitmap.close();

  // Safari cannot encode WebP and hands back a PNG instead, several times larger than a JPEG.
  const webp = await canvasToBlob(canvas, "image/webp", quality);
  if (webp && webp.size > 0 && webp.type === "image/webp") return webp;
  // A PNG may be transparent, which JPEG would turn black, so it stays PNG.
  if (webp && webp.size > 0 && guessImageType(file) === "image/png") return webp;
  const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
  if (jpeg && jpeg.size > 0) return jpeg;
  throw new Error("Pilti ei õnnestunud salvestada.");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((value) => resolve(value), type, quality);
  });
}
