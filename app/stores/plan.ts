import type { SeasonPlan } from "../utils/plan-types";

export const usePlanStore = defineStore("plan", () => {
  const plan = ref<SeasonPlan | null>(null);
  const currentStep = ref(1);
  const onboardingPath = ref<"manual" | "auto" | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function loadPlan(id: string) {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await $fetch<SeasonPlan>(`/api/${id}`);
      plan.value = data;
    }
    catch (err: any) {
      error.value = err.message || "Failed to load plan";
    }
    finally {
      isLoading.value = false;
    }
  }

  async function savePlan() {
    if (!plan.value)
      return;
    isLoading.value = true;
    error.value = null;
    try {
      await $fetch(`/api/${plan.value.id}`, {
        method: "POST",
        body: plan.value,
      });
    }
    catch (err: any) {
      error.value = err.message || "Failed to save plan";
    }
    finally {
      isLoading.value = false;
    }
  }

  function createNewPlan(id: string) {
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
