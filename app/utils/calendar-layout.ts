import type { Gameday } from "./plan-types";

export type CalendarDay = {
  date: string;
  dayNumber: number;
  gamedays: Gameday[];
};

export type CalendarMonth = {
  key: string;
  label: string;
  leadingEmptyDays: number;
  days: CalendarDay[];
};

function parseCalendarDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return null;

  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : parsed;
}

export function buildCalendarLayout(gamedays: Gameday[], locale?: string) {
  const valid = new Map<string, Gameday[]>();
  const invalid: Gameday[] = [];

  for (const gameday of gamedays) {
    if (!parseCalendarDate(gameday.date)) {
      invalid.push(gameday);
      continue;
    }
    valid.set(gameday.date, [...(valid.get(gameday.date) ?? []), gameday]);
  }

  const days = [...valid.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, grouped]) => ({
      date,
      dayNumber: Number(date.slice(8, 10)),
      gamedays: grouped,
    }));
  const months = new Map<string, CalendarMonth>();

  for (const day of days) {
    const date = parseCalendarDate(day.date)!;
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    const month = months.get(key) ?? {
      key,
      label: date.toLocaleDateString(locale ?? "en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      leadingEmptyDays: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).getUTCDay(),
      days: [],
    };
    month.days.push(day);
    months.set(key, month);
  }

  return { months: [...months.values()], invalid };
}
