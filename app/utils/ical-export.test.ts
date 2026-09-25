import type { SeasonPlan } from "./plan-types";
import { describe, expect, it } from "vitest";
import examplePlan from "../../test/fixtures/plan-2025-2026.json";
import { generateICS, generateMemberICal } from "./ical-export";

describe("iCal Calendar Export", () => {
  it("should generate a valid empty VCALENDAR", () => {
    const ics = generateICS([]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Gameday Helperplan//EN");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("should generate member duty calendar events from fixture", () => {
    const plan = examplePlan as unknown as SeasonPlan;
    const memberWithDuty = Object.values(plan.members).find((m) => {
      return Object.values(plan.matches).some(match =>
        match.slots?.some(slot => slot.assignedMemberId === m.id),
      );
    });

    expect(memberWithDuty).toBeDefined();

    if (memberWithDuty) {
      const shareUrl = "https://example.com/setup?planId=f530083d-8c74-4f10-931a-dd877ee7b52c#key=tWVZ4hmOA7LFsrNViX1X6w";
      const ics = generateMemberICal(plan, memberWithDuty.id, shareUrl);

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("SUMMARY:Duty:");
      expect(ics).toContain(`UID:duty-${memberWithDuty.id}-`);
      expect(ics).toContain("LOCATION:");
      expect(ics).toContain(shareUrl);
      expect(ics).toContain("END:VEVENT");
      expect(ics).toContain("END:VCALENDAR");
    }
  });

  it("should export gameday-level slots assigned to a member", () => {
    const plan: SeasonPlan = {
      id: "test-plan",
      schemaVersion: 1,
      rev: 1,
      season: "2025/2026",
      club: { id: "c1", name: "TSV Muster", contactEmail: "", homepage: "", lastUpdated: new Date() },
      lastUpdated: new Date(),
      skills: {},
      teams: {},
      config: {
        roles: [{ id: "hall_open", name: "Hall Opening & Setup", scope: "gameday" }],
        locations: [{ id: "loc1", name: "Sportarena Süd" }],
      },
      members: {
        m1: { id: "m1", name: "Erika Muster", teamIds: [], skillIds: [], isManual: true, updatedAt: new Date() },
      },
      matches: {},
      gamedays: {
        gd1: {
          id: "gd1",
          date: "2026-11-15",
          locationId: "loc1",
          matchIds: [],
          openingTime: "12:00",
          closingTime: "19:00",
          slots: [
            { id: "slot_gd1", roleId: "hall_open", assignedMemberId: "m1", updatedAt: new Date() },
          ],
          updatedAt: new Date(),
        },
      },
    };

    const ics = generateMemberICal(plan, "m1", "https://example.com/plan");
    expect(ics).toContain("SUMMARY:Duty: Hall Opening & Setup (Gameday 2026-11-15)");
    expect(ics).toContain("LOCATION:Sportarena Süd");
    expect(ics).toContain("UID:duty-m1-gd-gd1-slot_gd1@gameday-helperplan");
    expect(ics).toContain("DTSTART:20261115T120000Z");
  });

  it("should properly escape special characters and newlines in description", () => {
    const ics = generateICS([
      {
        uid: "test-uid@test",
        title: "Duty, with comma; and semicolon",
        description: "Line 1\nLine 2 with \\backslash",
        location: "Hall, Room 1; Gym",
        startDate: new Date("2026-10-15T14:00:00Z"),
        endDate: new Date("2026-10-15T15:30:00Z"),
      },
    ]);

    expect(ics).toContain("SUMMARY:Duty\\, with comma\\; and semicolon");
    expect(ics).toContain("LOCATION:Hall\\, Room 1\\; Gym");
    expect(ics).toContain("DESCRIPTION:Line 1\\nLine 2 with \\\\backslash");
  });

  it("returns empty calendar when member is not found", () => {
    const plan = examplePlan as unknown as SeasonPlan;
    const ics = generateMemberICal(plan, "non-existent-member-id");
    expect(ics).not.toContain("BEGIN:VEVENT");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
  });
});
