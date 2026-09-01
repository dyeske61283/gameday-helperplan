import type { SeasonPlan } from "./plan-types";
import { describe, expect, it } from "vitest";
import { checkMemberConflict, getMatchConflicts } from "./conflict-detector";

describe("schedule conflict detector", () => {
  const basePlan: SeasonPlan = {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    schemaVersion: 1,
    rev: 1,
    season: "2025/2026",
    club: { id: "c1", name: "TSV Muster", contactEmail: "", homepage: "", lastUpdated: new Date() },
    lastUpdated: new Date(),
    skills: {},
    teams: {
      team_herren1: { id: "team_herren1", name: "Herren 1", isManual: true, updatedAt: new Date() },
      team_damen1: { id: "team_damen1", name: "Damen 1", isManual: true, updatedAt: new Date() },
    },
    members: {
      m_alex: { id: "m_alex", name: "Alex Mueller", teamIds: ["team_herren1"], skillIds: [], isManual: true, updatedAt: new Date() },
      m_sarah: { id: "m_sarah", name: "Sarah Schmidt", teamIds: ["team_damen1"], skillIds: [], isManual: true, updatedAt: new Date() },
    },
    gamedays: {},
    config: {
      locations: [],
      roles: [{ id: "timekeeper", name: "Timekeeper", scope: "match" }],
    },
    matches: {
      match_youth: {
        id: "match_youth",
        time: new Date("2026-10-15T14:00:00.000Z"),
        homeTeamId: "team_damen1",
        awayTeamName: "Gast A",
        slots: [
          { id: "slot_youth_tk", roleId: "timekeeper", assignedMemberId: "m_alex", updatedAt: new Date() },
        ],
        updatedAt: new Date(),
      },
      match_herren: {
        id: "match_herren",
        time: new Date("2026-10-15T15:00:00.000Z"),
        homeTeamId: "team_herren1",
        awayTeamName: "Gast B",
        slots: [],
        updatedAt: new Date(),
      },
    },
  };

  it("detects player overlap when member is playing in an overlapping match", () => {
    // Alex plays for Herren 1 at 15:00 (warmup starts at 14:30), but is assigned to youth match at 14:00-15:30
    const targetMatch = basePlan.matches.match_youth!;
    const conflict = checkMemberConflict(basePlan, "m_alex", targetMatch, "slot_youth_tk");

    expect(conflict).not.toBeNull();
    expect(conflict?.type).toBe("player_overlap");
    expect(conflict?.message).toContain("Plays for Herren 1");
  });

  it("does not report conflict when member has no overlapping match or duty", () => {
    // Sarah plays for Damen 1 at 14:00, but let's check for a match tomorrow at 14:00
    const tomorrowMatch = {
      id: "match_tomorrow",
      time: new Date("2026-10-16T14:00:00.000Z"),
      homeTeamId: "team_other",
      awayTeamName: "Gast",
      slots: [],
      updatedAt: new Date(),
    };

    const conflict = checkMemberConflict(basePlan, "m_sarah", tomorrowMatch);
    expect(conflict).toBeNull();
  });

  it("detects double-duty overlap when member is assigned to two overlapping slots", () => {
    // Use a neutral volunteer with no team affiliation so only the duty_overlap path fires
    const planWithDoubleDuty: SeasonPlan = {
      ...basePlan,
      members: {
        ...basePlan.members,
        m_neutral: { id: "m_neutral", name: "Guest Volunteer", teamIds: [], skillIds: [], isManual: true, updatedAt: new Date() },
      },
      matches: {
        ...basePlan.matches,
        match_other: {
          id: "match_other",
          time: new Date("2026-10-15T14:15:00.000Z"),
          homeTeamId: "team_damen1",
          awayTeamName: "Gast C",
          slots: [
            { id: "slot_other_tk", roleId: "timekeeper", assignedMemberId: "m_neutral", updatedAt: new Date() },
          ],
          updatedAt: new Date(),
        },
      },
    };

    const targetMatch = planWithDoubleDuty.matches.match_youth!;
    // m_neutral is already assigned to match_other at 14:15, which overlaps with match_youth 14:00–15:30
    const conflict = checkMemberConflict(planWithDoubleDuty, "m_neutral", targetMatch);
    expect(conflict).not.toBeNull();
    expect(conflict?.type).toBe("duty_overlap");
    expect(conflict?.message).toContain("Assigned as Timekeeper");
  });

  it("retrieves match-wide slot conflicts map", () => {
    const match = basePlan.matches.match_youth!;
    const conflicts = getMatchConflicts(basePlan, match);
    expect(conflicts.slot_youth_tk).toBeDefined();
    expect(conflicts.slot_youth_tk?.type).toBe("player_overlap");
  });
});
