import Image from "next/image";
import type { MediaRow } from "@/types/content";
import { mediaPublicUrl } from "@/lib/utils/urls";

export function SiteImage({
  media,
  className,
  sizes = "(min-width: 960px) 50vw, 100vw",
}: {
  media: MediaRow;
  className?: string;
  sizes?: string;
}) {
  const src = mediaPublicUrl(media.storage_path);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={media.alt_text ?? ""}
      width={1600}
      height={1200}
      className={className ?? "vr-photo"}
      sizes={sizes}
      style={{ objectPosition: `${media.focal_x}% ${media.focal_y}%` }}
    />
  );
}
