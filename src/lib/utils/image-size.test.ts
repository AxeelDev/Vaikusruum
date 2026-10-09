import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readImageSize } from "@/lib/utils/image-size";

const file = (path: string) => new Uint8Array(readFileSync(resolve(process.cwd(), path)));

describe("readImageSize", () => {
  it("reads PNG dimensions", () => {
    expect(readImageSize(file("public/brand/logo-vaikusruum.png"))).toEqual({ width: 1200, height: 1215 });
    expect(readImageSize(file("public/brand/logo.png"))).toEqual({ width: 500, height: 500 });
  });

  it("reads JPEG dimensions past an APP segment", () => {
    // SOI, APP0 (16 bytes), SOF0 with height 300, width 200.
    const jpeg = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0),
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x2c, 0x00, 0xc8, 0x03,
    ]);
    expect(readImageSize(jpeg)).toEqual({ width: 200, height: 300 });
  });

  it("reads WebP VP8X dimensions", () => {
    const webp = new Uint8Array(30);
    webp.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
    webp.set([..."WEBP"].map((c) => c.charCodeAt(0)), 8);
    webp.set([..."VP8X"].map((c) => c.charCodeAt(0)), 12);
    webp.set([639 & 0xff, 639 >> 8, 0], 24);
    webp.set([479 & 0xff, 479 >> 8, 0], 27);
    expect(readImageSize(webp)).toEqual({ width: 640, height: 480 });
  });

  it("returns null for anything else", () => {
    expect(readImageSize(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(readImageSize(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
});
