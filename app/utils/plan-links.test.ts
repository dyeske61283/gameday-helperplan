import { describe, expect, it } from "vitest";
import { createPlanLink } from "./plan-links";

describe("createPlanLink", () => {
  it("creates canonical and nested encrypted links", () => {
    expect(createPlanLink("plan-1", "abc_def")).toBe("/plans/plan-1#key=abc_def");
    expect(createPlanLink("plan-1", "abc_def", "/plans/plan-1/setup")).toBe("/plans/plan-1/setup#key=abc_def");
    expect(createPlanLink("plan-1", "abc_def", "/plans/plan-1/matches/match-1")).toBe("/plans/plan-1/matches/match-1#key=abc_def");
  });
});
