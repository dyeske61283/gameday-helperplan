import type { Match, SeasonPlan } from "./plan-types";

export type ScheduleConflict = {
  type: "player_overlap" | "duty_overlap";
  message: string;
  conflictingMatchId: string;
  conflictingMatchTime: Date;
};

const DEFAULT_MATCH_DURATION_MINUTES = 90;
const WARMUP_BUFFER_MINUTES = 30;

function getMatchTimeWindow(match: Match, includeWarmup = false): { startMs: number; endMs: number } {
  const startMs = new Date(match.time).getTime() - (includeWarmup ? WARMUP_BUFFER_MINUTES * 60 * 1000 : 0);
  const endMs = new Date(match.time).getTime() + (DEFAULT_MATCH_DURATION_MINUTES * 60 * 1000);
  return { startMs, endMs };
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Checks if a specific member has schedule conflicts (playing match or other duty slot)
 * during the time window of a given target match.
 */
export function checkMemberConflict(
  plan: SeasonPlan,
  memberId: string,
  targetMatch: Match,
  targetSlotId?: string,
): ScheduleConflict | null {
  const member = plan.members[memberId];
  if (!member)
    return null;

  const targetWindow = getMatchTimeWindow(targetMatch, false);

  // 1. Check if member's team is playing in a match overlapping with target match
  for (const match of Object.values(plan.matches)) {
    // Check if member plays for this match's home team
    if (member.teamIds.includes(match.homeTeamId)) {
      const playingWindow = getMatchTimeWindow(match, true); // Include warmup buffer for active players
      if (intervalsOverlap(targetWindow.startMs, targetWindow.endMs, playingWindow.startMs, playingWindow.endMs)) {
        const timeStr = new Date(match.time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        const teamName = plan.teams[match.homeTeamId]?.name || match.homeTeamId;
        return {
          type: "player_overlap",
          message: `Plays for ${teamName} at ${timeStr}`,
          conflictingMatchId: match.id,
          conflictingMatchTime: new Date(match.time),
        };
      }
    }
  }

  // 2. Check if member is already assigned to another duty slot during this time
  for (const match of Object.values(plan.matches)) {
    for (const slot of match.slots) {
      if (slot.assignedMemberId !== memberId)
        continue;
      if (match.id === targetMatch.id && slot.id === targetSlotId)
        continue; // Don't conflict with self

      const dutyWindow = getMatchTimeWindow(match, false);
      if (intervalsOverlap(targetWindow.startMs, targetWindow.endMs, dutyWindow.startMs, dutyWindow.endMs)) {
        const timeStr = new Date(match.time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        const role = plan.config.roles.find(r => r.id === slot.roleId);
        const roleName = role?.name || slot.roleId;
        return {
          type: "duty_overlap",
          message: `Assigned as ${roleName} at ${timeStr}`,
          conflictingMatchId: match.id,
          conflictingMatchTime: new Date(match.time),
        };
      }
    }
  }

  return null;
}

/**
 * Returns a map of slotId -> ScheduleConflict for all assigned slots within a match
 */
export function getMatchConflicts(
  plan: SeasonPlan,
  match: Match,
): Record<string, ScheduleConflict> {
  const conflicts: Record<string, ScheduleConflict> = {};

  for (const slot of match.slots) {
    if (!slot.assignedMemberId)
      continue;
    const conflict = checkMemberConflict(plan, slot.assignedMemberId, match, slot.id);
    if (conflict) {
      conflicts[slot.id] = conflict;
    }
  }

  return conflicts;
}
