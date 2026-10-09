import type { EventRow } from "@/types/content";

export const EVENT_TIME_ZONE = "Europe/Tallinn";

export type FormattedEvent = {
  date: string;
  time?: string;
};

export function formatEventOccurrence(event: Pick<EventRow, "starts_at" | "ends_at" | "display_date">): FormattedEvent {
  if (event.starts_at) {
    const start = new Date(event.starts_at);
    if (!Number.isNaN(start.getTime())) {
      const date = formatTallinnDate(start);
      const startTime = formatTallinnTime(start);
      const end = event.ends_at ? new Date(event.ends_at) : null;
      const endTime = end && !Number.isNaN(end.getTime()) ? formatTallinnTime(end) : null;
      return {
        date,
        time: endTime && endTime !== startTime ? `${startTime}–${endTime}` : startTime,
      };
    }
  }
  const fallback = event.display_date?.trim() ?? "";
  return { date: fallback };
}

function tallinnDateParts(value: Date): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EVENT_TIME_ZONE,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { day: get("day"), month: get("month"), year: get("year") };
}

export function formatTallinnDate(value: Date): string {
  const { day, month, year } = tallinnDateParts(value);
  return `${day}.${String(month).padStart(2, "0")}.${year}`;
}

export function formatTallinnTime(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EVENT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute}`;
}

export function tallinnLocalToIso(local: string): string | null {
  const match = local.trim().match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) return null;
  const [, date, time] = match;
  for (const offset of ["+03:00", "+02:00"] as const) {
    const iso = `${date}T${time}:00${offset}`;
    if (formatIsoAsTallinnLocal(iso) === `${date}T${time}`) return iso;
  }
  return `${date}T${time}:00+03:00`;
}

/** "2026-11-02T19:00" in Tallinn time, for date and time inputs. Empty when the value is not a date. */
export function isoToTallinnLocal(iso: string | null): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "";
  return formatIsoAsTallinnLocal(iso);
}

/**
 * Dates still to come, soonest first. A class drops off once it has ended (or started, without an end time).
 * Entries with only a free-text date have no time to compare, so they stay.
 */
export function upcomingEvents<T extends Pick<EventRow, "starts_at" | "ends_at" | "sort_order">>(events: T[], now: number): T[] {
  return events
    .filter((event) => {
      const until = Date.parse(event.ends_at ?? event.starts_at ?? "");
      return Number.isNaN(until) || until >= now;
    })
    .sort((a, b) => {
      const at = Date.parse(a.starts_at ?? ""), bt = Date.parse(b.starts_at ?? "");
      if (Number.isNaN(at) || Number.isNaN(bt)) return a.sort_order - b.sort_order;
      return at - bt;
    });
}

/** Upcoming dates as of this moment; for server rendering, where each render is a fresh snapshot. */
export function upcomingEventsNow<T extends Pick<EventRow, "starts_at" | "ends_at" | "sort_order">>(events: T[]): T[] {
  return upcomingEvents(events, Date.now());
}

const MONTH_NAMES_ET = ["jaanuar", "veebruar", "märts", "aprill", "mai", "juuni", "juuli", "august", "september", "oktoober", "november", "detsember"] as const;

export type EventDay = {
  id: string;
  /** "19.10" */
  day: string;
  /** Only set when the dates do not all share one time. */
  time?: string;
};

export type EventMonth = {
  key: string;
  /** "oktoober", or "oktoober 2026" when the dates span two years. */
  label: string;
  days: EventDay[];
};

export type EventsByMonth = {
  months: EventMonth[];
  /** "19:00–20:30" when every date has the same start and end. */
  sharedTime?: string;
  /** Entries that only have a free-text date. */
  other: Array<{ id: string; text: string }>;
};

/**
 * Groups upcoming dates by calendar month (Tallinn time) for display: one line per month.
 * The time is returned once when all dates share it, otherwise per date; the year only when two years are involved.
 */
export function groupEventsByMonth(events: Array<Pick<EventRow, "id" | "starts_at" | "ends_at" | "display_date" | "sort_order">>): EventsByMonth {
  const dated: Array<{ id: string; start: number; year: number; month: number; day: string; time: string }> = [];
  const other: EventsByMonth["other"] = [];
  for (const event of [...events].sort((a, b) => a.sort_order - b.sort_order)) {
    const start = event.starts_at ? new Date(event.starts_at) : null;
    if (!start || Number.isNaN(start.getTime())) {
      const text = event.display_date?.trim() ?? "";
      if (text) other.push({ id: event.id, text });
      continue;
    }
    const { day, month, year } = tallinnDateParts(start);
    const formatted = formatEventOccurrence(event);
    dated.push({
      id: event.id,
      start: start.getTime(),
      year,
      month,
      day: `${day}.${String(month).padStart(2, "0")}`,
      time: formatted.time ?? "",
    });
  }
  dated.sort((a, b) => a.start - b.start);

  const sharedTime = dated.length > 0 && dated[0].time && dated.every((item) => item.time === dated[0].time) ? dated[0].time : undefined;
  const spansYears = new Set(dated.map((item) => item.year)).size > 1;

  const months: EventMonth[] = [];
  for (const item of dated) {
    const key = `${item.year}-${String(item.month).padStart(2, "0")}`;
    let group = months.find((month) => month.key === key);
    if (!group) {
      const name = MONTH_NAMES_ET[item.month - 1];
      group = { key, label: spansYears ? `${name} ${item.year}` : name, days: [] };
      months.push(group);
    }
    group.days.push({ id: item.id, day: item.day, time: sharedTime || !item.time ? undefined : item.time });
  }
  return { months, sharedTime, other };
}

function formatIsoAsTallinnLocal(iso: string): string {
  const value = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
