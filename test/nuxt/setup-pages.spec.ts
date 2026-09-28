import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import PlanSetupPage from "../../app/pages/plans/[planId]/setup.vue";
import BaseSetupPage from "../../app/pages/setup.vue";

describe("setup placeholders", () => {
  it("renders the unavailable base setup page with a start action", async () => {
    const component = await mountSuspended(BaseSetupPage);

    expect(component.text()).toContain("Plan setup is unavailable");
    expect(component.text()).toContain("Creating a new plan is not available yet.");
    expect(component.find("a[href='/']").exists()).toBe(true);
  });

  it("renders existing-plan setup without loading plan data", async () => {
    const component = await mountSuspended(PlanSetupPage, {
      route: "/plans/plan-123/setup#key=test-key",
    });

    expect(component.text()).toContain("Editing this plan is not available yet.");
    expect(component.find("a[href='/plans/plan-123#key=test-key']").exists()).toBe(true);
    expect(component.text()).not.toContain("Loading plan");
  });
});
