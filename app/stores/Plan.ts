import { defineStore } from "pinia";

export const usePlanStore = defineStore("Plan", () => {
  const planId = useState<string | undefined>("current_plan");

  async function fetchPlan(id: MaybeRefOrGetter<string>) {
    // Logic to fetch the plan
    const { data, error } = await useFetch(`/api/plan/${id}`, {
      method: "GET",
      onResponse: ({ response }) => {
        if (response.status === 200) {
          planId.value = toValue(id);
        }
      },
    });
    if (error.value) {
      console.error("Error fetching plan:", error.value);
      return null;
    }
    return data.value;
  }

  async function deletePlan(id: MaybeRefOrGetter<string>) {
    // Logic to delete the plan
    const { data, error } = await useFetch(`/api/plan/${id}`, {
      method: "DELETE",
      onResponse: ({ response }) => {
        if (response.status === 204) {
          planId.value = undefined;
        }
      },
    });
    if (error.value) {
      console.error("Error deleting plan:", error.value);
      return null;
    }
    if (data.value) {
      planId.value = undefined;
      return data.value;
    }
  }

  async function updatePlan(id: MaybeRefOrGetter<string>, data: MaybeRefOrGetter<string>) {
    // Logic to update the plan
    const { data: responseData, error } = await useFetch(`/api/plan/${id}`, {
      method: "PUT",
      body: data,
      onResponse: ({ response }) => {
        if (response.status === 200) {
          planId.value = toValue(id);
        }
      },
    });
    if (error.value) {
      console.error("Error updating plan:", error.value);
      return null;
    }
    return responseData.value;
  }
  async function createPlan(
    name?: MaybeRefOrGetter<string>,
    description?: MaybeRefOrGetter<string>,
    initialPlanData?: MaybeRefOrGetter<string>
  ) {
    const { data, error } = await useFetch("/api/plan", {
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

    if (error.value) {
      console.error("Error creating plan:", error.value);
      return null;
    }
  }

  return { planId, createPlan, fetchPlan, deletePlan, updatePlan };
});
