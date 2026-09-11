import { useRoute } from "vue-router";
import { usePlanStore } from "../stores/plan";

/**
 * Composable to consistently initialize the plan on every sub-page
 * (dashboard, assignments, team-list).
 *
 * Load priority:
 *   1. If planId + key come from the URL query/hash → load from server.
 *   2. Else if the store already has a plan in memory → keep it (navigation within session).
 *   3. Else if lastPlanId + key are known (localStorage + store) → reload from server.
 *   4. Fallback → load example plan so the UI is never blank.
 *
 * Also starts the SSE watcher and calls initFromUrl() so the encryption
 * key is extracted from the URL hash before it is stripped away.
 */
export function usePlanInit() {
  const planStore = usePlanStore();
  const route = useRoute();

  onMounted(async () => {
    // 1. Extract key from URL hash (strips it from the URL afterwards)
    planStore.initFromUrl();

    const queryId = route.query.planId as string | undefined;
    const keyFromStore = planStore.key;

    if (queryId && keyFromStore) {
      // Coming from a fresh shared link – load from server
      if (!planStore.plan || planStore.plan.id !== queryId) {
        await planStore.loadPlan(queryId, keyFromStore);
      }
    }
    else if (planStore.plan) {
      // Already loaded during this session (e.g. navigated from setup) – keep it
    }
    else if (planStore.lastPlanId && keyFromStore) {
      // Session resumed from localStorage (e.g. browser refresh on /dashboard)
      await planStore.loadPlan(planStore.lastPlanId, keyFromStore);
    }
    else {
      // No plan available – show example so the UI is never blank
      planStore.ensurePlanLoaded();
    }

    // Start real-time SSE watcher whenever we have a real plan + key
    planStore.watchPlan();
  });

  onUnmounted(() => {
    // Stop SSE when navigating away; the next page's onMounted restarts it if needed
    planStore.stopWatching();
  });
}
