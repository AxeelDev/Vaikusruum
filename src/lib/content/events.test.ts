import { describe, expect, it } from "vitest";
import { formatEventOccurrence, isoToTallinnLocal, tallinnLocalToIso, upcomingEvents } from "@/lib/content/events";

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

describe("upcomingEvents", () => {
  const now = Date.parse("2026-10-09T12:00:00Z");
  const e = (id: string, starts_at: string | null, ends_at: string | null = null, sort_order = 0) => ({ id, starts_at, ends_at, sort_order });

  it("drops classes that have ended and sorts the rest by start", () => {
    const list = [e("dec", "2026-12-07T17:00:00Z"), e("past", "2026-09-28T16:00:00Z", "2026-09-28T17:30:00Z"), e("nov", "2026-11-02T17:00:00Z")];
    expect(upcomingEvents(list, now).map((x) => x.id)).toEqual(["nov", "dec"]);
  });

  it("keeps a class that is still running and free-text dates", () => {
    const list = [e("running", "2026-10-09T11:30:00Z", "2026-10-09T13:00:00Z"), e("text", null)];
    expect(upcomingEvents(list, now).map((x) => x.id)).toEqual(["running", "text"]);
  });
});

describe("isoToTallinnLocal", () => {
  it("shows stored times in Tallinn time across daylight saving", () => {
    expect(isoToTallinnLocal("2026-10-05T16:00:00+00:00")).toBe("2026-10-05T19:00");
    expect(isoToTallinnLocal("2026-11-02T17:00:00+00:00")).toBe("2026-11-02T19:00");
    expect(isoToTallinnLocal(null)).toBe("");
  });
});
