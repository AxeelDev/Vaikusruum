/**
 * Reads pixel dimensions from the first bytes of a PNG, JPEG or WebP file, so pages can reserve
 * the right space for an image before it loads. Returns null when the header is not understood.
 */
export function readImageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number, length: number) =>
    offset + length <= bytes.length ? String.fromCharCode(...bytes.subarray(offset, offset + length)) : "";

  // PNG: signature, then the IHDR chunk with width and height as 32-bit big-endian.
  if (bytes.length >= 24 && bytes[0] === 0x89 && ascii(1, 3) === "PNG" && ascii(12, 4) === "IHDR") {
    return valid(view.getUint32(16), view.getUint32(20));
  }

  // JPEG: walk the segments until a start-of-frame marker, which holds height then width.
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        offset++;
        continue;
      }
      // Markers without a length field.
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const length = view.getUint16(offset + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return valid(view.getUint16(offset + 7), view.getUint16(offset + 5));
      offset += 2 + length;
    }
    return null;
  }

  // WebP: RIFF container with a VP8, VP8L or VP8X chunk.
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP" && bytes.length >= 30) {
    const chunk = ascii(12, 4);
    if (chunk === "VP8 ") return valid(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
    if (chunk === "VP8L") {
      const b = bytes.subarray(21, 25);
      return valid(1 + (((b[1] & 0x3f) << 8) | b[0]), 1 + (((b[3] & 0x0f) << 10) | (b[2] << 2) | ((b[1] & 0xc0) >> 6)));
    }
    if (chunk === "VP8X") {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return valid(width, height);
    }
  }
  return null;
}

function valid(width: number, height: number) {
  return width > 0 && height > 0 && width < 100_000 && height < 100_000 ? { width, height } : null;
}
