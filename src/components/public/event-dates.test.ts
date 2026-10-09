import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventDates } from "@/components/public/EventDates";
import type { EventRow } from "@/types/content";

function event(id: string, startsAt: string, endsAt: string | null, sort = 0): EventRow {
  return { id, offering_id: "o1", starts_at: startsAt, ends_at: endsAt, display_date: null, sort_order: sort, active: true };
}

const markup = (events: EventRow[]) => renderToStaticMarkup(createElement(EventDates, { events }));

describe("EventDates", () => {
  const events = [
    event("1", "2026-10-19T19:00:00+03:00", "2026-10-19T20:30:00+03:00"),
    event("2", "2026-11-02T19:00:00+02:00", "2026-11-02T20:30:00+02:00"),
    event("3", "2026-11-23T19:00:00+02:00", "2026-11-23T20:30:00+02:00"),
    event("4", "2026-12-07T19:00:00+02:00", "2026-12-07T20:30:00+02:00"),
  ];

  it("shows one row per month and leaves out a time shared by every date", () => {
    const html = markup(events);
    expect(html.match(/vr-dates-month/g)).toHaveLength(3);
    for (const month of ["oktoober", "november", "detsember"]) expect(html).toContain(month);
    expect(html).toContain("19.10");
    expect(html).toContain("2.11");
    expect(html).toContain("23.11");
    expect(html).toContain("7.12");
    expect(html).not.toContain("kell");
  });

  it("keeps each date's own time when they differ", () => {
    const html = markup([event("1", "2026-11-02T19:00:00+02:00", null), event("2", "2026-11-23T18:00:00+02:00", null)]);
    expect(html).toContain("kell 19:00");
    expect(html).toContain("kell 18:00");
  });

  it("renders nothing for no dates", () => {
    expect(markup([])).toBe("");
  });
});
