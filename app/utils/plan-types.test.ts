import { describe, expect, it } from "vitest";
import legacyPlan from "../../test/fixtures/legacy-plan-v1.json";
import { getMemberDutyCounts, isMemberEligibleForSlot } from "./helper-assignment";
import { CURRENT_SCHEMA_VERSION, parseSeasonPlan, SeasonPlanSchema } from "./plan-types";

describe("season plan schema", () => {
  it("migrates and validates the legacy fixture without changing it", () => {
    const source = JSON.parse(JSON.stringify(legacyPlan));
    const plan = parseSeasonPlan(legacyPlan);

    expect(SeasonPlanSchema.safeParse(JSON.parse(JSON.stringify(plan))).success).toBe(true);
    expect(plan.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(plan.matches["match-1"]?.slots.map(slot => slot.assignmentStatus)).toEqual(["OPEN", "ASSIGNED"]);
    expect(plan.gamedays["gameday-1"]?.slots[0]?.assignmentStatus).toBe("ASSIGNED");
    expect(isMemberEligibleForSlot(plan, plan.matches["match-1"]!.slots[0]!, "eligible")).toBe(true);
    expect(isMemberEligibleForSlot(plan, plan.matches["match-1"]!.slots[0]!, "ineligible")).toBe(false);
    expect(getMemberDutyCounts(plan).get("eligible")).toBe(2);
    expect(legacyPlan).toEqual(source);
  });

  it("restores omitted legacy match and gameday duty slots", () => {
    const source = JSON.parse(JSON.stringify(legacyPlan));
    delete source.matches["match-1"]!.slots;
    delete source.gamedays["gameday-1"]!.slots;

    const plan = parseSeasonPlan(source);

    expect(plan.matches["match-1"]?.slots).toEqual([]);
    expect(plan.gamedays["gameday-1"]?.slots).toEqual([]);
    expect(source.matches["match-1"]!.slots).toBeUndefined();
    expect(source.gamedays["gameday-1"]!.slots).toBeUndefined();
  });

  it("rejects malformed legacy slot collections instead of dropping their data", () => {
    const invalidLegacy = JSON.parse(JSON.stringify(legacyPlan));
    invalidLegacy.matches["match-1"].slots = "not-an-array";

    expect(() => parseSeasonPlan(invalidLegacy)).toThrow();
  });

  it("keeps current plans unchanged while validating them", () => {
    const current = JSON.parse(JSON.stringify(legacyPlan));
    current.schemaVersion = CURRENT_SCHEMA_VERSION;
    current.matches["match-1"]!.slots = current.matches["match-1"]!.slots!.map((slot: { assignedMemberId: string | null }) => ({
      ...slot,
      assignmentStatus: slot.assignedMemberId ? "ASSIGNED" : "OPEN",
    }));
    current.gamedays["gameday-1"]!.slots = current.gamedays["gameday-1"]!.slots!.map((slot: Record<string, unknown>) => ({
      ...slot,
      assignmentStatus: "OPEN",
    }));
    const source = structuredClone(current);

    const plan = parseSeasonPlan(current);

    expect(SeasonPlanSchema.parse(current)).toEqual(plan);
    expect(parseSeasonPlan(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
    expect(current).toEqual(source);
  });

  it("rejects a current plan that still needs a migration", () => {
    const invalidCurrent = JSON.parse(JSON.stringify(legacyPlan));
    invalidCurrent.schemaVersion = CURRENT_SCHEMA_VERSION;

    expect(() => parseSeasonPlan(invalidCurrent)).toThrow();
  });

  it("records the plan schema shape so model changes require an explicit snapshot update", () => {
    expect(SeasonPlanSchema.toJSONSchema({ io: "input" })).toMatchSnapshot();
  });
});
