import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import DefaultLayout from "../../app/layouts/default.vue";
import PlanSetupPage from "../../app/pages/plans/[planId]/setup.vue";
import BaseSetupPage from "../../app/pages/setup.vue";
import { usePlanStore } from "../../app/stores/plan";

describe("plan setup", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it("renders the new-plan setup form", async () => {
    const component = await mountSuspended(BaseSetupPage);

    expect(component.text()).toContain("Set up a new plan");
    expect(component.find("button").exists()).toBe(true);
  });

  it("renders a recoverable load failure for an unavailable existing plan", async () => {
    const component = await mountSuspended(PlanSetupPage, {
      route: "/plans/plan-123/setup#key=test-key",
    });

    await flushPromises();
    expect(component.text()).toContain("Could not load plan");
    expect(component.find("a[href='/plans/plan-123#key=test-key']").exists()).toBe(true);
    component.unmount();
  });

  it("requires an explicit choice before reloading a dirty setup", async () => {
    const store = usePlanStore();
    store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key", { clubName: "Club", season: "2026/2027" });
    const team = store.addTeam("Original")!;
    store.updateTeam(team.id, "Local edit");
    const component = await mountSuspended(PlanSetupPage, {
      route: `/plans/${store.plan!.id}/setup`,
      global: { plugins: [pinia] },
    });

    const reload = component.findAll("button").find(button => button.text().includes("Reload from server"))!;
    await reload.trigger("click");
    await flushPromises();

    expect(document.body.textContent).toContain("Reloading will replace unsaved edits");
    expect(document.body.textContent).toContain("Save and reload");
    expect(document.body.textContent).toContain("Discard and reload");
    expect(document.body.textContent).toContain("Stay on this page");
    await [...document.querySelectorAll("button")].find(button => button.textContent?.trim() === "Stay on this page")?.click();
    await flushPromises();
    expect(store.plan?.teams[team.id]?.name).toBe("Local edit");
    expect(store.isDirty).toBe(true);
    component.unmount();
  });

  it("guards navigation away from the dirty setup page", async () => {
    const store = usePlanStore();
    store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key", { clubName: "Club", season: "2026/2027" });
    store.addTeam("Unsaved team");
    const component = await mountSuspended(PlanSetupPage, {
      route: `/plans/${store.plan!.id}/setup`,
      global: { plugins: [pinia] },
    });
    const router = (component.vm as typeof component.vm & { $router: { push: (path: string) => Promise<void>; currentRoute: { value: { fullPath: string } } } }).$router;
    const navigation = router.push(`/plans/${store.plan!.id}/teams`);
    await flushPromises();

    expect(document.body.textContent).toContain("You have unsaved plan edits");
    expect(document.body.textContent).toContain("Save and leave");
    expect(document.body.textContent).toContain("Discard and leave");
    expect(document.body.textContent).toContain("Stay on this page");
    await [...document.querySelectorAll("button")].find(button => button.textContent?.trim() === "Stay on this page")?.click();
    await navigation;

    expect(router.currentRoute.value.fullPath).toBe(`/plans/${store.plan!.id}/setup`);
    expect(store.isDirty).toBe(true);
    component.unmount();
  });

  it("offers save, discard, or stay before navigating away from dirty plan state", async () => {
    const store = usePlanStore();
    store.createNewPlan("test-plan-id", "test-key", { clubName: "Club", season: "2026/2027" });
    store.updatePlanSetup({
      clubName: "Edited Club",
      season: "2026/2027",
      contactEmail: "",
      homepage: "",
      roles: store.roles,
      locations: store.locations,
    });
    const layout = await mountSuspended(DefaultLayout, {
      route: "/source",
      global: { plugins: [pinia] },
    });
    const navigation = (layout.vm as typeof layout.vm & { $router: { push: (path: string) => Promise<void>; currentRoute: { value: { fullPath: string } } } }).$router.push("/destination");
    await flushPromises();

    expect(document.body.textContent).toContain("You have unsaved plan edits");
    expect(document.body.textContent).toContain("Save and leave");
    expect(document.body.textContent).toContain("Discard and leave");
    expect(document.body.textContent).toContain("Stay on this page");
    await [...document.querySelectorAll("button")].find(button => button.textContent?.trim() === "Discard and leave")?.click();
    await navigation;

    expect(store.isDirty).toBe(false);
    layout.unmount();
  });
});
