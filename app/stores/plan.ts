import type { AutoAssignOptions } from "../utils/helper-assignment";
import type {
  Member,
  NewPlanMetadata,
  Role,
  SeasonPlan,
  Team,
} from "../utils/plan-types";
import { useLocalStorage } from "@vueuse/core";
import { defineStore, skipHydrate } from "pinia";
import { computed, ref, toRaw } from "vue";
import examplePlan from "../../test/fixtures/plan-2025-2026.json";
import { useDecryption, useEncryption } from "../composables/use-crypto";
import { autoAssignMatchDuties, completeClosedAssignments, isMemberEligibleForSlot } from "../utils/helper-assignment";
import { CURRENT_SCHEMA_VERSION, parseSeasonPlan } from "../utils/plan-types";

export const PLAN_RESUME_KEY = "gameday-plan-resume";
const MEMBER_KEY = "gameday-selected-member";
const _FRAGMENT_PREFIX = "key=";

export const usePlanStore = defineStore("plan", () => {
  const plan = ref<SeasonPlan | null>(null);
  const storageRevision = ref(0);
  const key = ref<string | null>(null);
  const readOnly = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const pendingUpdate = ref<SeasonPlan | null>(null);
  const pendingStorageRevision = ref<number | null>(null);
  const isEditing = ref(false);
  const eventSource = ref<EventSource | null>(null);
  let completionTimer: ReturnType<typeof setInterval> | undefined;

  const resumeState = skipHydrate(useLocalStorage<{ id: string; key: string } | null>(PLAN_RESUME_KEY, null, {
    serializer: {
      read: (value) => {
        try {
          return JSON.parse(value) as { id: string; key: string };
        }
        catch {
          return null;
        }
      },
      write: value => JSON.stringify(value),
    },
  }));
  const selectedMembers = useLocalStorage<Record<string, string>>(MEMBER_KEY, {});
  const selectedMemberId = computed<string | null>({
    get: () => plan.value ? selectedMembers.value[plan.value.id] ?? null : null,
    set: (memberId) => {
      if (!plan.value)
        return;
      const next = { ...selectedMembers.value };
      if (memberId)
        next[plan.value.id] = memberId;
      else
        delete next[plan.value.id];
      selectedMembers.value = next;
    },
  });

  const { encryptData, generateKey } = useEncryption();
  const { decryptBlob } = useDecryption();

  // Computed Getters & Domain Views
  const isModifiable = computed(() => !readOnly.value && !!plan.value);
  const teams = computed(() => plan.value?.teams ?? {});
  const members = computed(() => plan.value?.members ?? {});
  const matches = computed(() => plan.value?.matches ?? {});
  const gamedays = computed(() => plan.value?.gamedays ?? {});
  const roles = computed(() => plan.value?.config?.roles ?? []);
  const locations = computed(() => plan.value?.config?.locations ?? []);
  const teamsList = computed(() => Object.values(teams.value));
  const membersList = computed(() => Object.values(members.value));
  const gamedaysList = computed(() =>
    Object.values(gamedays.value).sort((a, b) => a.date.localeCompare(b.date)),
  );

  /**
   * Load the example plan fixture into state
   */
  function loadExamplePlan(): SeasonPlan {
    const migrated = parseSeasonPlan(examplePlan);
    plan.value = migrated;
    storageRevision.value = 0;
    return migrated;
  }

  async function loadPlan(id: string, decryptionKey: string) {
    isLoading.value = true;
    error.value = null;
    key.value = decryptionKey;

    try {
      const response = await $fetch<{ blob: string; revision?: number }>(`/api/${id}`);

      if (!response.blob) {
        throw new Error("No plan data found");
      }

      const decryptedData = await decryptBlob(response.blob, decryptionKey);
      const loadedPlan = parseSeasonPlan(JSON.parse(decryptedData));
      completeClosedAssignments(loadedPlan);

      plan.value = loadedPlan;
      storageRevision.value = response.revision ?? 0;
      pendingStorageRevision.value = null;
      resumeState.value = { id, key: decryptionKey };
    }
    catch (err: unknown) {
      if (err instanceof Error)
        error.value = err.message || "ui.loadPlanFailed";
      console.error("Error loading plan:", err);
    }
    finally {
      isLoading.value = false;
    }
  }

  /**
   * Subscribe to real-time updates for the current plan via SSE.
   */
  function watchPlan() {
    if (import.meta.server || typeof EventSource === "undefined" || !plan.value?.id || !key.value)
      return;

    if (eventSource.value) {
      eventSource.value.close();
    }

    const id = plan.value.id;
    const decryptionKey = key.value;

    eventSource.value = new EventSource(`/api/${id}`);
    completionTimer = setInterval(() => {
      if (plan.value)
        completeClosedAssignments(plan.value);
    }, 60_000);

    eventSource.value.onmessage = async (event) => {
      try {
        let update = { blob: event.data, revision: storageRevision.value };
        try {
          const parsed = JSON.parse(event.data) as { blob?: unknown; revision?: unknown };
          if (typeof parsed.blob === "string") {
            update = {
              blob: parsed.blob,
              revision: typeof parsed.revision === "number" ? parsed.revision : storageRevision.value,
            };
          }
        }
        catch {
          // Older servers streamed the encrypted blob without revision metadata.
        }

        const encryptedBlob = update.blob;
        if (!encryptedBlob)
          return;

        const decryptedData = await decryptBlob(encryptedBlob, decryptionKey);
        const updatedPlan = parseSeasonPlan(JSON.parse(decryptedData));

        if (!plan.value || updatedPlan.rev > plan.value.rev) {
          console.warn("Real-time update received: Rev", updatedPlan.rev);
          completeClosedAssignments(updatedPlan);
          if (isEditing.value) {
            pendingUpdate.value = updatedPlan;
            pendingStorageRevision.value = update.revision;
          }
          else {
            plan.value = updatedPlan;
            storageRevision.value = Math.max(storageRevision.value, update.revision);
          }
        }
      }
      catch (err) {
        console.error("Failed to process real-time update:", err);
      }
    };

    eventSource.value.onerror = (err) => {
      console.error("SSE connection error:", err);
    };
  }

  function setEditing(value: boolean) {
    isEditing.value = value;
    if (!value) {
      pendingUpdate.value = null;
      pendingStorageRevision.value = null;
    }
  }

  function applyPendingUpdate() {
    if (pendingUpdate.value) {
      plan.value = pendingUpdate.value;
      storageRevision.value = pendingStorageRevision.value ?? storageRevision.value;
    }
    pendingUpdate.value = null;
    pendingStorageRevision.value = null;
    isEditing.value = false;
  }

  function stopWatching() {
    if (eventSource.value) {
      eventSource.value.close();
      eventSource.value = null;
    }
    if (completionTimer) {
      clearInterval(completionTimer);
      completionTimer = undefined;
    }
  }

  async function savePlan(draft?: SeasonPlan): Promise<boolean> {
    if ((!plan.value && !draft) || !key.value) {
      error.value = "ui.missingPlanKey";
      return false;
    }

    isLoading.value = true;
    error.value = null;

    const livePlan = plan.value;
    const planToSave = structuredClone(toRaw(draft ?? plan.value!));
    try {
      completeClosedAssignments(planToSave);
      planToSave.rev++;
      planToSave.lastUpdated = new Date();

      const serializedPlan = JSON.stringify(planToSave);
      const encryptedBlob = await encryptData(serializedPlan, key.value);

      const expectedRevision = storageRevision.value;
      const response = await $fetch<{ revision?: number }>(`/api/${planToSave.id}`, {
        method: "POST",
        body: {
          blob: encryptedBlob,
          expectedRevision,
        },
      });

      storageRevision.value = Math.max(storageRevision.value, response.revision ?? expectedRevision + 1);
      if (plan.value === livePlan)
        plan.value = planToSave;
      pendingUpdate.value = null;
      pendingStorageRevision.value = null;
      resumeState.value = { id: planToSave.id, key: key.value };
      return true;
    }
    catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message || "ui.savePlanFailed";
      }
      console.error("Error saving plan:", err);
      return false;
    }
    finally {
      isLoading.value = false;
    }
  }

  function createNewPlan(id: string, newKey: string, metadata?: NewPlanMetadata) {
    key.value = newKey;
    storageRevision.value = 0;
    pendingStorageRevision.value = null;
    const now = new Date();
    plan.value = {
      id,
      club: {
        id: "1",
        name: metadata?.clubName ?? "",
        contactEmail: "",
        homepage: "",
        lastUpdated: now,
      },
      lastUpdated: now,
      skills: {},
      schemaVersion: CURRENT_SCHEMA_VERSION,
      rev: 1,
      season: metadata?.season ?? `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      members: {},
      teams: {},
      matches: {},
      gamedays: {},
      config: {
        locations: [],
        roles: [
          {
            id: "timekeeper",
            name: "Timekeeper",
            requiredSkillId: "",
            scope: "gameday",
          },
          {
            id: "scorekeeper",
            name: "Scorekeeper",
            requiredSkillId: "",
            scope: "match",
          },
          {
            id: "floor_manager",
            name: "Floor Manager",
            requiredSkillId: "",
            scope: "match",
          },
          {
            id: "media_liaison",
            name: "Media Liaison",
            requiredSkillId: "",
            scope: "match",
          },
        ],
      },
    };
  }

  function configureRoles(names: string[], scopes: Role["scope"][]) {
    if (!plan.value)
      return;
    plan.value.config.roles = names.map((name, index) => ({
      id: `role-${index + 1}`,
      name,
      requiredSkillId: "",
      scope: scopes[index] ?? "match",
    }));
    plan.value.lastUpdated = new Date();
  }

  async function finalizePlan(): Promise<boolean> {
    if (!plan.value)
      return false;

    if (!plan.value.id)
      plan.value.id = crypto.randomUUID();
    if (!key.value)
      key.value = await generateKey();
    return savePlan();
  }

  // --- Domain Methods: Teams ---

  function addTeam(name: string): Team | null {
    if (!plan.value)
      return null;
    const newId = `team-${crypto.randomUUID().substring(0, 8)}`;
    const now = new Date();
    const newTeam: Team = {
      id: newId,
      name,
      isManual: true,
      updatedAt: now,
    };
    plan.value.teams[newId] = newTeam;
    plan.value.lastUpdated = now;
    return newTeam;
  }

  function updateTeam(teamId: string, name: string) {
    if (!plan.value || !plan.value.teams[teamId])
      return;
    const now = new Date();
    plan.value.teams[teamId].name = name;
    plan.value.teams[teamId].updatedAt = now;
    plan.value.lastUpdated = now;
  }

  function deleteTeam(teamId: string) {
    if (!plan.value)
      return;
    delete plan.value.teams[teamId];
    // Remove team from all members
    Object.values(plan.value.members).forEach((m) => {
      m.teamIds = m.teamIds.filter(tId => tId !== teamId);
    });
    plan.value.lastUpdated = new Date();
  }

  // --- Domain Methods: Members ---

  function addMember(data: Partial<Omit<Member, "id" | "updatedAt">> & { name: string }): Member | null {
    if (!plan.value)
      return null;
    const newId = `member-${crypto.randomUUID().substring(0, 8)}`;
    const now = new Date();
    const newMember: Member = {
      id: newId,
      name: data.name,
      teamIds: data.teamIds ? [...data.teamIds] : [],
      skillIds: data.skillIds ? [...data.skillIds] : [],
      isManual: data.isManual ?? true,
      updatedAt: now,
    };
    plan.value.members[newId] = newMember;
    plan.value.lastUpdated = now;
    return newMember;
  }

  function updateMember(memberId: string, updates: Partial<Omit<Member, "id">>) {
    if (!plan.value || !plan.value.members[memberId])
      return;
    const member = plan.value.members[memberId];
    if (updates.name !== undefined)
      member.name = updates.name;
    if (updates.teamIds !== undefined)
      member.teamIds = [...updates.teamIds];
    if (updates.skillIds !== undefined)
      member.skillIds = [...updates.skillIds];
    if (updates.isManual !== undefined)
      member.isManual = updates.isManual;
    const now = new Date();
    member.updatedAt = now;
    plan.value.lastUpdated = now;
  }

  function deleteMember(memberId: string) {
    if (!plan.value)
      return;
    delete plan.value.members[memberId];
    plan.value.lastUpdated = new Date();
  }

  // --- Domain Methods: Matches & Helpers ---

  function assignHelperTeam(matchId: string, teamId: string) {
    if (!plan.value || !plan.value.matches[matchId])
      return;

    plan.value.matches[matchId].helperTeamId = teamId;
    const now = new Date();
    plan.value.matches[matchId].updatedAt = now;
    plan.value.lastUpdated = now;
  }

  function assignMemberToSlot(
    matchId: string,
    slotId: string,
    memberId: string | null,
    customHelperName?: string | null,
  ) {
    if (!plan.value || !plan.value.matches[matchId])
      return;

    const match = plan.value.matches[matchId];
    const slot = match.slots?.find(s => s.id === slotId);
    if (!slot)
      return;

    if (memberId && !isMemberEligibleForSlot(plan.value, slot, memberId))
      return;

    slot.assignedMemberId = memberId;
    slot.customHelperName = customHelperName ?? null;
    slot.assignmentStatus = memberId || customHelperName ? "ASSIGNED" : "OPEN";
    const now = new Date();
    slot.updatedAt = now;
    match.updatedAt = now;
    plan.value.lastUpdated = now;
  }

  function claimSlot(matchId: string, slotId: string, memberId = selectedMemberId.value) {
    if (!plan.value)
      throw new Error("Plan is unavailable");
    const match = plan.value.matches[matchId];
    const member = memberId ? plan.value.members[memberId] : undefined;
    const slot = match?.slots.find(candidate => candidate.id === slotId);
    if (!match || !slot)
      throw new Error("Match or duty slot not found");
    if (!member)
      throw new Error("Select a member before claiming a duty");
    if (slot.assignmentStatus !== "OPEN" || slot.assignedMemberId || slot.customHelperName)
      throw new Error("This duty has already been claimed");
    if (!isMemberEligibleForSlot(plan.value, slot, member.id))
      throw new Error("This member does not have the required capability");

    const now = new Date();
    slot.assignedMemberId = member.id;
    slot.assignmentStatus = "ASSIGNED";
    slot.customHelperName = null;
    slot.updatedAt = now;
    match.updatedAt = now;
    plan.value.lastUpdated = now;
    selectedMemberId.value = member.id;
  }

  function clearMatchSlots(matchId: string) {
    if (!plan.value || !plan.value.matches[matchId])
      return;

    const match = plan.value.matches[matchId];
    match.slots?.forEach((slot) => {
      slot.assignedMemberId = null;
      slot.customHelperName = null;
      slot.assignmentStatus = "OPEN";
      slot.checkedIn = false;
      slot.updatedAt = new Date();
    });
    const now = new Date();
    match.updatedAt = now;
    plan.value.lastUpdated = now;
  }

  function autoAssignMatchSlots(matchId: string, options?: AutoAssignOptions) {
    if (!plan.value || !plan.value.matches[matchId])
      return;

    return autoAssignMatchDuties(plan.value, matchId, options);
  }

  function toggleCheckIn(matchId: string, slotId: string, forceValue?: boolean) {
    if (!plan.value || !plan.value.matches[matchId])
      return;

    const match = plan.value.matches[matchId];
    const slot = match.slots?.find(s => s.id === slotId);
    if (!slot)
      return;

    slot.checkedIn = forceValue !== undefined ? forceValue : !slot.checkedIn;
    const now = new Date();
    slot.updatedAt = now;
    match.updatedAt = now;
    plan.value.lastUpdated = now;
  }

  /**
   * Extract key from URL fragment
   */
  function initFromUrl() {
    // Ensure this only runs in the browser
    if (!import.meta.client || !globalThis.location.hash)
      return;

    // Parse parameters from URL fragment (e.g., key=abc&plan=123)
    const hashParams = new URLSearchParams(globalThis.location.hash.substring(1));
    const keyFromUrl = hashParams.get("key");

    if (keyFromUrl) {
      key.value = keyFromUrl;
    }
  }

  return {
    plan,
    key,
    resumeState,
    selectedMemberId,
    isLoading,
    error,
    pendingUpdate,
    isModifiable,
    teams,
    members,
    matches,
    gamedays,
    roles,
    locations,
    teamsList,
    membersList,
    gamedaysList,
    loadExamplePlan,
    loadPlan,
    watchPlan,
    stopWatching,
    setEditing,
    applyPendingUpdate,
    savePlan,
    createNewPlan,
    addTeam,
    updateTeam,
    deleteTeam,
    addMember,
    configureRoles,
    updateMember,
    deleteMember,
    assignHelperTeam,
    assignMemberToSlot,
    claimSlot,
    clearMatchSlots,
    autoAssignMatchSlots,
    toggleCheckIn,
    finalizePlan,
    initFromUrl,
  };
});
