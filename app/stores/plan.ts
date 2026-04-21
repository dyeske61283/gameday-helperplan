import type { SeasonPlan } from "../utils/plan-types";
import { ref } from "vue";
import { useDecryption, useEncryption } from "../composables/use-crypto";

export const usePlanStore = defineStore("plan", () => {
  const plan = ref<SeasonPlan | null>(null);
  const key = ref<string | null>(null);
  const currentStep = ref(1);
  const onboardingPath = ref<"manual" | "auto" | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const { encryptData } = useEncryption();
  const { decryptBlob } = useDecryption();

  /**
   * Migrate the plan schema if needed.
   * This is a stub for future schema migrations.
   */
  function migrateIfNeeded(loadedPlan: SeasonPlan): SeasonPlan {
    const CURRENT_SCHEMA_VERSION = 1;

    if (loadedPlan.schemaVersion < CURRENT_SCHEMA_VERSION) {
      console.log(`Migrating plan from version ${loadedPlan.schemaVersion} to ${CURRENT_SCHEMA_VERSION}`);
      // TODO: Implement migration logic here
      // For now, just update the version
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
      let loadedPlan = JSON.parse(decryptedData) as SeasonPlan;

      // Run migration logic
      loadedPlan = migrateIfNeeded(loadedPlan);

      plan.value = loadedPlan;
    }
    catch (err: any) {
      error.value = err.message || "Failed to load plan";
      console.error("Error loading plan:", err);
    }
    finally {
      isLoading.value = false;
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
    }
    catch (err: any) {
      error.value = err.message || "Failed to save plan";
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
          { id: "timekeeper", name: "Timekeeper", requiredSkillId: "", scope: "gameday" },
          { id: "scorekeeper", name: "Scorekeeper", requiredSkillId: "", scope: "match" },
          { id: "floor_manager", name: "Floor Manager", requiredSkillId: "", scope: "match" },
          { id: "media_liaison", name: "Media Liaison", requiredSkillId: "", scope: "match" },
        ],
      },
    };
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

  return {
    plan,
    key,
    currentStep,
    onboardingPath,
    isLoading,
    error,
    loadPlan,
    savePlan,
    createNewPlan,
    nextStep,
    prevStep,
    setPath,
  };
});
