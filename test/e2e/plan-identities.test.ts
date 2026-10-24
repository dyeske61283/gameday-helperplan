import { describe, expect, it } from "vitest";
import { localPlanFixtures } from "./plan-identities";

describe("local E2E plan fixtures", () => {
  it("gives workflow, routing, and editing suites isolated plan identities", () => {
    const fixtures = Object.values(localPlanFixtures);
    expect(new Set(fixtures.map(fixture => fixture.id)).size).toBe(fixtures.length);
    expect(new Set(fixtures.map(fixture => fixture.key)).size).toBe(fixtures.length);
  });
});
