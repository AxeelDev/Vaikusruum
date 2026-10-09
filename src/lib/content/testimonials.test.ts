import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AVATAR_PLACEHOLDER, NAME_PLACEHOLDER, testimonialDisplay } from "@/lib/content/testimonials";

const base = { quote: "Väga hea tund.", name: "Mari", show_name: true, show_photo: true, photo: { storage_path: "a/b.jpg" } };

describe("testimonialDisplay", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"));
  afterEach(() => vi.unstubAllEnvs());

  it("shows the name and the chosen photo", () => {
    const shown = testimonialDisplay(base);
    expect(shown.name).toBe("Mari");
    expect(shown.photo).toBe("https://example.supabase.co/storage/v1/object/public/site-media/a/b.jpg");
    expect(shown.photoIsPlaceholder).toBe(false);
  });

  it("uses the stand-ins when name or photo are on but missing", () => {
    const shown = testimonialDisplay({ ...base, name: "  ", photo: null });
    expect(shown.name).toBe(NAME_PLACEHOLDER);
    expect(shown.photo).toBe(AVATAR_PLACEHOLDER);
    expect(shown.photoIsPlaceholder).toBe(true);
    expect(testimonialDisplay({ ...base, name: null }).name).toBe("Joogakäija");
  });

  it("leaves out what is switched off, even when it exists", () => {
    expect(testimonialDisplay({ ...base, show_name: false }).name).toBeNull();
    expect(testimonialDisplay({ ...base, show_photo: false }).photo).toBeNull();
    const none = testimonialDisplay({ ...base, show_name: false, show_photo: false });
    expect([none.name, none.photo]).toEqual([null, null]);
  });

  it("splits the quote into paragraphs and drops blank lines", () => {
    expect(testimonialDisplay({ ...base, quote: "Üks.\n\n  Kaks.\n" }).paragraphs).toEqual(["Üks.", "Kaks."]);
  });
});
