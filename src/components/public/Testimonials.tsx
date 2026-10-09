import { testimonialDisplay } from "@/lib/content/testimonials";
import type { TestimonialWithPhoto } from "@/types/content";

/** One testimonial: the quote between large decorative quotation marks, then the photo and name when they are on. */
export function Testimonial({ item, hidden = false }: { item: TestimonialWithPhoto; hidden?: boolean }) {
  const { paragraphs, name, photo } = testimonialDisplay(item);
  return (
    <figure className={["vr-testimonial", hidden ? "vr-editor-hidden" : ""].filter(Boolean).join(" ")} title={hidden ? "Avalikul lehel peidetud" : undefined}>
      <span className="vr-testimonial-mark vr-testimonial-mark--open" aria-hidden="true">
        „
      </span>
      <blockquote className="vr-testimonial-quote">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </blockquote>
      <span className="vr-testimonial-mark vr-testimonial-mark--close" aria-hidden="true">
        “
      </span>
      {name || photo ? (
        <figcaption className="vr-testimonial-by">
          {photo ? (
            // A 56px portrait: the file is small, so there is nothing for next/image to resize.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="vr-testimonial-photo" src={photo} alt="" width={56} height={56} loading="lazy" />
          ) : null}
          {name ? <span className="vr-testimonial-name">{name}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function TestimonialList({ items, showHidden = false }: { items: TestimonialWithPhoto[]; showHidden?: boolean }) {
  const shown = showHidden ? items : items.filter((item) => item.published);
  return (
    <div className="vr-testimonials">
      {shown.map((item) => (
        <Testimonial key={item.id} item={item} hidden={!item.published} />
      ))}
    </div>
  );
}
