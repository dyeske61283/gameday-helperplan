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

export function buildCalendarLayout(gamedays: Gameday[], locale?: string) {
  const valid = new Map<string, Gameday[]>();
  const invalid: Gameday[] = [];

  for (const gameday of gamedays) {
    const match = /^\d{4}-\d{2}-\d{2}$/.exec(gameday.date);
    const date = match ? new Date(`${gameday.date}T00:00:00Z`) : null;
    if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== gameday.date) {
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
    const date = new Date(`${day.date}T00:00:00Z`);
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
