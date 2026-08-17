import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upload(localPath: string, storagePath: string, type: string, alt: string) {
  const buffer = readFileSync(localPath);
  const { error: uploadError } = await supabase.storage.from("site-media").upload(storagePath, buffer, {
    contentType: type,
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await supabase.from("media").upsert(
    {
      storage_path: storagePath,
      alt_text: alt,
      focal_x: 50,
      focal_y: 50,
    },
    { onConflict: "storage_path" },
  );
  if (error) throw new Error(error.message);
}

async function main() {
  const logo = resolve(process.cwd(), "public/brand/logo.png");
  await upload(logo, "brand/logo.png", "image/png", "Vaikusruum");
  console.log("Media seed complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Media seed failed");
  process.exit(1);
});
