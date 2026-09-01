import type { Match, Team } from "./plan-types";

// We want to rank "the closest" other home teams
// "Closest" means the ones with the most hometurf gamedays together
// In which the games themselves are also the closest together
export default function proposeHelperTeams(focusTeamToMatchFor: Team, seasonMatchPlan: Match[]): string[] {
  if (seasonMatchPlan.every(match => match.homeTeamId === focusTeamToMatchFor.id)) {
    return [];
  }

  const _matchesGroupedByDay = Map.groupBy(seasonMatchPlan, (match) => {
    return match.time;
  });

  return [];
};
