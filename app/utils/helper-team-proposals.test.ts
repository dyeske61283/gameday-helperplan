import type { Match, Team } from "./plan-types";
import { describe, expect, it } from "vitest";
import proposeHelperTeams from "./helper-team-proposals";

describe("proposes teams, that have the best match timings relative to each other, to fulfull helping", () => {
  it("proposes no team, if there is no other team", () => {
    const focusTeamId = "team_1";

    const focusTeam: Team = {
      id: focusTeamId,
      isManual: false,
      name: "Team 1",
      updatedAt: new Date(0),
    };

    const matchPlan: Match[] = [
      {
        id: "m0",
        homeTeamId: focusTeamId,
        awayTeamName: "other team",
        time: new Date(),
        slots: [],
        updatedAt: new Date(0),
      },
    ];

    const helperTeamMatches = proposeHelperTeams(focusTeam, matchPlan);

    expect(helperTeamMatches).toHaveLength(0);
  });
});
