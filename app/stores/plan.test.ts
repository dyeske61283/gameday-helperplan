import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toRaw } from "vue";
import { NewPlanMetadataSchema } from "../utils/plan-types";
import { migrateIfNeeded, usePlanStore } from "./plan.ts";

// Mock dependencies
vi.mock("../composables/use-crypto", () => ({
  useEncryption: () => ({
    encryptData: vi.fn(async (data: string) => data),
    generateKey: vi.fn(),
  }),
  useDecryption: () => ({
    decryptBlob: vi.fn(async (blob: string) => blob),
  }),
}));

vi.mock("@vueuse/core", () => ({
  useLocalStorage: (_: string, defaultValue: any) => ({
    value: defaultValue,
  }),
}));

describe("usePlanStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("validates the required new-plan metadata", () => {
    expect(NewPlanMetadataSchema.safeParse({ clubName: "", season: "2026/2027" }).success).toBe(false);
    expect(NewPlanMetadataSchema.parse({ clubName: " TSV Musterstadt ", season: " 2026/2027 " })).toEqual({
      clubName: "TSV Musterstadt",
      season: "2026/2027",
    });
  });

  it("returns false and preserves the draft when saving fails", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue(new Error("storage unavailable")));
    const store = usePlanStore();
    store.createNewPlan("test-plan-id", "test-key", { clubName: "Club", season: "2026/2027" });
    const beforeRevision = store.plan!.rev;

    await expect(store.savePlan()).resolves.toBe(false);
    expect(store.error).toBe("storage unavailable");
    expect(store.plan!.club.name).toBe("Club");
    expect(store.plan!.rev).toBe(beforeRevision);
    vi.unstubAllGlobals();
  });

  it("commits an isolated edit only after save succeeds and reloads it", async () => {
    let savedBlob = "";
    vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { method?: string; body?: { blob: string } }) => {
      if (options?.method === "POST") {
        savedBlob = options.body!.blob;
        return {};
      }
      return { blob: savedBlob };
    }));
    const store = usePlanStore();
    store.createNewPlan("test-plan-id", "test-key", { clubName: "Original", season: "2026/2027" });
    const draft = structuredClone(toRaw(store.plan!));
    draft.club.name = "Edited";

    await expect(store.savePlan(draft)).resolves.toBe(true);
    expect(store.plan).not.toBeNull();
    expect(store.plan!.club.name).toBe("Edited");
    await store.loadPlan("test-plan-id", "test-key");

    expect(store.plan?.club.name).toBe("Edited");
    vi.unstubAllGlobals();
  });

  it("does not publish an isolated edit when save fails", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue(new Error("storage unavailable")));
    const store = usePlanStore();
    store.createNewPlan("test-plan-id", "test-key", { clubName: "Original", season: "2026/2027" });
    const draft = structuredClone(toRaw(store.plan!));
    draft.club.name = "Failed edit";

    await expect(store.savePlan(draft)).resolves.toBe(false);
    expect(store.plan?.club.name).toBe("Original");
    vi.unstubAllGlobals();
  });

  it("defers newer SSE plans while an editor is dirty", async () => {
    let source: { onmessage?: (event: MessageEvent) => Promise<void>; close: () => void } | undefined;
    vi.stubGlobal("EventSource", class {
      constructor() {
        return source = { onmessage: undefined, close() {} };
      }
    });
    const store = usePlanStore();
    store.createNewPlan("test-plan-id", "test-key", { clubName: "Original", season: "2026/2027" });
    store.setEditing(true);
    store.watchPlan();

    const update = structuredClone(toRaw(store.plan!));
    update.rev = 2;
    update.club.name = "Remote edit";
    await source?.onmessage?.({ data: JSON.stringify(update) } as MessageEvent);

    expect(store.plan?.club.name).toBe("Original");
    expect(store.pendingUpdate?.club.name).toBe("Remote edit");
    store.applyPendingUpdate();
    expect(store.plan?.club.name).toBe("Remote edit");
    vi.unstubAllGlobals();
  });

  describe("migrateIfNeeded", () => {
    it("should migrate an old plan to the current version", () => {
      const oldPlan = {
        id: "old-id",
        schemaVersion: 0,
        club: { id: "1", name: "Old Club" },
        teams: {},
        matches: {
          m1: {
            id: "m1",
            homeTeam: "A",
            awayTeam: "B",
            slots: [
              { id: "open", assignedMemberId: null },
              { id: "assigned", assignedMemberId: "member-1" },
            ],
          },
        },
      };

      const migratedPlan = migrateIfNeeded(oldPlan as any);

      expect(migratedPlan.schemaVersion).toBe(2);
      expect(migratedPlan.matches.m1?.slots).toBeDefined();
      expect(Array.isArray(migratedPlan.matches.m1?.slots)).toBe(true);
      expect(migratedPlan.matches.m1?.slots[0]?.assignmentStatus).toBe("OPEN");
      expect(migratedPlan.matches.m1?.slots[1]?.assignmentStatus).toBe("ASSIGNED");
    });

    it("migrates both match and gameday slot assignment status", () => {
      const oldPlan = {
        schemaVersion: 1,
        matches: { m1: { slots: [{ assignedMemberId: null }] } },
        gamedays: { g1: { slots: [{ assignedMemberId: "member-1" }] } },
      };

      const migratedPlan = migrateIfNeeded(oldPlan as any);

      expect(migratedPlan.schemaVersion).toBe(2);
      expect(migratedPlan.matches.m1?.slots[0]?.assignmentStatus).toBe("OPEN");
      expect(migratedPlan.gamedays.g1?.slots[0]?.assignmentStatus).toBe("ASSIGNED");
    });
  });

  describe("example plan loading", () => {
    it("should load the example plan into state", () => {
      const store = usePlanStore();
      expect(store.plan).toBeNull();

      const loaded = store.loadExamplePlan();
      expect(loaded).toBeDefined();
      expect(store.plan).not.toBeNull();
      expect(Object.keys(store.teams).length).toBeGreaterThan(0);
    });

    it("should ensure plan is loaded on demand", () => {
      const store = usePlanStore();
      expect(store.plan).toBeNull();

      store.ensurePlanLoaded();
      expect(store.plan).not.toBeNull();
    });
  });

  describe("team management", () => {
    it("should add, update, and delete a team", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan", "test-key");

      const newTeam = store.addTeam("Men 1");
      expect(store.teams[newTeam.id]).toBeDefined();
      expect(store.teams[newTeam.id]?.name).toBe("Men 1");

      const member = store.addMember({ name: "John Doe", teamIds: [newTeam.id] });
      expect(store.members[member.id]?.teamIds).toContain(newTeam.id);

      store.updateTeam(newTeam.id, "Men Senior");
      expect(store.teams[newTeam.id]?.name).toBe("Men Senior");

      store.deleteTeam(newTeam.id);
      expect(store.teams[newTeam.id]).toBeUndefined();
      expect(store.members[member.id]?.teamIds).not.toContain(newTeam.id);
    });

    it("updates club details without replacing the plan aggregate", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan", "test-key");
      const original = store.plan;

      store.updatePlanDetails({
        club: { name: "Updated Club", contactEmail: "club@example.com" },
        season: "2026/2027",
      });

      expect(store.plan).toBe(original);
      expect(store.plan?.club.name).toBe("Updated Club");
      expect(store.plan?.club.contactEmail).toBe("club@example.com");
      expect(store.plan?.season).toBe("2026/2027");
    });
  });

  describe("member management", () => {
    it("should add, update, and delete a member", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan", "test-key");

      const member = store.addMember({ name: "Jane Doe", skillIds: ["referee"] });
      expect(store.members[member.id]).toBeDefined();
      expect(store.members[member.id]?.name).toBe("Jane Doe");

      store.updateMember(member.id, { name: "Jane Smith", skillIds: ["referee", "esb"] });
      expect(store.members[member.id]?.name).toBe("Jane Smith");
      expect(store.members[member.id]?.skillIds).toEqual(["referee", "esb"]);

      store.deleteMember(member.id);
      expect(store.members[member.id]).toBeUndefined();
    });
  });

  describe("assignHelperTeam", () => {
    it("should assign a helper team to a match", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");

      store.plan!.matches.m1 = {
        id: "m1",
        time: new Date(),
        homeTeamId: "A",
        awayTeamName: "B",
        slots: [],
        updatedAt: new Date(0),
      };

      store.assignHelperTeam("m1", "t1");

      expect(store.plan?.matches.m1.helperTeamId).toBe("t1");
      expect(store.plan?.matches.m1.updatedAt.getTime()).toBeGreaterThan(0);
    });
  });

  describe("assignMemberToSlot and toggleCheckIn", () => {
    it("should assign a member or custom name to a slot", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");

      store.plan!.matches.m1 = {
        id: "m1",
        time: new Date(),
        homeTeamId: "A",
        awayTeamName: "B",
        slots: [
          {
            id: "slot-1",
            roleId: "timekeeper",
            assignedMemberId: null,
            updatedAt: new Date(0),
          },
        ],
        updatedAt: new Date(0),
      };

      store.assignMemberToSlot("m1", "slot-1", "mem-1", "Parent Volunteer");

      expect(store.plan?.matches.m1?.slots[0]?.assignedMemberId).toBe("mem-1");
      expect(store.plan?.matches.m1?.slots[0]?.customHelperName).toBe("Parent Volunteer");
    });

    it("should toggle check-in status on a slot", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");

      store.plan!.matches.m1 = {
        id: "m1",
        time: new Date(),
        homeTeamId: "A",
        awayTeamName: "B",
        slots: [
          {
            id: "slot-1",
            roleId: "timekeeper",
            assignedMemberId: "mem-1",
            checkedIn: false,
            updatedAt: new Date(0),
          },
        ],
        updatedAt: new Date(0),
      };

      store.toggleCheckIn("m1", "slot-1");
      expect(store.plan?.matches.m1?.slots[0]?.checkedIn).toBe(true);

      store.toggleCheckIn("m1", "slot-1");
      expect(store.plan?.matches.m1?.slots[0]?.checkedIn).toBe(false);
    });

    it("should clear match slots", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");

      store.plan!.matches.m1 = {
        id: "m1",
        time: new Date(),
        homeTeamId: "A",
        awayTeamName: "B",
        slots: [
          {
            id: "slot-1",
            roleId: "timekeeper",
            assignedMemberId: "mem-1",
            customHelperName: "Guest",
            checkedIn: true,
            updatedAt: new Date(0),
          },
        ],
        updatedAt: new Date(0),
      };

      store.clearMatchSlots("m1");
      expect(store.plan?.matches.m1?.slots[0]?.assignedMemberId).toBeNull();
      expect(store.plan?.matches.m1?.slots[0]?.customHelperName).toBeNull();
      expect(store.plan?.matches.m1?.slots[0]?.checkedIn).toBe(false);
    });

    it("should auto-assign unassigned match slots from store", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");

      store.addMember({ name: "Volunteer One", teamIds: ["team-helper"] });
      store.plan!.teams["team-helper"] = {
        id: "team-helper",
        name: "Helper Team",
        isManual: true,
        updatedAt: new Date(),
      };
      store.plan!.config.roles.push({
        id: "timekeeper",
        name: "Timekeeper",
        scope: "match",
      });

      store.plan!.matches.m1 = {
        id: "m1",
        time: new Date("2026-10-15T14:00:00.000Z"),
        homeTeamId: "team-other",
        awayTeamName: "Away Team",
        helperTeamId: "team-helper",
        slots: [
          {
            id: "slot-1",
            roleId: "timekeeper",
            assignedMemberId: null,
            updatedAt: new Date(0),
          },
        ],
        updatedAt: new Date(0),
      };

      store.autoAssignMatchSlots("m1");
      expect(store.plan?.matches.m1?.slots[0]?.assignedMemberId).toBeDefined();
      expect(store.plan?.matches.m1?.slots[0]?.assignedMemberId).not.toBeNull();
    });
  });

  describe("claimSlot", () => {
    it("claims an open eligible slot without replacing an assignment", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");
      const member = store.addMember({ name: "Capable Helper", skillIds: ["referee"] });
      store.plan!.config.roles.push({ id: "referee-duty", name: "Referee", scope: "match", requiredSkillId: "referee" });
      store.plan!.matches.m1 = {
        id: "m1",
        time: new Date(),
        homeTeamId: "A",
        awayTeamName: "B",
        slots: [{ id: "slot-1", roleId: "referee-duty", assignedMemberId: null, assignmentStatus: "OPEN", updatedAt: new Date(1) }],
        updatedAt: new Date(1),
      };

      store.selectedMemberId = member.id;
      store.claimSlot("m1", "slot-1", member.id);

      expect(store.plan!.matches.m1!.slots[0]!.assignedMemberId).toBe(member.id);
      expect(store.plan!.matches.m1!.slots[0]!.assignmentStatus).toBe("ASSIGNED");
      const otherMember = store.addMember({ name: "Other Helper" });
      expect(() => store.claimSlot("m1", "slot-1", otherMember.id)).toThrow("already been claimed");
    });

    it("rejects an ineligible member", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");
      const member = store.addMember({ name: "Unlicensed Helper" });
      store.plan!.config.roles.push({ id: "referee-duty", name: "Referee", scope: "match", requiredSkillId: "referee" });
      store.plan!.matches.m1 = {
        id: "m1",
        time: new Date(),
        homeTeamId: "A",
        awayTeamName: "B",
        slots: [{ id: "slot-1", roleId: "referee-duty", assignedMemberId: null, assignmentStatus: "OPEN", updatedAt: new Date(1) }],
        updatedAt: new Date(1),
      };
      store.selectedMemberId = member.id;

      expect(() => store.claimSlot("m1", "slot-1", member.id)).toThrow("required capability");
    });

    it("rejects unknown match and slot IDs", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");
      expect(() => store.claimSlot("missing-match", "missing-slot", "missing-member")).toThrow("not found");
    });

    it("keeps a claimed duty after save and reload", async () => {
      let savedBlob = "";
      vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { method?: string; body?: { blob: string } }) => {
        if (options?.method === "POST") {
          savedBlob = options.body!.blob;
          return {};
        }
        return { blob: savedBlob };
      }));

      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");
      const member = store.addMember({ name: "Capable Helper", skillIds: ["referee"] });
      store.plan!.config.roles.push({ id: "referee-duty", name: "Referee", scope: "match", requiredSkillId: "referee" });
      store.plan!.matches.m1 = {
        id: "m1",
        time: new Date(),
        homeTeamId: "A",
        awayTeamName: "B",
        slots: [{ id: "slot-1", roleId: "referee-duty", assignedMemberId: null, assignmentStatus: "OPEN", updatedAt: new Date(1) }],
        updatedAt: new Date(1),
      };

      store.claimSlot("m1", "slot-1", member.id);
      await store.savePlan();
      store.plan = null;
      await store.loadPlan("test-plan-id", "test-key");

      expect(store.plan).not.toBeNull();
      const loadedPlan = store.plan!;
      expect(loadedPlan.matches.m1?.slots[0]?.assignedMemberId).toBe(member.id);
      expect(loadedPlan.matches.m1?.slots[0]?.assignmentStatus).toBe("ASSIGNED");
      vi.unstubAllGlobals();
    });
  });
});
