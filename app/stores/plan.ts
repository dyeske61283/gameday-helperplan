import type {
  Gameday,
  Match,
  Member,
  SeasonPlan,
  Team,
} from "../utils/plan-types";
import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import examplePlan from "../../test/fixtures/plan-2025-2026.json";
import { useDecryption, useEncryption } from "../composables/use-crypto";

const STORAGE_KEY = "gameday-plan-id";
const _FRAGMENT_PREFIX = "key=";

/**
 * Migrate the plan schema if needed.
 */
export function migrateIfNeeded(loadedPlan: SeasonPlan): SeasonPlan {
  const CURRENT_SCHEMA_VERSION = 1;

  if (loadedPlan.schemaVersion < CURRENT_SCHEMA_VERSION) {
    console.warn(
      `Migrating plan from version ${loadedPlan.schemaVersion} to ${CURRENT_SCHEMA_VERSION}`,
    );

    // Ensure all matches have a slots array
    if (loadedPlan.matches) {
      Object.values(loadedPlan.matches).forEach((match: Match) => {
        if (!match.slots) {
          match.slots = [];
        }
      });
    }

    // Ensure all gamedays have a slots array
    if (loadedPlan.gamedays) {
      Object.values(loadedPlan.gamedays).forEach((gameday: Gameday) => {
        if (!gameday.slots) {
          gameday.slots = [];
        }
      });
    }

    loadedPlan.schemaVersion = CURRENT_SCHEMA_VERSION;
  }

  return loadedPlan;
}

export const usePlanStore = defineStore("plan", () => {
  const plan = ref<SeasonPlan | null>(null);
  const key = ref<string | null>(null);
  const readOnly = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const eventSource = ref<EventSource | null>(null);

  // Local storage for the last active plan ID
  const lastPlanId = useLocalStorage(STORAGE_KEY, "");

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
    const cloned = JSON.parse(JSON.stringify(examplePlan)) as SeasonPlan;
    const migrated = migrateIfNeeded(cloned);
    plan.value = migrated;
    return migrated;
  }

  /**
   * Ensure plan is loaded, falling back to example plan if null
   */
  function ensurePlanLoaded(): SeasonPlan {
    if (!plan.value) {
      return loadExamplePlan();
    }
    return plan.value;
  }

  async function loadPlan(id: string, decryptionKey: string) {
    isLoading.value = true;
    error.value = null;
    key.value = decryptionKey;

    try {
      const response = await $fetch<{ blob: string }>(`/api/${id}`);

      if (!response.blob) {
        throw new Error("No plan data found");
      }

      const decryptedData = await decryptBlob(response.blob, decryptionKey);
      let loadedPlan = JSON.parse(decryptedData) as SeasonPlan;

      // Run migration logic
      loadedPlan = migrateIfNeeded(loadedPlan);

      plan.value = loadedPlan;
      lastPlanId.value = id;
    }
    catch (err: unknown) {
      if (err instanceof Error)
        error.value = err.message || "Failed to load plan";
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
    if (import.meta.server || !plan.value?.id || !key.value)
      return;

    if (eventSource.value) {
      eventSource.value.close();
    }

    const id = plan.value.id;
    const decryptionKey = key.value;

    eventSource.value = new EventSource(`/api/${id}`);

    eventSource.value.onmessage = async (event) => {
      try {
        const encryptedBlob = event.data;
        if (!encryptedBlob)
          return;

        const decryptedData = await decryptBlob(encryptedBlob, decryptionKey);
        let updatedPlan = JSON.parse(decryptedData) as SeasonPlan;

        if (!plan.value || updatedPlan.rev > plan.value.rev) {
          console.warn("Real-time update received: Rev", updatedPlan.rev);
          updatedPlan = migrateIfNeeded(updatedPlan);
          plan.value = updatedPlan;
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

  function stopWatching() {
    if (eventSource.value) {
      eventSource.value.close();
      eventSource.value = null;
    }
  }

  async function savePlan() {
    if (!plan.value || !key.value) {
      error.value = "Missing plan or encryption key";
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      plan.value.rev++;
      plan.value.lastUpdated = new Date();

      const serializedPlan = JSON.stringify(plan.value);
      const encryptedBlob = await encryptData(serializedPlan, key.value);

      await $fetch(`/api/${plan.value.id}`, {
        method: "POST",
        body: {
          blob: encryptedBlob,
        },
      });

      lastPlanId.value = plan.value.id;
    }
    catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message || "Failed to save plan";
      }
      console.error("Error saving plan:", err);
    }
    finally {
      isLoading.value = false;
    }
  }

  function createNewPlan(id: string, newKey: string) {
    key.value = newKey;
    const now = new Date();
    plan.value = {
      id,
      club: {
        id: "1",
        name: "",
        contactEmail: "",
        homepage: "",
        lastUpdated: now,
      },
      lastUpdated: now,
      skills: {},
      schemaVersion: 1,
      rev: 0,
      season: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
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
    lastPlanId.value = id;
  }

  async function finalizePlan() {
    if (!plan.value)
      return;

    const id = crypto.randomUUID();
    const newKey = await generateKey();

    plan.value.id = id;
    key.value = newKey;
    lastPlanId.value = id;

    await savePlan();
  }

  // --- Domain Methods: Teams ---

  function addTeam(name: string): Team {
    const currentPlan = ensurePlanLoaded();
    const newId = `team-${crypto.randomUUID().substring(0, 8)}`;
    const now = new Date();
    const newTeam: Team = {
      id: newId,
      name,
      isManual: true,
      updatedAt: now,
    };
    currentPlan.teams[newId] = newTeam;
    currentPlan.lastUpdated = now;
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

  function addMember(data: Partial<Omit<Member, "id" | "updatedAt">> & { name: string }): Member {
    const currentPlan = ensurePlanLoaded();
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
    currentPlan.members[newId] = newMember;
    currentPlan.lastUpdated = now;
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

    slot.assignedMemberId = memberId;
    slot.customHelperName = customHelperName ?? null;
    const now = new Date();
    slot.updatedAt = now;
    match.updatedAt = now;
    plan.value.lastUpdated = now;
  }

  function clearMatchSlots(matchId: string) {
    if (!plan.value || !plan.value.matches[matchId])
      return;

    const match = plan.value.matches[matchId];
    match.slots?.forEach((slot) => {
      slot.assignedMemberId = null;
      slot.customHelperName = null;
      slot.checkedIn = false;
      slot.updatedAt = new Date();
    });
    const now = new Date();
    match.updatedAt = now;
    plan.value.lastUpdated = now;
  }

  function autoAssignMatchSlots(matchId: string) {
    if (!plan.value || !plan.value.matches[matchId])
      return;

    const match = plan.value.matches[matchId];
    const teamId = match.helperTeamId;
    const teamMembers = teamId
      ? membersList.value.filter(m => m.teamIds.includes(teamId))
      : membersList.value;

    const assignedInMatch = new Set(
      match.slots?.map(s => s.assignedMemberId).filter((id): id is string => !!id),
    );

    match.slots?.forEach((slot) => {
      if (slot.assignedMemberId || slot.customHelperName)
        return; // already assigned

      const role = roles.value.find(r => r.id === slot.roleId);
      const reqSkill = role?.requiredSkillId;

      // First try to find a team member with required skill not yet assigned
      let candidate = teamMembers.find(
        m => !assignedInMatch.has(m.id) && (!reqSkill || m.skillIds.includes(reqSkill)),
      );

      // If no qualified team member found and skill required, look in club-wide members
      if (!candidate && reqSkill) {
        candidate = membersList.value.find(
          m => !assignedInMatch.has(m.id) && m.skillIds.includes(reqSkill),
        );
      }

      // Fallback to any available team member if no specific skill required
      if (!candidate && !reqSkill) {
        candidate = teamMembers.find(m => !assignedInMatch.has(m.id));
      }

      if (candidate) {
        slot.assignedMemberId = candidate.id;
        slot.customHelperName = null;
        slot.updatedAt = new Date();
        assignedInMatch.add(candidate.id);
      }
    });

    const now = new Date();
    match.updatedAt = now;
    plan.value.lastUpdated = now;
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

      // Remove the fragment from the URL without triggering a page refresh
      const cleanUrl = globalThis.location.pathname + globalThis.location.search;
      globalThis.history.replaceState(null, "", cleanUrl);
    }
  }

  return {
    plan,
    key,
    lastPlanId,
    isLoading,
    error,
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
    ensurePlanLoaded,
    loadPlan,
    watchPlan,
    stopWatching,
    savePlan,
    createNewPlan,
    addTeam,
    updateTeam,
    deleteTeam,
    addMember,
    updateMember,
    deleteMember,
    assignHelperTeam,
    assignMemberToSlot,
    clearMatchSlots,
    autoAssignMatchSlots,
    toggleCheckIn,
    finalizePlan,
    initFromUrl,
  };
});
