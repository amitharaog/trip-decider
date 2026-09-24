import type { DateRange, DateWindow } from "./types";

// All dates are "YYYY-MM-DD" strings, handled as UTC midnight so there are no
// timezone surprises. "Today" is today in India.
const DAY = 86_400_000;

export const HORIZON_DAYS = 92; // "next 3 months"
export const MIN_LEAD_DAYS = 7; // give people a week to book leave and tickets

export function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(date) + n * DAY).toISOString().slice(0, 10);
}

export function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && addDays(s, 0) === s;
}

function isWeekend(date: string) {
  const d = new Date(Date.parse(date)).getUTCDay();
  return d === 0 || d === 6;
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(Date.parse(date)).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
}

export function formatRange(start: string, end: string) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * Find the 3- or 4-day window the most members can make.
 * A member can make a window only if it sits entirely inside one of their ranges.
 * Ties: more weekend days, then the longer trip, then the earliest start.
 */
export function bestWindow(
  availability: { member: string; windows: DateRange[] }[],
  today: string = todayIST(),
): DateWindow | null {
  let best: DateWindow | null = null;
  for (let offset = MIN_LEAD_DAYS; offset <= HORIZON_DAYS; offset++) {
    const start = addDays(today, offset);
    for (const days of [3, 4]) {
      const end = addDays(start, days - 1);
      const available = availability
        .filter((a) => a.windows.some((w) => w.start <= start && end <= w.end))
        .map((a) => a.member);
      if (available.length === 0) continue;
      let weekendDays = 0;
      for (let i = 0; i < days; i++) if (isWeekend(addDays(start, i))) weekendDays++;
      const candidate = { start, end, days, weekendDays, available };
      if (!best || beats(candidate, best)) best = candidate;
    }
  }
  return best;
}

function beats(a: DateWindow, b: DateWindow) {
  if (a.available.length !== b.available.length) return a.available.length > b.available.length;
  if (a.weekendDays !== b.weekendDays) return a.weekendDays > b.weekendDays;
  if (a.days !== b.days) return a.days > b.days;
  return a.start < b.start; // candidates arrive in date order, so this keeps the earliest
}
