import { describe, expect, it } from "vitest";
import { formatEventOccurrence, groupEventsByMonth, isoToTallinnLocal, tallinnLocalToIso, upcomingEvents } from "@/lib/content/events";

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

describe("groupEventsByMonth", () => {
  const e = (id: string, start: string | null, end: string | null = null, sort_order = 0, display_date: string | null = null) => ({
    id,
    starts_at: start,
    ends_at: end,
    display_date,
    sort_order,
  });
  // Tallinn: UTC+3 until 25 October 2026, UTC+2 after.
  const evening = (date: string, offset: "+03:00" | "+02:00") => [`${date}T19:00:00${offset}`, `${date}T20:30:00${offset}`] as const;

  it("groups dates by month and shows the shared time once", () => {
    const [o1s, o1e] = evening("2026-10-19", "+03:00");
    const [n1s, n1e] = evening("2026-11-02", "+02:00");
    const [n2s, n2e] = evening("2026-11-23", "+02:00");
    const [d1s, d1e] = evening("2026-12-07", "+02:00");
    const grouped = groupEventsByMonth([e("d1", d1s, d1e), e("n2", n2s, n2e), e("o1", o1s, o1e), e("n1", n1s, n1e)]);
    expect(grouped.months.map((month) => [month.label, month.days.map((day) => day.day)])).toEqual([
      ["oktoober", ["19.10"]],
      ["november", ["2.11", "23.11"]],
      ["detsember", ["7.12"]],
    ]);
    expect(grouped.sharedTime).toBe("19:00–20:30");
    expect(grouped.months.flatMap((month) => month.days).every((day) => day.time === undefined)).toBe(true);
  });

  it("keeps each date's own time when they differ", () => {
    const grouped = groupEventsByMonth([
      e("a", "2026-11-02T19:00:00+02:00", "2026-11-02T20:30:00+02:00"),
      e("b", "2026-11-23T18:00:00+02:00", "2026-11-23T19:30:00+02:00"),
    ]);
    expect(grouped.sharedTime).toBeUndefined();
    expect(grouped.months[0].days.map((day) => day.time)).toEqual(["19:00–20:30", "18:00–19:30"]);
  });

  it("names the year only when the dates span two years", () => {
    const one = groupEventsByMonth([e("a", "2026-12-07T19:00:00+02:00")]);
    expect(one.months[0].label).toBe("detsember");
    const two = groupEventsByMonth([e("a", "2026-12-07T19:00:00+02:00"), e("b", "2027-01-11T19:00:00+02:00")]);
    expect(two.months.map((month) => month.label)).toEqual(["detsember 2026", "jaanuar 2027"]);
  });

  it("puts a late-evening date in its Tallinn month, not its UTC month", () => {
    // 00:30 on 1 November in Tallinn is 22:30 UTC on 31 October.
    const grouped = groupEventsByMonth([e("a", "2026-10-31T22:30:00+02:00"), e("b", "2026-11-01T00:30:00+02:00")]);
    expect(grouped.months.map((month) => month.label)).toEqual(["oktoober", "november"]);
    expect(grouped.months[1].days[0].day).toBe("1.11");
  });

  it("keeps free-text dates apart and handles an empty list", () => {
    expect(groupEventsByMonth([]).months).toEqual([]);
    const grouped = groupEventsByMonth([e("t", null, null, 1, "5.10"), e("a", "2026-11-02T19:00:00+02:00")]);
    expect(grouped.other).toEqual([{ id: "t", text: "5.10" }]);
    expect(grouped.months).toHaveLength(1);
  });
});
