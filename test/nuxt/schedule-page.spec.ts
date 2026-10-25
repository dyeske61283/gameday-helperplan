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
    store.plan!.config.roles = [{ id: "opening", name: "Opening", scope: "gameday", requiredSkillId: "keyholder" }];
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
    await page.findAll("form input[type='time']").at(0)!.setValue("12:00");
    await page.findAll("form input[type='time']").at(1)!.setValue("18:00");
    await page.get("textarea").setValue("Bring the key");
    expect(page.get("form").text()).toContain("Initial gameday duties");
    expect(page.get("form").text()).toContain("Opening");
    expect(page.get("form").text()).toContain("keyholder");
    await page.get("form").trigger("submit");
    await flushPromises();

    expect(Object.values(store.gamedays)).toHaveLength(1);
    expect(Object.values(store.gamedays)[0]).toMatchObject({ date: "2026-10-25", locationId: "hall", openingTime: "12:00", closingTime: "18:00", notes: "Bring the key" });
    expect(Object.values(store.gamedays)[0]?.slots.map(slot => slot.roleId)).toEqual(["opening"]);
    expect(page.text()).toContain("Closes: 18:00");
    expect(page.text()).toContain("Bring the key");
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
    const helperTeam = store.addTeam("Helpers")!;
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
    expect(page.get("form").text()).toContain("Parent gameday");
    expect(page.findAll("form select")[0]!.element).toHaveProperty("value", gameday.id);
    await page.get("input[type='datetime-local']").setValue("2026-10-25T13:00");
    await page.findAll("form select").at(-1)!.setValue(helperTeam.id);
    await page.get("form input[type='text']").setValue("Away");
    expect(page.get("form").text()).toContain("Default match duties");
    expect(page.get("form").text()).toContain("Referee");
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
    expect(match?.helperTeamId).toBe(helperTeam.id);
    expect(match?.slots).toHaveLength(1);
    expect(store.roles.find(role => role.id === match?.slots[0]?.roleId)?.requiredSkillId).toBe("license");
    expect(page.find("form").exists()).toBe(false);
  });
});
