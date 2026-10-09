import Image from "next/image";
import type { MediaRow } from "@/types/content";
import { mediaPublicUrl } from "@/lib/utils/urls";

export function SiteImage({
  media,
  className,
  sizes = "(min-width: 960px) 50vw, 100vw",
  draggable,
  priority = false,
}: {
  media: MediaRow;
  className?: string;
  sizes?: string;
  draggable?: boolean;
  priority?: boolean;
}) {
  const src = mediaPublicUrl(media.storage_path);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={media.alt_text ?? ""}
      // The real size lets the browser reserve the right box before the file arrives.
      width={media.width ?? 1600}
      height={media.height ?? 1200}
      className={className ?? "vr-photo"}
      sizes={sizes}
      // Above-the-fold images start downloading from the page head instead of waiting to be discovered.
      preload={priority}
      draggable={draggable}
      style={{
        width: "100%",
        height: "auto",
        objectPosition: `${media.focal_x}% ${media.focal_y}%`,
      }}
    />
  );
}
