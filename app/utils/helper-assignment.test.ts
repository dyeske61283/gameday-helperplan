import type { SeasonPlan } from "./plan-types";
import { describe, expect, it } from "vitest";
import { autoAssignMatchDuties, getMemberDutyCounts } from "./helper-assignment";

describe("assign helpers to slots with restrictions and reducing assignment count average", () => {
  const createTestPlan = (): SeasonPlan => ({
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    schemaVersion: 1,
    rev: 1,
    season: "2025/2026",
    club: { id: "c1", name: "TSV Muster", contactEmail: "", homepage: "", lastUpdated: new Date() },
    lastUpdated: new Date(),
    skills: {},
    config: {
      locations: [],
      roles: [
        { id: "referee", name: "Referee", requiredSkillId: "license_ref", scope: "match" },
        { id: "timekeeper", name: "Timekeeper", requiredSkillId: "license_tk", scope: "match" },
        { id: "kiosk", name: "Kiosk", scope: "match" },
      ],
    },
    teams: {
      team_home: { id: "team_home", name: "Männer 1", isManual: true, updatedAt: new Date() },
      team_helper: { id: "team_helper", name: "Damen 1", isManual: true, updatedAt: new Date() },
    },
    members: {
      m_alice: {
        id: "m_alice",
        name: "Alice (Helper Team, Ref & TK)",
        teamIds: ["team_helper"],
        skillIds: ["license_ref", "license_tk"],
        isManual: true,
        updatedAt: new Date(),
      },
      m_bob: {
        id: "m_bob",
        name: "Bob (Helper Team, TK)",
        teamIds: ["team_helper"],
        skillIds: ["license_tk"],
        isManual: true,
        updatedAt: new Date(),
      },
      m_charlie: {
        id: "m_charlie",
        name: "Charlie (Helper Team, No Skill)",
        teamIds: ["team_helper"],
        skillIds: [],
        isManual: true,
        updatedAt: new Date(),
      },
      m_diana: {
        id: "m_diana",
        name: "Diana (Home Team Player)",
        teamIds: ["team_home"],
        skillIds: ["license_ref", "license_tk"],
        isManual: true,
        updatedAt: new Date(),
      },
      m_eric: {
        id: "m_eric",
        name: "Eric (Club-Wide Ref)",
        teamIds: [],
        skillIds: ["license_ref"],
        isManual: true,
        updatedAt: new Date(),
      },
    },
    gamedays: {},
    matches: {
      m_target: {
        id: "m_target",
        time: new Date("2026-10-15T14:00:00.000Z"),
        homeTeamId: "team_home",
        awayTeamName: "Guest Team",
        helperTeamId: "team_helper",
        slots: [
          { id: "slot_ref", roleId: "referee", assignedMemberId: null, updatedAt: new Date() },
          { id: "slot_tk", roleId: "timekeeper", assignedMemberId: null, updatedAt: new Date() },
          { id: "slot_kiosk", roleId: "kiosk", assignedMemberId: null, updatedAt: new Date() },
        ],
        updatedAt: new Date(),
      },
    },
  });

  it("calculates member duty counts across season", () => {
    const plan = createTestPlan();
    plan.matches.m_target!.slots[0]!.assignedMemberId = "m_alice";
    plan.matches.m_target!.slots[1]!.assignedMemberId = "m_alice";

    const counts = getMemberDutyCounts(plan);
    expect(counts.get("m_alice")).toBe(2);
    expect(counts.get("m_bob")).toBe(0);
  });

  it("assigns qualified helper team members to matching slots", () => {
    const plan = createTestPlan();
    const result = autoAssignMatchDuties(plan, "m_target");

    expect(result.assignedCount).toBe(3);
    expect(result.unassignedSlotIds).toHaveLength(0);

    const refSlot = plan.matches.m_target!.slots.find(s => s.id === "slot_ref");
    const tkSlot = plan.matches.m_target!.slots.find(s => s.id === "slot_tk");
    const kioskSlot = plan.matches.m_target!.slots.find(s => s.id === "slot_kiosk");

    expect(refSlot?.assignedMemberId).toBe("m_alice"); // Only Alice in helper team has referee license
    expect(tkSlot?.assignedMemberId).toBe("m_bob"); // Bob has tk license
    expect(kioskSlot?.assignedMemberId).toBe("m_charlie"); // Charlie takes kiosk
  });

  it("does not assign playing members (schedule conflict exclusion)", () => {
    const plan = createTestPlan();
    // Diana belongs to team_home, which is playing in m_target at 14:00
    // Even though Diana has referee and tk license, she must NOT be assigned to m_target
    const _result = autoAssignMatchDuties(plan, "m_target");

    const assignedIds = plan.matches.m_target!.slots.map(s => s.assignedMemberId);
    expect(assignedIds).not.toContain("m_diana");
  });

  it("balances duty counts by prioritizing members with fewer duties", () => {
    const plan = createTestPlan();

    // Give Alice 3 existing duties in past matches
    plan.matches.m_past = {
      id: "m_past",
      time: new Date("2026-10-01T14:00:00.000Z"),
      homeTeamId: "team_other",
      awayTeamName: "Guest",
      slots: [
        { id: "p1", roleId: "kiosk", assignedMemberId: "m_alice", updatedAt: new Date() },
        { id: "p2", roleId: "kiosk", assignedMemberId: "m_alice", updatedAt: new Date() },
        { id: "p3", roleId: "kiosk", assignedMemberId: "m_alice", updatedAt: new Date() },
      ],
      updatedAt: new Date(),
    };

    // Both Bob and Charlie could do kiosk, but Charlie has 0 duties and Alice has 3
    // For kiosk slot only:
    plan.matches.m_target!.slots = [
      { id: "k1", roleId: "kiosk", assignedMemberId: null, updatedAt: new Date() },
    ];

    autoAssignMatchDuties(plan, "m_target", { balanceDutyCounts: true });

    // Alice (3 duties) must not be chosen when Bob (0 duties) and Charlie (0 duties) are available
    expect(plan.matches.m_target!.slots[0]!.assignedMemberId).not.toBe("m_alice");
    expect(["m_bob", "m_charlie"]).toContain(plan.matches.m_target!.slots[0]!.assignedMemberId);
  });

  it("falls back to club-wide members when helper team lacks required license", () => {
    const plan = createTestPlan();
    // Remove Alice's referee license so no one in helper team has it
    plan.members.m_alice!.skillIds = ["license_tk"];

    // Eric is a club-wide member with referee license
    const _result = autoAssignMatchDuties(plan, "m_target");

    const refSlot = plan.matches.m_target!.slots.find(s => s.id === "slot_ref");
    expect(refSlot?.assignedMemberId).toBe("m_eric");
  });

  it("does not overwrite already assigned slots", () => {
    const plan = createTestPlan();
    plan.matches.m_target!.slots[0]!.assignedMemberId = "m_eric";

    const result = autoAssignMatchDuties(plan, "m_target");
    expect(plan.matches.m_target!.slots[0]!.assignedMemberId).toBe("m_eric");
    expect(result.assignedCount).toBe(2);
  });

  it("reports unassigned slots when no eligible candidates exist", () => {
    const plan = createTestPlan();
    // Empty all members
    plan.members = {};

    const result = autoAssignMatchDuties(plan, "m_target");
    expect(result.assignedCount).toBe(0);
    expect(result.unassignedSlotIds).toEqual(["slot_ref", "slot_tk", "slot_kiosk"]);
  });
});
