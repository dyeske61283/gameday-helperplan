<script setup lang="ts">
import { useEncryption } from "../composables/use-crypto";
import { usePlanStore } from "../stores/plan";

const planStore = usePlanStore();
const route = useRoute();
const { generateKey } = useEncryption();
const toast = useToast();
const clip = useClipboard();

const jsonInput = ref("");
const isSyncing = computed(() => !!planStore.plan && !!planStore.key);

// Synchronize jsonInput with planStore.plan
watch(() => planStore.plan, (newPlan) => {
  if (newPlan) {
    jsonInput.value = JSON.stringify(newPlan, null, 2);
  }
}, { deep: true, immediate: true });

// Manage real-time sync based on plan availability
watch(() => planStore.plan?.id, (newId) => {
  if (newId) {
    planStore.watchPlan();
  }
  else {
    planStore.stopWatching();
  }
}, { immediate: true });

async function handleCreate() {
  const id = crypto.randomUUID();
  const key = await generateKey();

  planStore.createNewPlan(id, key);
  await planStore.savePlan();
}

async function handleSave() {
  try {
    const updatedPlan = JSON.parse(jsonInput.value);
    planStore.plan = updatedPlan;
    await planStore.savePlan();
  }
  catch (e) {
    toast.add({
      title: "Error",
      description: `Invalid JSON: ${(e as Error).message}`,
      color: "error",
    });
  }
}

async function handleLoad() {
  if (!planStore.plan?.id || !planStore.key) {
    toast.add({
      title: "Error",
      description: "No plan ID or key available to reload. Create a plan first.",
      color: "error",
    });
    return;
  }
  await planStore.loadPlan(planStore.plan.id, planStore.key);
}

async function handleResume() {
  const lastId = planStore.lastPlanId;
  planStore.initFromUrl();
  const currentKey = planStore.key;

  if (lastId && currentKey) {
    await planStore.loadPlan(lastId, currentKey);
  }
  else {
    toast.add({
      title: "Error",
      description: "Could not resume. Need both a stored Plan ID and a Key in the URL fragment.",
      color: "error",
    });
  }
}

const shareLink = computed(() => {
  if (import.meta.server || !planStore.plan)
    return "";
  const url = new URL(window.location.href);
  url.searchParams.set("planId", planStore.plan.id);
  return url.toString();
});

onMounted(async () => {
  planStore.initFromUrl();

  const queryId = route.query.planId as string;
  if (queryId && planStore.key) {
    await planStore.loadPlan(queryId, planStore.key);
  }
});

onUnmounted(() => {
  planStore.stopWatching();
});
</script>

<template>
  <UContainer class="py-24">
    <div class="space-y-8">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="text-center sm:text-left">
          <h1 class="headline-lg text-on-surface">
            {{ $t('pages.setup.title') }} (Real-time Sync)
          </h1>
          <p class="body-md text-on-surface-variant max-w-2xl">
            This demo now supports <strong>Real-time Synchronization</strong>. Open this page in two windows to see updates propagate instantly!
          </p>
        </div>

        <div v-if="isSyncing" class="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-full text-sm font-bold">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span class="relative inline-flex rounded-full h-3 w-3 bg-success" />
          </span>
          Live Sync Active
        </div>
      </div>

      <div class="flex flex-wrap gap-4">
        <UButton
          icon="i-lucide-plus-circle"
          size="lg"
          color="primary"
          :loading="planStore.isLoading"
          @click="handleCreate"
        >
          Create New Plan
        </UButton>

        <UButton
          icon="i-lucide-save"
          size="lg"
          color="secondary"
          :disabled="!planStore.plan"
          :loading="planStore.isLoading"
          @click="handleSave"
        >
          Save Plan
        </UButton>

        <UButton
          icon="i-lucide-refresh-cw"
          size="lg"
          variant="outline"
          :disabled="!planStore.plan"
          :loading="planStore.isLoading"
          @click="handleLoad"
        >
          Reload
        </UButton>

        <UButton
          v-if="planStore.lastPlanId && !planStore.plan"
          icon="i-lucide-history"
          size="lg"
          variant="subtle"
          @click="handleResume"
        >
          Resume Last Plan
        </UButton>

        <UButton to="/" icon="i-lucide-arrow-left" size="lg" variant="ghost">
          {{ $t('common.back_to_home') }}
        </UButton>
      </div>

      <div v-if="planStore.error" class="p-4 bg-error/10 text-error rounded-lg">
        {{ planStore.error }}
      </div>

      <div v-if="planStore.plan" class="space-y-6">
        <div class="bg-surface-container-low p-6 rounded-xl space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-bold opacity-70">Plan ID:</span><br>
              <code class="text-primary">{{ planStore.plan.id }}</code>
            </div>
            <div>
              <span class="font-bold opacity-70">Encryption Key:</span><br>
              <code class="text-secondary">{{ planStore.key }}</code>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold opacity-70">Revision:</span>
              <UBadge variant="subtle" color="neutral">
                {{ planStore.plan.rev }}
              </UBadge>
            </div>
            <div>
              <span class="font-bold opacity-70">Last Updated:</span> {{ new Date(planStore.plan.lastUpdated).toLocaleString() }}
            </div>
          </div>

          <div class="pt-4 border-t border-outline-variant">
            <span class="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Shareable Link</span>
            <div class="mt-1 flex gap-2">
              <UInput v-model="shareLink" readonly class="grow font-mono text-xs" />
              <UButton
                icon="i-lucide-copy"
                variant="ghost"
                color="neutral"
                @click="clip.copy(shareLink)"
              />
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="block font-bold text-on-surface label-md">Plan JSON Editor</label>
            <span class="text-[10px] text-on-surface-variant italic">Changes here update locally, "Save Plan" pushes to server.</span>
          </div>
          <UTextarea
            v-model="jsonInput"
            autoresize
            :rows="12"
            class="font-mono text-xs w-full bg-surface-container-lowest"
          />
        </div>
      </div>

      <div v-else class="text-center py-20 border-2 border-dashed border-outline rounded-3xl bg-surface-container-lowest">
        <UIcon name="i-lucide-zap" class="text-4xl text-primary mb-4 animate-pulse" />
        <p class="text-on-surface-variant body-md">
          Ready for real-time collaboration. Start by creating a plan!
        </p>
      </div>
    </div>
  </UContainer>
</template>
