import type { Member, SeasonPlan } from "./plan-types";
import { checkMemberConflict } from "./conflict-detector";

export type AutoAssignOptions = {
  /**
   * Require members to possess the requiredSkillId for roles that define one.
   * Default: true
   */
  requireSkills?: boolean;

  /**
   * Balance total duty counts across all season matches so members rotate evenly.
   * Default: true
   */
  balanceDutyCounts?: boolean;

  /**
   * Exclude members who have a playing overlap or another duty overlap at that time.
   * Default: true
   */
  excludeConflicts?: boolean;
};

export type AutoAssignResult = {
  assignedCount: number;
  unassignedSlotIds: string[];
};

/**
 * Calculates current duty count for every member across all matches in the plan.
 */
export function getMemberDutyCounts(plan: SeasonPlan): Map<string, number> {
  const counts = new Map<string, number>();

  for (const member of Object.values(plan.members)) {
    counts.set(member.id, 0);
  }

  for (const match of Object.values(plan.matches)) {
    for (const slot of match.slots || []) {
      if (slot.assignedMemberId) {
        const current = counts.get(slot.assignedMemberId) || 0;
        counts.set(slot.assignedMemberId, current + 1);
      }
    }
  }

  // Also include gameday-level slots
  for (const gameday of Object.values(plan.gamedays)) {
    for (const slot of gameday.slots || []) {
      if (slot.assignedMemberId) {
        const current = counts.get(slot.assignedMemberId) || 0;
        counts.set(slot.assignedMemberId, current + 1);
      }
    }
  }

  return counts;
}

/**
 * Automatically assigns eligible members to unassigned duty slots for a match.
 *
 * Honors:
 * 1. Assigned helper team roster preference
 * 2. Required skills/licenses (e.g. referee, esb)
 * 3. Schedule conflict avoidance (active match play + warmup, double bookings)
 * 4. Fair rotation / duty count balancing across the roster
 */
export function autoAssignMatchDuties(
  plan: SeasonPlan,
  matchId: string,
  options: AutoAssignOptions = {},
): AutoAssignResult {
  const match = plan.matches[matchId];
  if (!match) {
    return { assignedCount: 0, unassignedSlotIds: [] };
  }

  const {
    requireSkills = true,
    balanceDutyCounts = true,
    excludeConflicts = true,
  } = options;

  const dutyCounts = getMemberDutyCounts(plan);

  const assignedInMatch = new Set(
    (match.slots || [])
      .map(s => s.assignedMemberId)
      .filter((id): id is string => !!id),
  );

  const helperTeamId = match.helperTeamId;
  const allMembers = Object.values(plan.members);
  const teamMembers = helperTeamId
    ? allMembers.filter(m => m.teamIds.includes(helperTeamId))
    : allMembers;

  let assignedCount = 0;
  const unassignedSlotIds: string[] = [];

  // Sort slots so that roles with required skills are filled first
  // (prevents unqualified filling of flexible slots leaving qualified members unavailable)
  const sortedSlots = [...(match.slots || [])].sort((a, b) => {
    const aRole = plan.config.roles.find(r => r.id === a.roleId);
    const bRole = plan.config.roles.find(r => r.id === b.roleId);
    const aReq = aRole?.requiredSkillId ? 1 : 0;
    const bReq = bRole?.requiredSkillId ? 1 : 0;
    return bReq - aReq;
  });

  for (const slot of sortedSlots) {
    if (slot.assignedMemberId || slot.customHelperName) {
      continue; // Already assigned
    }

    const role = plan.config.roles.find(r => r.id === slot.roleId);
    const reqSkill = role?.requiredSkillId;

    const isEligible = (member: Member): boolean => {
      // Cannot assign same member twice in the same match
      if (assignedInMatch.has(member.id))
        return false;

      // License requirement check
      if (requireSkills && reqSkill && !member.skillIds.includes(reqSkill)) {
        return false;
      }

      // Conflict check (active player during match or another duty at same time)
      if (excludeConflicts) {
        const conflict = checkMemberConflict(plan, member.id, match, slot.id);
        if (conflict)
          return false;
      }

      return true;
    };

    // 1. Try helper team roster first
    let candidates = teamMembers.filter(m => isEligible(m));

    // 2. If no candidate in helper team and a skill is required, look club-wide
    if (candidates.length === 0 && reqSkill) {
      candidates = allMembers.filter(m => isEligible(m));
    }

    // 3. Fallback: if helper team has no one left and slot has no skill requirement, look club-wide
    if (candidates.length === 0 && !reqSkill && helperTeamId) {
      candidates = allMembers.filter(m => isEligible(m));
    }

    if (candidates.length === 0) {
      unassignedSlotIds.push(slot.id);
      continue;
    }

    // Sort candidates:
    // - lowest duty count first (balanced rotation)
    // - helper team member preferred over club-wide fallback
    // - alphabetical for deterministic ordering
    candidates.sort((a, b) => {
      if (balanceDutyCounts) {
        const countA = dutyCounts.get(a.id) || 0;
        const countB = dutyCounts.get(b.id) || 0;
        if (countA !== countB)
          return countA - countB;
      }

      if (helperTeamId) {
        const aIsTeam = a.teamIds.includes(helperTeamId) ? 1 : 0;
        const bIsTeam = b.teamIds.includes(helperTeamId) ? 1 : 0;
        if (aIsTeam !== bIsTeam)
          return bIsTeam - aIsTeam;
      }

      return a.name.localeCompare(b.name);
    });

    const chosen = candidates[0];
    if (chosen) {
      slot.assignedMemberId = chosen.id;
      slot.customHelperName = null;
      slot.updatedAt = new Date();
      assignedInMatch.add(chosen.id);
      dutyCounts.set(chosen.id, (dutyCounts.get(chosen.id) || 0) + 1);
      assignedCount++;
    }
    else {
      unassignedSlotIds.push(slot.id);
    }
  }

  const now = new Date();
  match.updatedAt = now;
  plan.lastUpdated = now;

  return { assignedCount, unassignedSlotIds };
}
