import { defineStore, skipHydrate } from "pinia";
import { useLocalStorage } from "@vueuse/core";

export const usePlanStore = defineStore("Plan", () => {
  const planId = useLocalStorage<string>("planId", "", {
    writeDefaults: false,
    initOnMounted: true,
  });

  async function fetchPlan(id: MaybeRefOrGetter<string>) {
    try {
      const data = await $fetch(`/api/plan/${id}`, {
        method: "GET",
        onResponse: ({ response }) => {
          if (response.status === 200) {
            planId.value = toValue(id);
          }
        },
      });

      return data;
    } catch (error) {
      console.error("Error fetching plan:", error);
      return null;
    }
  }

  async function deletePlan(id: MaybeRefOrGetter<string>) {
    try {
      const data = await $fetch(`/api/plan/${id}`, {
        method: "DELETE",
        onResponse: ({ response }) => {
          if (response.status === 204) {
            planId.value = null;
          }
        },
      });

      planId.value = null;
      return data;
    } catch (error) {
      console.error("Error deleting plan:", error);
      return null;
    }
  }

  async function updatePlan(
    id: MaybeRefOrGetter<string>,
    data: MaybeRefOrGetter<string>
  ) {
    try {
      const responseData = await $fetch(`/api/plan/${id}`, {
        method: "PUT",
        body: data,
        onResponse: ({ response }) => {
          if (response.status === 200) {
            planId.value = toValue(id);
          }
        },
      });
      // Logic to update the plan
      return responseData;
    } catch (error) {
      console.error("Error updating plan:", error);
      return null;
    }
  }

  async function createPlan(
    name?: MaybeRefOrGetter<string>,
    description?: MaybeRefOrGetter<string>,
    initialPlanData?: MaybeRefOrGetter<string>
  ) {
    try {
      const data = await $fetch("/api/plan", {
        method: "POST",
        onResponse: ({ response }) => {
          if (response.status === 201 && response.headers.has("location")) {
            const location = response.headers.get("location");
            const id = location!.split("/").pop();
            planId.value = id;
          }
        },
        body: {
          name,
          description,
          data: initialPlanData,
        },
      });
    } catch (error) {
      console.error("Error creating plan:", error);
      return null;
    }
  }

  return { planId: skipHydrate(planId), createPlan, fetchPlan, deletePlan, updatePlan };
});
