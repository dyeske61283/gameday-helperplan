import type { SeasonPlan } from "./plan-types";
import { describe, expect, it } from "vitest";
import examplePlan from "../../test/fixtures/plan-2025-2026.json";
import { generateICS, generateMatchICal, generateMemberICal } from "./ical-export";
import { CURRENT_SCHEMA_VERSION, parseSeasonPlan } from "./plan-types";

describe("iCal Calendar Export", () => {
  it("exports every plan match with stable IDs and no assignments", () => {
    const plan = structuredClone(parseSeasonPlan(examplePlan));
    const firstMatch = Object.values(plan.matches)[0]!;
    firstMatch.slots[0]!.assignedMemberId = Object.keys(plan.members)[0]!;
    const ics = generateMatchICal(plan);

    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(Object.keys(plan.matches).length);
    expect(ics).toContain(`UID:match-${firstMatch.id}@gameday-helperplan`);
    expect(ics).toContain(`DTSTART:${firstMatch.time.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);
    expect(ics).not.toContain("Duty:");
    expect(ics).not.toContain("member-");
  });

  it("keeps cancelled matches in the calendar with a cancelled status", () => {
    const plan = structuredClone(parseSeasonPlan(examplePlan));
    const match = Object.values(plan.matches)[0]!;
    (match as SeasonPlan["matches"][string] & { status?: string }).status = "CANCELLED";
    const ics = generateMatchICal(plan);

    expect(ics).toContain(`UID:match-${match.id}@gameday-helperplan`);
    expect(ics).toContain("STATUS:CANCELLED");
  });

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
      const shareUrl = "https://example.com/setup#key=abcdefghijklmnopqrstuv";
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
      schemaVersion: CURRENT_SCHEMA_VERSION,
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
            { id: "slot_gd1", roleId: "hall_open", assignedMemberId: "m1", assignmentStatus: "ASSIGNED", updatedAt: new Date() },
          ],
          updatedAt: new Date(),
        },
      },
    };

    const ics = generateMemberICal(plan, "m1");
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

  it("omits invalid event dates rather than returning malformed ICS", () => {
    const ics = generateICS([{
      uid: "bad-date@gameday-helperplan",
      title: "Invalid date",
      startDate: new Date(Number.NaN),
      endDate: new Date("2026-10-15T15:30:00Z"),
    }]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("does not allow event IDs to inject calendar lines", () => {
    const ics = generateICS([{
      uid: "safe\r\nBEGIN:VEVENT",
      title: "Test",
      startDate: new Date("2026-10-15T14:00:00Z"),
      endDate: new Date("2026-10-15T15:00:00Z"),
    }]);

    expect(ics).toContain("UID:safe\\nBEGIN:VEVENT");
    expect((ics.match(/^BEGIN:VEVENT$/gm) ?? []).length).toBe(1);
  });

  it("returns empty calendar when member is not found", () => {
    const plan = examplePlan as unknown as SeasonPlan;
    const ics = generateMemberICal(plan, "non-existent-member-id");
    expect(ics).not.toContain("BEGIN:VEVENT");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
  });
});
