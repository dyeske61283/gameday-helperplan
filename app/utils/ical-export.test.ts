import type { SeasonPlan } from "./plan-types";
import { describe, expect, it } from "vitest";
import examplePlan from "../../test/fixtures/plan-2025-2026.json";
import { generateICS, generateMemberICal } from "./ical-export";

describe("iCal Calendar Export", () => {
  it("should generate a valid empty VCALENDAR", () => {
    const ics = generateICS([]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("should generate member duty calendar events", () => {
    const plan = examplePlan as unknown as SeasonPlan;
    // Find a member with assigned duties in fixture
    const memberWithDuty = Object.values(plan.members).find((m) => {
      return Object.values(plan.matches).some(match =>
        match.slots.some(slot => slot.assignedMemberId === m.id),
      );
    });

    if (memberWithDuty) {
      const ics = generateMemberICal(plan, memberWithDuty.id, "https://example.com/plan");
      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("SUMMARY:Duty:");
      expect(ics).toContain("END:VEVENT");
      expect(ics).toContain("END:VCALENDAR");
    }
  });
});
