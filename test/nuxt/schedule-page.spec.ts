import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchedulePage from "../../app/pages/plans/[planId]/index.vue";
import { usePlanStore } from "../../app/stores/plan";

describe("schedule page", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it("offers to create the first gameday and hides empty schedule stats", async () => {
    const store = usePlanStore();
    store.createNewPlan("test-plan", "AAAAAAAAAAAAAAAAAAAAAA", { clubName: "Club", season: "2026/2027" });
    store.plan!.config.locations = [{ id: "hall", name: "Main hall" }];
    const save = vi.spyOn(store, "savePlan").mockImplementation(async (draft) => {
      if (draft)
        store.plan = draft;
      return true;
    });
    const page = await mountSuspended(SchedulePage, {
      route: "/plans/test-plan",
      global: { plugins: [pinia] },
    });
    expect(page.text()).not.toContain("Total Matches");
    await page.findAll("button").find(button => button.text() === "Create gameday")!.trigger("click");
    await page.get("input[type='date']").setValue("2026-10-25");
    await page.get("form").trigger("submit");
    await flushPromises();

    expect(Object.values(store.gamedays)).toHaveLength(1);
    expect(Object.values(store.gamedays)[0]).toMatchObject({ date: "2026-10-25", locationId: "hall" });
    expect(save).toHaveBeenCalledOnce();
  });

  it("leaves the plan unchanged when gameday creation is cancelled", async () => {
    const store = usePlanStore();
    store.createNewPlan("test-plan", "AAAAAAAAAAAAAAAAAAAAAA", { clubName: "Club", season: "2026/2027" });
    store.plan!.config.locations = [{ id: "hall", name: "Main hall" }];
    const page = await mountSuspended(SchedulePage, {
      route: "/plans/test-plan",
      global: { plugins: [pinia] },
    });
    const before = JSON.stringify(store.plan);

    await page.findAll("button").find(button => button.text() === "Create gameday")!.trigger("click");
    await page.get("input[type='date']").setValue("2026-10-25");
    await page.get("form button[type='button']").trigger("click");

    expect(JSON.stringify(store.plan)).toBe(before);
    expect(page.find("input[type='date']").exists()).toBe(false);
  });

  it("keeps a failed match creation open for retry and saves one match with configured duties", async () => {
    const store = usePlanStore();
    store.createNewPlan("test-plan", "AAAAAAAAAAAAAAAAAAAAAA", { clubName: "Club", season: "2026/2027" });
    store.plan!.config.locations = [{ id: "hall", name: "Main hall" }];
    store.plan!.config.roles = [{ id: "referee", name: "Referee", scope: "match", requiredSkillId: "license" }];
    const homeTeam = store.addTeam("Home")!;
    const gameday = store.createGameday({ date: "2026-10-25", locationId: "hall" });
    let failSave = true;
    vi.spyOn(store, "savePlan").mockImplementation(async (draft) => {
      if (failSave) {
        store.error = "storage unavailable";
        return false;
      }
      store.error = null;
      store.plan = draft!;
      return true;
    });
    const page = await mountSuspended(SchedulePage, {
      route: "/plans/test-plan",
      global: { plugins: [pinia] },
    });
    const before = JSON.stringify(store.plan);

    await page.findAll("button").find(button => button.text() === "Create match")!.trigger("click");
    await page.get("input[type='datetime-local']").setValue("2026-10-25T13:00");
    await page.findAll("form input").at(-1)!.setValue("Away");
    await page.get("form").trigger("submit");
    await flushPromises();

    expect(JSON.stringify(store.plan)).toBe(before);
    expect(page.get("form").text()).toContain("storage unavailable");
    expect(page.get("input[type='datetime-local']").element).toHaveProperty("value", "2026-10-25T13:00");

    failSave = false;
    await page.get("form").trigger("submit");
    await flushPromises();

    const match = Object.values(store.matches)[0];
    expect(Object.values(store.matches)).toHaveLength(1);
    expect(store.gamedays[gameday.id]?.matchIds).toEqual([match!.id]);
    expect(match?.homeTeamId).toBe(homeTeam.id);
    expect(match?.slots).toHaveLength(1);
    expect(store.roles.find(role => role.id === match?.slots[0]?.roleId)?.requiredSkillId).toBe("license");
    expect(page.find("form").exists()).toBe(false);
  });
});
