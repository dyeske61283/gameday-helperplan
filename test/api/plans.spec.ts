import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SeasonPlanSchema,

} from "../../app/utils/plan-types";

const FIXTURES_DIR = path.join(import.meta.dirname, "../fixtures");

describe("example plans validation", () => {
  it("should successfully load and validate 2024/2025 plan fixture", () => {
    const planPath = path.join(FIXTURES_DIR, "plan-2024-2025.json");
    expect(fs.existsSync(planPath)).toBe(true);

    const rawPlan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    const plan = SeasonPlanSchema.parse(rawPlan);

    // Specific structural checks
    expect(plan.season).toBe("2024/2025");
    expect(plan.club.name).toBeTruthy();

    // Check that we have actual matches and gamedays
    expect(Object.keys(plan.gamedays).length).toBeGreaterThan(0);
    expect(Object.keys(plan.matches).length).toBeGreaterThan(0);

    // Verify some specific mapped slot fields (e.g. checkedIn is false by default)
    const matchesList = Object.values(plan.matches);
    const hasSlots = matchesList.some(m => m.slots && m.slots.length > 0);
    expect(hasSlots).toBe(true);

    const sampleMatch = matchesList.find(m => m.slots && m.slots.length > 0);
    expect(sampleMatch?.slots[0].checkedIn).toBe(false);
  });

  it("should successfully load and validate 2025/2026 plan fixture", () => {
    const planPath = path.join(FIXTURES_DIR, "plan-2025-2026.json");
    expect(fs.existsSync(planPath)).toBe(true);

    const rawPlan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    const plan = SeasonPlanSchema.parse(rawPlan);

    // Specific structural checks
    expect(plan.season).toBe("2025/2026");
    expect(plan.club.name).toBeTruthy();

    // Check that we have actual matches and gamedays
    expect(Object.keys(plan.gamedays).length).toBeGreaterThan(0);
    expect(Object.keys(plan.matches).length).toBeGreaterThan(0);

    // Verify location resolves
    const gamedaysList = Object.values(plan.gamedays);
    expect(gamedaysList.some(gd => gd.locationId === "emmy-noether-halle")).toBe(true);
    expect(gamedaysList.some(gd => gd.slots.length > 0)).toBe(true);
  });
});
