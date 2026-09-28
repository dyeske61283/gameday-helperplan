import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PlanSetupPage from "../../app/pages/plans/[planId]/setup.vue";
import BaseSetupPage from "../../app/pages/setup.vue";

describe("plan setup", () => {
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

  it("renders existing-plan setup with editing sections", async () => {
    const component = await mountSuspended(PlanSetupPage, {
      route: "/plans/plan-123/setup#key=test-key",
    });

    await flushPromises();
    expect(component.text()).toContain("Could not load plan");
    expect(component.text()).toContain("Return to plan");
  });
});
