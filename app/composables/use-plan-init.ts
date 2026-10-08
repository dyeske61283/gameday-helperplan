import { useRoute } from "vue-router";
import { usePlanStore } from "../stores/plan";

/**
 * Composable to consistently initialize the plan on every sub-page
 * (dashboard, assignments, team-list).
 *
 * Load priority:
 *   1. If planId + key come from the URL path/hash → load from server.
 *   2. Else if the store already has a plan in memory → keep it (navigation within session).
 *   3. Else if a resume state is known → reload from server.
 *   4. No plan → leave the UI in its empty state.
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

    const queryId = (route.params.planId as string | undefined) || (route.query.planId as string | undefined);
    const keyFromStore = planStore.key;
    let storedResume = planStore.resumeState;
    if (!storedResume && typeof globalThis.localStorage?.getItem === "function") {
      try {
        const serialized = globalThis.localStorage.getItem("gameday-plan-resume");
        storedResume = serialized ? JSON.parse(serialized) as { id: string; key: string } : null;
      }
      catch {
        storedResume = null;
      }
    }

    if (queryId && keyFromStore) {
      // Coming from a fresh shared link – load from server
      if (!planStore.plan || planStore.plan.id !== queryId) {
        await planStore.loadPlan(queryId, keyFromStore);
        if (planStore.plan?.id !== queryId)
          planStore.plan = null;
      }
    }
    else if (planStore.plan && (!queryId || planStore.plan.id === queryId)) {
      // Already loaded during this session (e.g. navigated from setup) – keep it
    }
    else if (queryId) {
      if (storedResume?.id === queryId && storedResume.key) {
        await planStore.loadPlan(queryId, storedResume.key);
        if (planStore.plan?.id !== queryId)
          planStore.plan = null;
      }
      else {
        planStore.plan = null;
      }
    }
    else if (storedResume?.id && storedResume.key) {
      // Session resumed from localStorage (e.g. browser refresh on /dashboard)
      await planStore.loadPlan(storedResume.id, storedResume.key);
    }
    else {
      // No shared or resumed plan: link-first pages render their empty state.
    }

    // Start real-time SSE watcher whenever we have a real plan + key
    planStore.watchPlan();
  });

  onUnmounted(() => {
    // Stop SSE when navigating away; the next page's onMounted restarts it if needed
    planStore.stopWatching();
  });
}
