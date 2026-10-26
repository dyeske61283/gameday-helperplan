import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toRaw } from "vue";
import legacyPlan from "../../test/fixtures/legacy-plan-v1.json";
import { CURRENT_SCHEMA_VERSION, NewPlanMetadataSchema } from "../utils/plan-types";
import { usePlanStore } from "./plan.ts";

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
    vi.useFakeTimers({ now: new Date("2026-10-25T00:00:00.000Z") });
  });

  afterEach(() => vi.useRealTimers());

  it("validates the required new-plan metadata", () => {
    const invalidClub = NewPlanMetadataSchema.safeParse({ clubName: "", season: "2026/2027" });
    const invalidSeason = NewPlanMetadataSchema.safeParse({ clubName: "Club", season: "" });
    expect(invalidClub.success).toBe(false);
    expect(invalidClub.error?.issues[0]?.message).toBe("ui.clubNameRequired");
    expect(invalidSeason.success).toBe(false);
    expect(invalidSeason.error?.issues[0]?.message).toBe("ui.seasonRequired");
    expect(NewPlanMetadataSchema.parse({ clubName: " TSV Musterstadt ", season: " 2026/2027 " })).toEqual({
      clubName: "TSV Musterstadt",
      season: "2026/2027",
    });
  });

  it("reports a localized error key when saving without plan context", async () => {
    const store = usePlanStore();

    await expect(store.savePlan()).resolves.toBe(false);
    expect(store.error).toBe("ui.missingPlanKey");
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
    let savedRevision = 0;
    vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { method?: string; body?: { blob: string; expectedRevision: number } }) => {
      if (options?.method === "POST") {
        savedBlob = options.body!.blob;
        savedRevision = options.body!.expectedRevision + 1;
        return { revision: savedRevision };
      }
      return { blob: savedBlob, revision: savedRevision };
    }));
    const store = usePlanStore();
    store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key", { clubName: "Original", season: "2026/2027" });
    const draft = structuredClone(toRaw(store.plan!));
    draft.club.name = "Edited";

    await expect(store.savePlan(draft)).resolves.toBe(true);
    expect(store.plan).not.toBeNull();
    expect(store.plan!.club.name).toBe("Edited");
    expect(store.isDirty).toBe(false);
    await store.loadPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key");

    expect(store.plan?.club.name).toBe("Edited");
    vi.unstubAllGlobals();
  });

  it("marks local edits dirty and clears the state only after a successful save", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({ revision: 1 }));
    const store = usePlanStore();
    store.createNewPlan("test-plan-id", "test-key", { clubName: "Club", season: "2026/2027" });
    expect(store.isDirty).toBe(false);

    store.plan!.club.name = "Edited locally";
    expect(store.isDirty).toBe(true);
    await expect(store.savePlan()).resolves.toBe(true);
    expect(store.isDirty).toBe(false);
    vi.unstubAllGlobals();
  });

  it("routes setup fields through a store action and can discard back to the saved baseline", () => {
    const store = usePlanStore();
    store.createNewPlan("test-plan-id", "test-key", { clubName: "Club", season: "2026/2027" });

    store.updatePlanSetup({
      clubName: "Edited Club",
      season: "2027/2028",
      contactEmail: "club@example.org",
      homepage: "https://example.org",
      roles: [{ id: "role-1", name: "Timekeeper", scope: "gameday", requiredSkillId: "esb" }],
      locations: [{ id: "location-1", name: "Main Hall" }],
    });

    expect(store.isDirty).toBe(true);
    expect(store.plan?.club.name).toBe("Edited Club");
    expect(store.plan?.config.roles[0]?.requiredSkillId).toBe("esb");
    store.discardLocalEdits();
    expect(store.plan?.club.name).toBe("Club");
    expect(store.isDirty).toBe(false);
  });

  it("clears dirty state when a store-owned field edit is reverted", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({ revision: 1 }));
    const store = usePlanStore();
    store.createNewPlan("test-plan-id", "test-key");
    const team = store.addTeam("Original")!;
    await store.savePlan();

    store.updateTeam(team.id, "Changed");
    expect(store.isDirty).toBe(true);
    store.updateTeam(team.id, "Original");

    expect(store.isDirty).toBe(false);
    vi.unstubAllGlobals();
  });

  it("migrates and validates a legacy plan before publishing it from a shared-link load", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({ blob: JSON.stringify(legacyPlan), revision: 4 }));
    const store = usePlanStore();

    await store.loadPlan(legacyPlan.id, "test-key");

    expect(store.plan?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(store.matches["match-1"]?.slots[0]?.assignmentStatus).toBe("OPEN");
    expect(store.gamedays["gameday-1"]?.slots[0]?.assignmentStatus).toBe("ASSIGNED");
    let expectedRevision: number | undefined;
    vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { body?: { expectedRevision: number } }) => {
      expectedRevision = options?.body?.expectedRevision;
      return { revision: 5 };
    }));
    await store.savePlan();
    expect(expectedRevision).toBe(4);
    vi.unstubAllGlobals();
  });

  it("preserves isolated local edits when save fails", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue(new Error("storage unavailable")));
    const store = usePlanStore();
    store.createNewPlan("test-plan-id", "test-key", { clubName: "Original", season: "2026/2027" });
    const draft = structuredClone(toRaw(store.plan!));
    draft.club.name = "Failed edit";

    await expect(store.savePlan(draft)).resolves.toBe(false);
    expect(store.plan?.club.name).toBe("Failed edit");
    expect(store.isDirty).toBe(true);
    vi.unstubAllGlobals();
  });

  it("finalizes a configured plan without changing its shared identity", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({}));
    const store = usePlanStore();
    store.createNewPlan("plan-id", "plan-key", { clubName: "Club", season: "2026/2027" });

    await expect(store.finalizePlan()).resolves.toBe(true);
    expect(store.plan?.id).toBe("plan-id");
    expect(store.key).toBe("plan-key");
    vi.unstubAllGlobals();
  });

  it("preserves same-field edits from SSE until the user keeps or reloads a version", async () => {
    let source: { onmessage?: (event: MessageEvent) => Promise<void>; close: () => void } | undefined;
    vi.stubGlobal("EventSource", class {
      constructor() {
        return source = { onmessage: undefined, close() {} };
      }
    });
    const store = usePlanStore();
    store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key", { clubName: "Original", season: "2026/2027" });
    store.plan!.club.name = "Local edit";
    store.watchPlan();

    const update = structuredClone(toRaw(store.plan!));
    update.rev = 2;
    update.club.name = "Remote edit";
    await source?.onmessage?.({ data: JSON.stringify({ blob: JSON.stringify(update), revision: 2 }) } as MessageEvent);

    expect(store.plan?.club.name).toBe("Local edit");
    expect(store.pendingUpdate?.club.name).toBe("Remote edit");
    expect(store.mergeConflicts).toContainEqual({ path: "club.name", base: "Original", local: "Local edit", remote: "Remote edit" });
    await expect(store.savePlan()).resolves.toBe(false);
    let expectedRevision: number | undefined;
    vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { body?: { expectedRevision: number } }) => {
      expectedRevision = options?.body?.expectedRevision;
      return { revision: 3 };
    }));
    await store.retryLocal();
    expect(expectedRevision).toBe(2);
    vi.unstubAllGlobals();
  });

  it("reloads the pending remote version when the user discards local edits", async () => {
    let source: { onmessage?: (event: MessageEvent) => Promise<void>; close: () => void } | undefined;
    vi.stubGlobal("EventSource", class {
      constructor() {
        return source = { onmessage: undefined, close() {} };
      }
    });
    const store = usePlanStore();
    store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key", { clubName: "Original", season: "2026/2027" });
    store.plan!.club.name = "Local edit";
    store.watchPlan();
    const update = structuredClone(toRaw(store.plan!));
    update.rev = 2;
    update.club.name = "Remote edit";
    await source?.onmessage?.({ data: JSON.stringify({ blob: JSON.stringify(update), revision: 2 }) } as MessageEvent);

    store.reloadRemote();

    expect(store.plan?.club.name).toBe("Remote edit");
    expect(store.isDirty).toBe(false);
    expect(store.pendingUpdate).toBeNull();
    store.stopWatching();
    vi.unstubAllGlobals();
  });

  it("saves per-field conflict choices while keeping independent local edits", async () => {
    let source: { onmessage?: (event: MessageEvent) => Promise<void>; close: () => void } | undefined;
    let expectedRevision: number | undefined;
    vi.stubGlobal("EventSource", class {
      constructor() {
        return source = { onmessage: undefined, close() {} };
      }
    });
    vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { method?: string; body?: { expectedRevision: number } }) => {
      expectedRevision = options?.body?.expectedRevision;
      return { revision: 3 };
    }));
    const store = usePlanStore();
    store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key", { clubName: "Original", season: "2026/2027" });
    store.plan!.club.name = "Local name";
    store.plan!.season = "2027/2028";
    store.watchPlan();
    const remote = structuredClone(toRaw(store.plan!));
    remote.rev = 3;
    remote.club.name = "Remote name";
    remote.season = "2028/2029";
    await source?.onmessage?.({ data: JSON.stringify({ blob: JSON.stringify(remote), revision: 2 }) } as MessageEvent);

    expect(store.mergeConflicts).toHaveLength(2);
    await expect(store.retryWithChoices({ "club.name": "remote", "season": "local" })).resolves.toBe(true);

    expect(store.plan?.club.name).toBe("Remote name");
    expect(store.plan?.season).toBe("2027/2028");
    expect(expectedRevision).toBe(2);
    expect(store.isDirty).toBe(false);
    store.stopWatching();
    vi.unstubAllGlobals();
  });

  it("preserves both entity versions for delete-versus-edit choices", async () => {
    let source: { onmessage?: (event: MessageEvent) => Promise<void>; close: () => void } | undefined;
    vi.stubGlobal("EventSource", class {
      constructor() {
        return source = { onmessage: undefined, close() {} };
      }
    });
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({ revision: 3 }));
    const store = usePlanStore();
    store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key", { clubName: "Club", season: "2026/2027" });
    const team = store.addTeam("Original team")!;
    await store.savePlan();
    const remote = structuredClone(toRaw(store.plan!));
    remote.rev = 3;
    remote.teams[team.id]!.name = "Remote edit";
    store.deleteTeam(team.id);
    store.watchPlan();

    await source?.onmessage?.({ data: JSON.stringify({ blob: JSON.stringify(remote), revision: 2 }) } as MessageEvent);

    expect(store.mergeConflicts).toContainEqual({
      path: `teams.${team.id}`,
      base: expect.objectContaining({ name: "Original team" }),
      local: undefined,
      remote: expect.objectContaining({ name: "Remote edit" }),
    });
    await expect(store.retryWithChoices({ [`teams.${team.id}`]: "remote" })).resolves.toBe(true);
    expect(store.plan?.teams[team.id]?.name).toBe("Remote edit");
    expect(store.isDirty).toBe(false);
    store.stopWatching();
    vi.unstubAllGlobals();
  });

  it("merges independent SSE edits and saves the merged plan at the remote revision", async () => {
    let source: { onmessage?: (event: MessageEvent) => Promise<void>; close: () => void } | undefined;
    let expectedRevision: number | undefined;
    vi.stubGlobal("EventSource", class {
      constructor() {
        return source = { onmessage: undefined, close() {} };
      }
    });
    vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { method?: string; body?: { expectedRevision: number } }) => {
      expectedRevision = options?.body?.expectedRevision;
      return { revision: 3 };
    }));
    const store = usePlanStore();
    store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key", { clubName: "Original", season: "2026/2027" });
    store.plan!.season = "2027/2028";
    store.watchPlan();
    const update = structuredClone(toRaw(store.plan!));
    update.rev = 2;
    update.club.name = "Remote edit";

    await source?.onmessage?.({ data: JSON.stringify({ blob: JSON.stringify(update), revision: 2 }) } as MessageEvent);

    expect(store.plan?.club.name).toBe("Remote edit");
    expect(store.plan?.season).toBe("2027/2028");
    expect(store.mergeConflicts).toEqual([]);
    expect(expectedRevision).toBe(2);
    expect(store.isDirty).toBe(false);
    store.stopWatching();
    vi.unstubAllGlobals();
  });

  it("preserves local work after a CAS failure and retries against the refreshed revision", async () => {
    const store = usePlanStore();
    store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key", { clubName: "Original", season: "2026/2027" });
    store.plan!.club.name = "Local edit";
    const remote = structuredClone(toRaw(store.plan!));
    remote.rev = 2;
    remote.club.name = "Remote edit";
    const expectedRevisions: number[] = [];
    vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { method?: string; body?: { blob: string; expectedRevision: number } }) => {
      if (options?.method === "POST") {
        expectedRevisions.push(options.body!.expectedRevision);
        if (expectedRevisions.length === 1)
          throw Object.assign(new Error("Stale revision"), { statusCode: 409 });
        return { revision: 3 };
      }
      return { blob: JSON.stringify(remote), revision: 2 };
    }));

    await expect(store.savePlan()).resolves.toBe(false);

    expect(store.plan?.club.name).toBe("Local edit");
    expect(store.isDirty).toBe(true);
    expect(store.mergeConflicts.map(conflict => conflict.path)).toEqual(["club.name"]);
    expect(store.error).toBe("ui.savePlanConflict");
    await expect(store.retryLocal()).resolves.toBe(true);
    expect(expectedRevisions).toEqual([0, 2]);
    expect(store.isDirty).toBe(false);
    vi.unstubAllGlobals();
  });

  it("uses the same migration boundary for legacy SSE updates", async () => {
    let source: { onmessage?: (event: MessageEvent) => Promise<void>; close: () => void } | undefined;
    vi.stubGlobal("EventSource", class {
      constructor() {
        return source = { onmessage: undefined, close() {} };
      }
    });
    const store = usePlanStore();
    store.createNewPlan(legacyPlan.id, "test-key");
    store.watchPlan();
    const remotePlan = structuredClone(legacyPlan);
    remotePlan.rev = 2;

    await source?.onmessage?.({ data: JSON.stringify({ blob: JSON.stringify(remotePlan), revision: 3 }) } as MessageEvent);

    expect(store.plan?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(store.matches["match-1"]?.slots.map(slot => slot.assignmentStatus)).toEqual(["OPEN", "ASSIGNED"]);
    let expectedRevision: number | undefined;
    vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { body?: { expectedRevision: number } }) => {
      expectedRevision = options?.body?.expectedRevision;
      return { revision: 4 };
    }));
    await store.savePlan();
    expect(expectedRevision).toBe(3);
    store.stopWatching();
    vi.unstubAllGlobals();
  });

  it("keeps the default gameday role scope when configuring new-plan role names", () => {
    const store = usePlanStore();
    store.createNewPlan("plan-id", "plan-key");

    store.configureRoles(["Timekeeper", "Scorekeeper", "Floor Manager"], ["gameday", "match", "match"]);

    expect(store.roles.map(role => role.scope)).toEqual(["gameday", "match", "match"]);
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

    it("does not load example data when adding a team without a plan", () => {
      const store = usePlanStore();
      expect(store.plan).toBeNull();

      expect(store.addTeam("New Team")).toBeNull();
      expect(store.plan).toBeNull();
    });

    it("does not load example data when adding a member without a plan", () => {
      const store = usePlanStore();
      expect(store.plan).toBeNull();

      expect(store.addMember({ name: "New Member" })).toBeNull();
      expect(store.plan).toBeNull();
    });
  });

  describe("team management", () => {
    it("should add, update, and delete a team", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan", "test-key");

      const newTeam = store.addTeam("Men 1")!;
      expect(store.teams[newTeam.id]).toBeDefined();
      expect(store.teams[newTeam.id]?.name).toBe("Men 1");

      const member = store.addMember({ name: "John Doe", teamIds: [newTeam.id] })!;
      expect(store.members[member.id]?.teamIds).toContain(newTeam.id);

      store.updateTeam(newTeam.id, "Men Senior");
      expect(store.teams[newTeam.id]?.name).toBe("Men Senior");

      store.deleteTeam(newTeam.id);
      expect(store.teams[newTeam.id]).toBeUndefined();
      expect(store.members[member.id]?.teamIds).not.toContain(newTeam.id);
    });
  });

  describe("member management", () => {
    it("should add, update, and delete a member", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan", "test-key");

      const member = store.addMember({ name: "Jane Doe", skillIds: ["referee"] })!;
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
            assignmentStatus: "OPEN",
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
            assignmentStatus: "ASSIGNED",
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
            assignmentStatus: "ASSIGNED",
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
            assignmentStatus: "OPEN",
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
    it("keeps selected members scoped to their plan", () => {
      const store = usePlanStore();
      store.createNewPlan("plan-a", "key-a");
      store.selectedMemberId = "member-a";

      store.createNewPlan("plan-b", "key-b");
      expect(store.selectedMemberId).toBeNull();

      store.selectedMemberId = "member-b";
      store.createNewPlan("plan-a", "key-a");
      expect(store.selectedMemberId).toBe("member-a");
    });

    it("claims an open eligible slot without replacing an assignment", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");
      const member = store.addMember({ name: "Capable Helper", skillIds: ["referee"] })!;
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
      const otherMember = store.addMember({ name: "Other Helper" })!;
      expect(() => store.claimSlot("m1", "slot-1", otherMember.id)).toThrow("already been claimed");
    });

    it("rejects an ineligible member", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");
      const member = store.addMember({ name: "Unlicensed Helper" })!;
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
      let savedRevision = 0;
      vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { method?: string; body?: { blob: string; expectedRevision: number } }) => {
        if (options?.method === "POST") {
          savedBlob = options.body!.blob;
          savedRevision = options.body!.expectedRevision + 1;
          return { revision: savedRevision };
        }
        return { blob: savedBlob, revision: savedRevision };
      }));

      const store = usePlanStore();
      store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key");
      const member = store.addMember({ name: "Capable Helper", skillIds: ["referee"] })!;
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
      await store.loadPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", "test-key");

      expect(store.plan).not.toBeNull();
      const loadedPlan = store.plan!;
      expect(loadedPlan.matches.m1?.slots[0]?.assignedMemberId).toBe(member.id);
      expect(loadedPlan.matches.m1?.slots[0]?.assignmentStatus).toBe("ASSIGNED");
      vi.unstubAllGlobals();
    });
  });
});
