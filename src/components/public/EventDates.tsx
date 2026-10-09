import { groupEventsByMonth } from "@/lib/content/events";
import type { EventRow } from "@/types/content";

/** Upcoming dates, one line per month. A time is shown beside a date only when that date's time differs from the others. */
export function EventDates({ events }: { events: EventRow[] }) {
  const { months, other } = groupEventsByMonth(events);
  if (!months.length && !other.length) return null;
  return (
    <dl className="vr-dates">
      {months.map((month) => (
        <div className="vr-dates-row" key={month.key}>
          <dt className="vr-dates-month">{month.label}</dt>
          <dd className="vr-dates-days">
            {month.days.map((day) => (
              <span className="vr-dates-day" key={day.id}>
                <span className="vr-date-day">{day.day}</span>
                {day.time ? <span className="vr-date-time"> kell {day.time}</span> : null}
              </span>
            ))}
          </dd>
        </div>
      ))}
      {other.map((item) => (
        <div className="vr-dates-row" key={item.id}>
          <dt className="vr-sr-only">Aeg</dt>
          <dd className="vr-dates-days vr-dates-days--only">
            <span className="vr-dates-day">
              <span className="vr-date-day">{item.text}</span>
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
