import { describe, expect, it } from "vitest";
import { formatEventOccurrence, tallinnLocalToIso } from "@/lib/content/events";

describe("formatEventOccurrence", () => {
  it("formats a Tallinn evening range without shifting the calendar day", () => {
    const formatted = formatEventOccurrence({
      starts_at: "2026-09-28T16:00:00.000Z",
      ends_at: "2026-09-28T17:30:00.000Z",
      display_date: "28.09",
    });
    expect(formatted.date).toBe("28.09.2026");
    expect(formatted.time).toBe("19:00–20:30");
  });

  it("keeps a date-only fallback when no timestamp exists", () => {
    expect(formatEventOccurrence({ starts_at: null, ends_at: null, display_date: "5.10" })).toEqual({
      date: "5.10",
    });
  });
});

describe("tallinnLocalToIso", () => {
  it("keeps a September evening on the same calendar date", () => {
    const iso = tallinnLocalToIso("2026-09-28T19:00");
    expect(iso).toBe("2026-09-28T19:00:00+03:00");
    expect(formatEventOccurrence({ starts_at: iso, ends_at: null, display_date: null }).date).toBe("28.09.2026");
  });

  it("keeps a November evening at 19:00 after the clock change", () => {
    const start = tallinnLocalToIso("2026-11-02T19:00");
    const end = tallinnLocalToIso("2026-11-02T20:30");
    expect(start).toBe("2026-11-02T19:00:00+02:00");
    expect(formatEventOccurrence({ starts_at: start, ends_at: end, display_date: null })).toEqual({
      date: "2.11.2026",
      time: "19:00–20:30",
    });
  });
});
