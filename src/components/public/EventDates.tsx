import { formatEventOccurrence } from "@/lib/content/events";
import type { EventRow } from "@/types/content";

export function EventDates({ events }: { events: EventRow[] }) {
  if (!events.length) return null;
  return (
    <ul className="vr-dates">
      {events.map((event) => {
        const formatted = formatEventOccurrence(event);
        if (!formatted.date) return null;
        return (
          <li key={event.id}>
            <span className="vr-date-day">{formatted.date}</span>
            {formatted.time ? <span className="vr-date-time">{formatted.time}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
