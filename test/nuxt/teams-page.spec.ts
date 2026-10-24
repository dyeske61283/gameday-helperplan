import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import TeamsPage from "../../app/pages/plans/[planId]/teams.vue";
import { usePlanStore } from "../../app/stores/plan";

describe("teams page", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it("shows each team’s member count in its collapsed, readable header", async () => {
    const planStore = usePlanStore();
    planStore.createNewPlan("test-plan", "", { clubName: "Club", season: "2026/2027" });
    const team = planStore.addTeam("A long team name that should remain readable on narrow screens")!;
    planStore.addMember({ name: "Member", teamIds: [team.id], skillIds: [] });

    const page = await mountSuspended(TeamsPage, {
      route: "/plans/test-plan/teams",
      global: { plugins: [pinia] },
    });
    const header = page.get("[data-slot='trigger']");
    const title = header.get("[data-slot='label']");

    expect(header.element.tagName).toBe("BUTTON");
    expect(title.text()).toContain(team.name);
    expect(title.classes()).toContain("whitespace-normal");
    expect(header.text()).toMatch(/1\s+Members/);
    expect(page.get("[data-slot='item']").classes()).toContain("bg-surface-container-low");

    await header.trigger("click");
    await flushPromises();
    const memberCard = page.get(".grid button[type='button']");
    expect(memberCard.element.tagName).toBe("BUTTON");
    expect(memberCard.find("div, h1, h2, h3, h4, h5, h6").exists()).toBe(false);
  });

  it("offers to add a member to a genuinely empty team and preselects that team", async () => {
    const planStore = usePlanStore();
    planStore.createNewPlan("test-plan", "", { clubName: "Club", season: "2026/2027" });
    const emptyTeam = planStore.addTeam("Empty team")!;
    const occupiedTeam = planStore.addTeam("Occupied team")!;
    planStore.addMember({ name: "Existing member", teamIds: [occupiedTeam.id], skillIds: [] });
    const planBeforeAdd = JSON.stringify(planStore.plan);

    const page = await mountSuspended(TeamsPage, {
      route: "/plans/test-plan/teams",
      global: { plugins: [pinia] },
    });
    const [emptyCard, occupiedCard, teamlessCard] = page.findAll("[data-slot='item']");
    await emptyCard!.get("[data-slot='trigger']").trigger("click");
    await occupiedCard!.get("[data-slot='trigger']").trigger("click");
    await teamlessCard!.get("[data-slot='trigger']").trigger("click");
    await flushPromises();

    const addToEmptyTeam = emptyCard!.findAll("button").find(button => button.text() === "Add Member");
    expect(addToEmptyTeam).toBeDefined();
    expect(occupiedCard!.findAll("button").some(button => button.text() === "Add Member")).toBe(false);
    expect(teamlessCard!.text()).toContain("No members found");
    expect(teamlessCard!.findAll("button").some(button => button.text() === "Add Member")).toBe(false);
    await addToEmptyTeam!.trigger("click");
    await flushPromises();

    expect(document.body.textContent).toContain("Team Assignments");
    expect(document.body.querySelector(`#team-${emptyTeam.id}`)?.getAttribute("aria-checked")).toBe("true");
    expect(planStore.membersList).toHaveLength(1);
    expect(JSON.stringify(planStore.plan)).toBe(planBeforeAdd);

    [...document.querySelectorAll("button")].find(button => button.textContent?.trim() === "Save Changes")?.click();
    await flushPromises();
    expect(planStore.membersList).toHaveLength(2);
    expect(planStore.membersList.find(member => member.name === "New Member")?.teamIds).toEqual([emptyTeam.id]);
  });

  it("discards a staged member when the editor is cancelled", async () => {
    const planStore = usePlanStore();
    planStore.createNewPlan("test-plan", "", { clubName: "Club", season: "2026/2027" });
    const team = planStore.addTeam("Empty team")!;
    const planBeforeCancel = JSON.stringify(planStore.plan);
    const page = await mountSuspended(TeamsPage, {
      route: "/plans/test-plan/teams",
      global: { plugins: [pinia] },
    });
    const [teamCard] = page.findAll("[data-slot='item']");

    await teamCard!.get("[data-slot='trigger']").trigger("click");
    await flushPromises();
    await teamCard!.findAll("button").find(button => button.text() === "Add Member")!.trigger("click");
    await flushPromises();
    expect(planStore.membersList).toHaveLength(0);

    [...document.querySelectorAll("button")].find(button => button.textContent?.trim() === "Cancel")?.click();
    expect(planStore.membersList).toHaveLength(0);
    expect(planStore.teams[team.id]).toBeDefined();
    expect(JSON.stringify(planStore.plan)).toBe(planBeforeCancel);
  });

  it("asks before deleting a member and leaves it intact when deletion is cancelled", async () => {
    const planStore = usePlanStore();
    planStore.createNewPlan("test-plan", "", { clubName: "Club", season: "2026/2027" });
    planStore.addMember({ name: "Member to remove", teamIds: [], skillIds: [] });
    const page = await mountSuspended(TeamsPage, {
      route: "/plans/test-plan/teams",
      global: { plugins: [pinia] },
    });
    const teamlessCard = page.findAll("[data-slot='item']").at(-1)!;
    await teamlessCard.get("[data-slot='trigger']").trigger("click");
    await flushPromises();
    await teamlessCard.find("button[aria-label='Member Details: Member to remove']").trigger("click");
    await flushPromises();

    const dialogs = () => [...document.querySelectorAll("[role='dialog']")];
    const editorDialog = dialogs().find(dialog => dialog.textContent?.includes("Team Assignments"))!;
    [...editorDialog.querySelectorAll("button")].find(button => button.textContent?.trim() === "Delete Member")?.click();
    await flushPromises();
    const confirmationDialog = dialogs().find(dialog => dialog.textContent?.includes("Remove Member to remove from this plan?"))!;
    expect(confirmationDialog.textContent).toContain("Remove Member to remove from this plan?");
    expect(planStore.membersList.map(member => member.name)).toEqual(["Member to remove"]);

    [...confirmationDialog.querySelectorAll("button")].find(button => button.textContent?.trim() === "Cancel")?.click();
    await flushPromises();
    expect(planStore.membersList.map(member => member.name)).toEqual(["Member to remove"]);

    [...editorDialog.querySelectorAll("button")].find(button => button.textContent?.trim() === "Delete Member")?.click();
    await flushPromises();
    [...confirmationDialog.querySelectorAll("button")].find(button => button.textContent?.trim() === "Delete Member")?.click();
    await flushPromises();
    expect(planStore.membersList).toHaveLength(0);
  });

  it("does not offer the empty-team action while teams are search-filtered", async () => {
    const planStore = usePlanStore();
    planStore.createNewPlan("test-plan", "", { clubName: "Club", season: "2026/2027" });
    planStore.addTeam("Empty team");
    const occupiedTeam = planStore.addTeam("Occupied team")!;
    planStore.addMember({ name: "Existing member", teamIds: [occupiedTeam.id], skillIds: [] });
    const page = await mountSuspended(TeamsPage, {
      route: "/plans/test-plan/teams",
      global: { plugins: [pinia] },
    });

    await page.get("input[placeholder='Search members by name...']").setValue("no matching member");
    await flushPromises();
    for (const card of page.findAll("[data-slot='item']")) {
      await card.get("[data-slot='trigger']").trigger("click");
    }
    await flushPromises();
    expect(page.findAll("[data-slot='item']").some(card => card.findAll("button").some(button => button.text() === "Add Member"))).toBe(false);
  });
});
