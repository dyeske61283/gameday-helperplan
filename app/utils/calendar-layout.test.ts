import type { Gameday } from "./plan-types";
import { describe, expect, it } from "vitest";
import { buildCalendarLayout } from "./calendar-layout";

const gameday = (id: string, date: string) => ({ id, date } as Gameday);

describe("buildCalendarLayout", () => {
  it("groups each date once and keeps gamedays on the same date together", () => {
    const result = buildCalendarLayout([
      gameday("second", "2026-11-07"),
      gameday("first", "2026-11-07"),
      gameday("third", "2026-12-01"),
    ]);

    expect(result.months).toHaveLength(2);
    expect(result.months[0]?.days).toEqual([
      { date: "2026-11-07", dayNumber: 7, gamedays: [gameday("second", "2026-11-07"), gameday("first", "2026-11-07")] },
    ]);
    expect(result.months[1]?.days[0]?.date).toBe("2026-12-01");
  });

  it("returns invalid dates separately", () => {
    const result = buildCalendarLayout([gameday("bad", "2026-02-31"), gameday("also-bad", "not-a-date")]);

    expect(result.months).toEqual([]);
    expect(result.invalid.map(day => day.id)).toEqual(["bad", "also-bad"]);
  });
});
