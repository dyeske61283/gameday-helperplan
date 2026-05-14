import type * as planTypes from "../utils/plan-types";
import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useDecryption, useEncryption } from "../composables/use-crypto";

const STORAGE_KEY = "gameday-plan-id";
const FRAGMENT_PREFIX = "key=";

export const usePlanStore = defineStore("plan", () => {
  const plan = ref<planTypes.SeasonPlan | null>(null);
  const key = ref<string | null>(null);
  const currentStep = ref(1);
  const onboardingPath = ref<"manual" | "auto" | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const eventSource = ref<EventSource | null>(null);

  // Local storage for the last active plan ID
  const lastPlanId = useLocalStorage(STORAGE_KEY, "");

  const { encryptData, generateKey } = useEncryption();
  const { decryptBlob } = useDecryption();

  /**
   * Sync key with URL fragment
   */
  watch(key, (newKey) => {
    if (import.meta.server)
      return;

    if (newKey) {
      globalThis.location.hash = `${FRAGMENT_PREFIX}${newKey}`;
    }
    else {
      globalThis.location.hash = "";
    }
  });

  /**
   * Migrate the plan schema if needed.
   * This is a stub for future schema migrations.
   */
  function migrateIfNeeded(
    loadedPlan: planTypes.SeasonPlan,
  ): planTypes.SeasonPlan {
    const CURRENT_SCHEMA_VERSION = 1;

    if (loadedPlan.schemaVersion < CURRENT_SCHEMA_VERSION) {
      console.warn(
        `Migrating plan from version ${loadedPlan.schemaVersion} to ${CURRENT_SCHEMA_VERSION}`,
      );

      // Ensure all matches have a slots array
      if (loadedPlan.matches) {
        Object.values(loadedPlan.matches).forEach((match: planTypes.Match) => {
          if (!match.slots) {
            match.slots = [];
          }
        });
      }

      // Ensure all gamedays have a slots array
      if (loadedPlan.gamedays) {
        Object.values(loadedPlan.gamedays).forEach(
          (gameday: planTypes.Gameday) => {
            if (!gameday.slots) {
              gameday.slots = [];
            }
          },
        );
      }

      loadedPlan.schemaVersion = CURRENT_SCHEMA_VERSION;
    }

    return loadedPlan;
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
      let loadedPlan = JSON.parse(decryptedData) as planTypes.SeasonPlan;

      // Run migration logic
      loadedPlan = migrateIfNeeded(loadedPlan);

      plan.value = loadedPlan;
      lastPlanId.value = id;
      currentStep.value = 5;
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
        let updatedPlan = JSON.parse(decryptedData) as planTypes.SeasonPlan;

        // Only update if the incoming revision is newer than our local one
        // This prevents overwriting unsaved local changes or re-applying our own save
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
      // EventSource automatically retries by default
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
      // Increment revision and update timestamp
      plan.value.rev++;
      plan.value.lastUpdated = Date.now();

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
    plan.value = {
      id,
      club: {
        id: "1",
        name: "",
        contactEmail: "",
        homepage: "",
        lastUpdated: 0,
      },
      lastUpdated: Date.now(),
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
    currentStep.value = 1;
    onboardingPath.value = null;
  }

  function nextStep() {
    currentStep.value++;
  }

  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--;
    }
  }

  function setPath(path: "manual" | "auto") {
    onboardingPath.value = path;
    nextStep();
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
    currentStep.value = 5;
  }

  type NuLigaClub = {
    clubId: string;
    clubName: string;
    contactEmail?: string;
    homepage?: string;
  };

  type NuLigaTeam = {
    teamId: string;
    teamName: string;
    leagueName: string;
  };

  type NuLigaMatch = {
    meetingId: string;
    scheduledTime: string;
    teamHomeName: string;
    teamGuestName: string;
  };

  function importClub(nuLigaClub: NuLigaClub) {
    if (!plan.value) {
      plan.value = {
        id: "draft",
        club: {
          id: nuLigaClub.clubId,
          name: nuLigaClub.clubName,
          contactEmail: nuLigaClub.contactEmail || "",
          homepage: nuLigaClub.homepage || "",
          lastUpdated: Date.now(),
        },
        lastUpdated: Date.now(),
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
            { id: "timekeeper", name: "Timekeeper", requiredSkillId: "", scope: "gameday" },
            { id: "scorekeeper", name: "Scorekeeper", requiredSkillId: "", scope: "match" },
            { id: "floor_manager", name: "Floor Manager", requiredSkillId: "", scope: "match" },
            { id: "media_liaison", name: "Media Liaison", requiredSkillId: "", scope: "match" },
          ],
        },
      };
    }
    else {
      plan.value.club = {
        id: nuLigaClub.clubId,
        name: nuLigaClub.clubName,
        contactEmail: nuLigaClub.contactEmail || "",
        homepage: nuLigaClub.homepage || "",
        lastUpdated: Date.now(),
      };
    }
  }

  function importTeams(nuLigaTeams: NuLigaTeam[]) {
    if (!plan.value)
      return;

    nuLigaTeams.forEach((team) => {
      plan.value!.teams[team.teamId] = {
        id: team.teamId,
        name: `${team.teamName} (${team.leagueName})`,
        isManual: false,
        updatedAt: Date.now(),
      };
    });
  }

  function importMatches(nuLigaMatches: NuLigaMatch[]) {
    if (!plan.value)
      return;

    nuLigaMatches.forEach((match) => {
      plan.value!.matches[match.meetingId] = {
        id: match.meetingId,
        time: match.scheduledTime,
        homeTeam: match.teamHomeName,
        awayTeam: match.teamGuestName,
        slots: [],
        updatedAt: Date.now(),
      };
    });
  }

  function assignHelperTeam(matchId: string, teamId: string) {
    if (!plan.value || !plan.value.matches[matchId])
      return;

    plan.value.matches[matchId].helperTeamId = teamId;
    plan.value.matches[matchId].updatedAt = Date.now();
  }

  /**
   * Extract key from URL fragment
   */
  function initFromUrl() {
    if (import.meta.server)
      return;

    const hash = globalThis.location.hash.substring(1);
    if (hash.startsWith(FRAGMENT_PREFIX)) {
      key.value = hash.substring(FRAGMENT_PREFIX.length);
    }
  }

  return {
    plan,
    key,
    lastPlanId,
    currentStep,
    onboardingPath,
    isLoading,
    error,
    loadPlan,
    migrateIfNeeded,
    watchPlan,
    stopWatching,
    savePlan,
    createNewPlan,
    importClub,
    importTeams,
    importMatches,
    assignHelperTeam,
    nextStep,
    prevStep,
    setPath,
    finalizePlan,
    initFromUrl,
  };
});
