import { describe, expect, it } from "vitest";
import legacyPlan from "../../test/fixtures/legacy-plan-v1.json";
import { runPlanCommand } from "./plan-runner";
import { CURRENT_SCHEMA_VERSION } from "./plan-types";

describe("plan runner", () => {
  it("validates and normalizes a decrypted legacy plan", () => {
    const result = runPlanCommand({ command: "validate", plan: legacyPlan });

    expect(result).toEqual({
      command: "validate",
      summary: { valid: true, planId: legacyPlan.id, schemaVersion: CURRENT_SCHEMA_VERSION },
    });
  });

  it("claims an eligible duty with a deterministic timestamp", () => {
    const result = runPlanCommand({
      command: "claim-duty",
      plan: legacyPlan,
      matchId: "match-1",
      slotId: "match-slot-open",
      memberId: "eligible",
      now: "2026-10-25T12:00:00.000Z",
    });

    expect(result.summary).toEqual({ matchId: "match-1", slotId: "match-slot-open", assignedMemberId: "eligible" });
    expect(Object.keys(result).sort()).toEqual(["command", "summary"]);
  });

  it("auto-assigns open duties and reports unfilled duties", () => {
    const plan = structuredClone(legacyPlan);
    plan.matches["match-1"]!.slots[1]!.assignedMemberId = null;

    const result = runPlanCommand({
      command: "auto-assign",
      plan,
      matchId: "match-1",
      now: "2026-10-25T12:00:00.000Z",
      excludeConflicts: false,
    });

    expect(result.summary).toEqual({ assignedCount: 1, unassignedSlotIds: ["match-slot-assigned"] });
    expect(Object.keys(result).sort()).toEqual(["command", "summary"]);
  });

  it("completes assigned duties after their gameday closes", () => {
    const result = runPlanCommand({
      command: "complete-assignments",
      plan: legacyPlan,
      now: "2026-10-27T12:00:00.000Z",
    });

    expect(result.summary).toEqual({ completedCount: 2 });
    expect(Object.keys(result).sort()).toEqual(["command", "summary"]);
  });

  it("rejects unknown commands, missing deterministic time, and rejected duties", () => {
    expect(() => runPlanCommand({ command: "unknown", plan: legacyPlan })).toThrow("Unknown command");
    expect(() => runPlanCommand({ command: "complete-assignments", plan: legacyPlan })).toThrow("Invalid request");
    expect(() => runPlanCommand({ command: "validate", plan: {} })).toThrow();
    expect(() => runPlanCommand({
      command: "auto-assign",
      plan: legacyPlan,
      matchId: "missing-match",
      now: "2026-10-25T12:00:00.000Z",
    })).toThrow("Match not found");
    expect(() => runPlanCommand({
      command: "claim-duty",
      plan: legacyPlan,
      matchId: "match-1",
      slotId: "match-slot-open",
      memberId: "ineligible",
      now: "2026-10-25T12:00:00.000Z",
    })).toThrow("required capability");
  });
});
