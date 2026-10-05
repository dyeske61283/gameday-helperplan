import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PlanSetupPage from "../../app/pages/plans/[planId]/setup.vue";
import BaseSetupPage from "../../app/pages/setup.vue";

describe("plan setup", () => {
  it("renders the unavailable new-plan state with a route back home", async () => {
    const component = await mountSuspended(BaseSetupPage);

    expect(component.text()).toContain("New plan setup is not available yet.");
    expect(component.find("a[href='/']").exists()).toBe(true);
  });

  it("renders unavailable existing-plan setup with a canonical plan link", async () => {
    const component = await mountSuspended(PlanSetupPage, {
      route: "/plans/plan-123/setup#key=test-key",
    });

    await flushPromises();
    expect(component.text()).toContain("Plan setup is not available yet.");
    expect(component.find("a[href='/plans/plan-123#key=test-key']").exists()).toBe(true);
  });
});
