import type { Match, Team } from "./plan-types";

/**
 * Extracts a YYYY-MM-DD date key from a Date or ISO string
 */
function getDateKey(dateVal: Date | string): string {
  const d = new Date(dateVal);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Proposes the best helper teams for a specific match.
 * Ranks other teams playing on the same date by proximity in time (e.g. game directly before or after).
 */
export function proposeHelperTeamsForMatch(
  targetMatch: Match,
  seasonMatchPlan: Match[],
): string[] {
  const targetDateKey = getDateKey(targetMatch.time);
  const targetTimeMs = new Date(targetMatch.time).getTime();

  // Find all other home matches playing on the exact same date
  const candidateMatches = seasonMatchPlan.filter((m) => {
    if (m.id === targetMatch.id)
      return false;
    if (m.homeTeamId === targetMatch.homeTeamId)
      return false; // Can't assign the playing team to helper duty for itself
    return getDateKey(m.time) === targetDateKey;
  });

  if (candidateMatches.length === 0) {
    return [];
  }

  // Score candidate teams based on time delta in minutes
  // Closer matches (e.g. 1.5 - 2 hours apart) get the highest rank
  const scoredTeams = candidateMatches.map((m) => {
    const matchTimeMs = new Date(m.time).getTime();
    const diffMinutes = Math.abs(matchTimeMs - targetTimeMs) / (1000 * 60);
    return {
      teamId: m.homeTeamId,
      diffMinutes,
    };
  });

  // Sort by smallest time difference
  scoredTeams.sort((a, b) => a.diffMinutes - b.diffMinutes);

  // Return unique team IDs in order of proximity
  const uniqueTeamIds: string[] = [];
  for (const item of scoredTeams) {
    if (!uniqueTeamIds.includes(item.teamId)) {
      uniqueTeamIds.push(item.teamId);
    }
  }

  return uniqueTeamIds;
}

/**
 * Proposes other teams with highest season-long schedule affinity for a given team.
 * "Closest" means the teams with the most home gamedays shared together.
 */
export default function proposeHelperTeams(
  focusTeamToMatchFor: Team,
  seasonMatchPlan: Match[],
): string[] {
  const focusTeamId = focusTeamToMatchFor.id;

  // Collect all dates when the focus team has a home match
  const focusDates = new Set<string>();
  for (const match of seasonMatchPlan) {
    if (match.homeTeamId === focusTeamId) {
      focusDates.add(getDateKey(match.time));
    }
  }

  if (focusDates.size === 0) {
    return [];
  }

  // Count how many shared home dates each other team has
  const sharedDaysCount = new Map<string, number>();

  for (const match of seasonMatchPlan) {
    if (match.homeTeamId === focusTeamId)
      continue;

    const matchDateKey = getDateKey(match.time);
    if (focusDates.has(matchDateKey)) {
      const current = sharedDaysCount.get(match.homeTeamId) || 0;
      sharedDaysCount.set(match.homeTeamId, current + 1);
    }
  }

  // Sort candidate teams by number of shared dates descending
  const sorted = Array.from(sharedDaysCount.entries()).sort((a, b) => b[1] - a[1]);

  return sorted.map(([teamId]) => teamId);
}
