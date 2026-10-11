import { EditorTextarea } from "@/components/editor/ui";
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
        <EditorTextarea rows={1} ariaLabel="Teenuse pealkiri" value={heading ?? ""} onChange={(next) => patch({ heading: next })} />
      </label>
      <label className="vr-field">
        Sissejuhatus
        <EditorTextarea rows={3} ariaLabel="Sissejuhatus" value={label} onChange={(next) => patch({ label: next })} />
      </label>
      {lessons.map((lesson, index) => (
        <fieldset key={index} className="vr-admin-section">
          <legend>Tund {index + 1}</legend>
          <label className="vr-field">
            Nimi
            <EditorTextarea
              rows={1}
              value={lesson.title}
              onChange={(next) =>
                patch({
                  lessons: lessons.map((item, itemIndex) => (itemIndex === index ? { ...item, title: next } : item)),
                })
              }
            />
          </label>
          <label className="vr-field">
            Kestus
            <EditorTextarea
              rows={1}
              value={lesson.duration}
              onChange={(next) =>
                patch({
                  lessons: lessons.map((item, itemIndex) => (itemIndex === index ? { ...item, duration: next } : item)),
                })
              }
            />
          </label>
          <label className="vr-field">
            Kirjeldus
            <EditorTextarea
              rows={3}
              value={lesson.description}
              onChange={(next) =>
                patch({
                  lessons: lessons.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, description: next } : item,
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
            <EditorTextarea
              rows={1}
              value={price.label}
              onChange={(next) =>
                patch({
                  prices: prices.map((item, itemIndex) => (itemIndex === index ? { ...item, label: next } : item)),
                })
              }
            />
          </label>
          <label className="vr-field">
            Summa
            <EditorTextarea
              rows={1}
              value={price.amount}
              onChange={(next) =>
                patch({
                  prices: prices.map((item, itemIndex) => (itemIndex === index ? { ...item, amount: next } : item)),
                })
              }
            />
          </label>
        </div>
      ))}
      <label className="vr-field">
        Nupu tekst
        <EditorTextarea rows={1} ariaLabel="Nupu tekst" value={actionLabel} onChange={(next) => patch({ actionLabel: next })} />
      </label>
      <label className="vr-field">
        Nupu viide
        <input value={actionHref} onChange={(event) => patch({ actionHref: event.target.value })} />
      </label>
    </>
  );
}
