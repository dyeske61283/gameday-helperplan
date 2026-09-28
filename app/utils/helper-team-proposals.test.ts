import type { Match, Team } from "./plan-types";
import { describe, expect, it } from "vitest";
import proposeHelperTeams, { proposeHelperTeamsForMatch } from "./helper-team-proposals";

describe("proposeHelperTeams (Season-level schedule affinity)", () => {
  it("proposes no team if there are no other home teams", () => {
    const focusTeam: Team = {
      id: "team_1",
      isManual: false,
      name: "Team 1",
      updatedAt: new Date(0),
    };

    const matchPlan: Match[] = [
      {
        id: "m0",
        homeTeamId: "team_1",
        awayTeamName: "Gast",
        time: new Date("2026-10-15T14:00:00.000Z"),
        slots: [],
        updatedAt: new Date(0),
      },
    ];

    const result = proposeHelperTeams(focusTeam, matchPlan);
    expect(result).toHaveLength(0);
  });

  it("ranks teams with more shared home gamedays higher", () => {
    const focusTeam: Team = {
      id: "team_1",
      isManual: false,
      name: "Männer 1",
      updatedAt: new Date(0),
    };

    const matchPlan: Match[] = [
      // Day 1: Team 1 and Team 2 play
      {
        id: "m1",
        homeTeamId: "team_1",
        awayTeamName: "Gast",
        time: new Date("2026-10-15T14:00:00.000Z"),
        slots: [],
        updatedAt: new Date(0),
      },
      {
        id: "m2",
        homeTeamId: "team_2",
        awayTeamName: "Gast",
        time: new Date("2026-10-15T16:00:00.000Z"),
        slots: [],
        updatedAt: new Date(0),
      },
      // Day 2: Team 1 and Team 2 play again, Team 3 only plays once
      {
        id: "m3",
        homeTeamId: "team_1",
        awayTeamName: "Gast",
        time: new Date("2026-10-22T14:00:00.000Z"),
        slots: [],
        updatedAt: new Date(0),
      },
      {
        id: "m4",
        homeTeamId: "team_2",
        awayTeamName: "Gast",
        time: new Date("2026-10-22T16:00:00.000Z"),
        slots: [],
        updatedAt: new Date(0),
      },
      {
        id: "m5",
        homeTeamId: "team_3",
        awayTeamName: "Gast",
        time: new Date("2026-10-22T18:00:00.000Z"),
        slots: [],
        updatedAt: new Date(0),
      },
    ];

    const ranked = proposeHelperTeams(focusTeam, matchPlan);
    expect(ranked[0]).toBe("team_2");
    expect(ranked[1]).toBe("team_3");
  });
});

describe("proposeHelperTeamsForMatch (Match-level proximity)", () => {
  it("proposes team playing immediately next to target match", () => {
    const matchTarget: Match = {
      id: "target",
      homeTeamId: "team_youth",
      awayTeamName: "Gast",
      time: new Date("2026-10-15T14:00:00.000Z"),
      slots: [],
      updatedAt: new Date(0),
    };

    const matchPlan: Match[] = [
      matchTarget,
      // Team A plays right after at 16:00 (2 hours diff)
      {
        id: "m_a",
        homeTeamId: "team_damen1",
        awayTeamName: "Gast",
        time: new Date("2026-10-15T16:00:00.000Z"),
        slots: [],
        updatedAt: new Date(0),
      },
      // Team B plays much later at 20:00 (6 hours diff)
      {
        id: "m_b",
        homeTeamId: "team_herren2",
        awayTeamName: "Gast",
        time: new Date("2026-10-15T20:00:00.000Z"),
        slots: [],
        updatedAt: new Date(0),
      },
      // Team C plays on a different day
      {
        id: "m_c",
        homeTeamId: "team_herren3",
        awayTeamName: "Gast",
        time: new Date("2026-10-16T15:00:00.000Z"),
        slots: [],
        updatedAt: new Date(0),
      },
    ];

    const proposed = proposeHelperTeamsForMatch(matchTarget, matchPlan);
    expect(proposed).toEqual(["team_damen1", "team_herren2"]);
  });
});
