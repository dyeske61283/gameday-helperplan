import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import PlanSetupPage from "../../app/pages/plans/[planId]/setup.vue";
import BaseSetupPage from "../../app/pages/setup.vue";

describe("setup page", () => {
  it("renders the new-plan start action", async () => {
    const component = await mountSuspended(BaseSetupPage);

    expect(component.text()).toContain("Set up your Gameday Plan");
    expect(component.text()).toContain("Start Setup");
    expect(component.find("a[href='/']").exists()).toBe(true);
  });

  it("keeps the wizard on metadata validation failure and offers cancel", async () => {
    const component = await mountSuspended(BaseSetupPage);
    const start = component.findAll("button").find(button => button.text() === "Start Setup");
    await start?.trigger("click");
    await component.find("form").trigger("submit");

    expect(component.text()).toContain("Enter a club name and season to continue.");
    expect(component.text()).toContain("Club Information");
    expect(component.text()).toContain("Cancel");
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
