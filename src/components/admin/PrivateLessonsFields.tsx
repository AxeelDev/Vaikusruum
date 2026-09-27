import type { PrivateLessonItem, PrivatePriceItem } from "@/lib/content/private-lessons";

export function PrivateLessonsFields({
  heading,
  label,
  actionLabel,
  actionHref,
  lessons,
  prices,
  onChange,
}: {
  heading?: string;
  label: string;
  actionLabel: string;
  actionHref: string;
  lessons: PrivateLessonItem[];
  prices: PrivatePriceItem[];
  onChange: (next: {
    heading?: string;
    label: string;
    actionLabel: string;
    actionHref: string;
    lessons: PrivateLessonItem[];
    prices: PrivatePriceItem[];
  }) => void;
}) {
  function patch(partial: Partial<Parameters<typeof onChange>[0]>) {
    onChange({
      heading,
      label,
      actionLabel,
      actionHref,
      lessons,
      prices,
      ...partial,
    });
  }

  return (
    <>
      <label className="vr-field">
        Teenuse pealkiri
        <input value={heading ?? ""} onChange={(event) => patch({ heading: event.target.value })} />
      </label>
      <label className="vr-field">
        Sissejuhatus
        <textarea value={label} onChange={(event) => patch({ label: event.target.value })} />
      </label>
      {lessons.map((lesson, index) => (
        <fieldset key={index} className="vr-admin-section">
          <legend>Tund {index + 1}</legend>
          <label className="vr-field">
            Nimi
            <input
              value={lesson.title}
              onChange={(event) =>
                patch({
                  lessons: lessons.map((item, itemIndex) => (itemIndex === index ? { ...item, title: event.target.value } : item)),
                })
              }
            />
          </label>
          <label className="vr-field">
            Kestus
            <input
              value={lesson.duration}
              onChange={(event) =>
                patch({
                  lessons: lessons.map((item, itemIndex) => (itemIndex === index ? { ...item, duration: event.target.value } : item)),
                })
              }
            />
          </label>
          <label className="vr-field">
            Kirjeldus
            <textarea
              value={lesson.description}
              onChange={(event) =>
                patch({
                  lessons: lessons.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, description: event.target.value } : item,
                  ),
                })
              }
            />
          </label>
        </fieldset>
      ))}
      {prices.map((price, index) => (
        <div key={index} className="vr-admin-actions">
          <label className="vr-field">
            Hinna nimi
            <input
              value={price.label}
              onChange={(event) =>
                patch({
                  prices: prices.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item)),
                })
              }
            />
          </label>
          <label className="vr-field">
            Summa
            <input
              value={price.amount}
              onChange={(event) =>
                patch({
                  prices: prices.map((item, itemIndex) => (itemIndex === index ? { ...item, amount: event.target.value } : item)),
                })
              }
            />
          </label>
        </div>
      ))}
      <label className="vr-field">
        Nupu tekst
        <input value={actionLabel} onChange={(event) => patch({ actionLabel: event.target.value })} />
      </label>
      <label className="vr-field">
        Nupu viide
        <input value={actionHref} onChange={(event) => patch({ actionHref: event.target.value })} />
      </label>
    </>
  );
}
