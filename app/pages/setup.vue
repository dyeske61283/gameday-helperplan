<script setup lang="ts">
import { usePlanStore } from "../stores/plan";

const planStore = usePlanStore();
const route = useRoute();
const toast = useToast();
const clip = useClipboard();

const jsonInput = ref("");
const isSyncing = computed(() => !!planStore.plan && !!planStore.key);

const membersInput = ref("");
const manualClubName = ref("");

function handleManualClub() {
  const id = `manual-${crypto.randomUUID().substring(0, 8)}`;
  if (!planStore.plan) {
    planStore.createNewPlan(id, "");
  }
  if (planStore.plan) {
    planStore.plan.club = {
      id,
      name: manualClubName.value,
      contactEmail: "",
      homepage: "",
      lastUpdated: Date.now(),
    };
  }
  planStore.nextStep();
}

function handleImportMembers() {
  const names = membersInput.value.split("\n").map(n => n.trim()).filter(n => n.length > 0);
  if (!planStore.plan)
    return;

  names.forEach((name) => {
    const id = crypto.randomUUID();
    planStore.plan!.members[id] = {
      id,
      name,
      skillIds: [],
      teamIds: [],
      isManual: false,
      updatedAt: Date.now(),
    };
  });

  toast.add({
    title: "Members Added",
    description: `Added ${names.length} members.`,
    color: "success",
  });

  planStore.finalizePlan();
}

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
  <UContainer class="py-12 md:py-24">
    <div v-if="planStore.currentStep < 5" class="space-y-12">
      <!-- Wizard Step 1: Start Setup -->
      <div v-if="planStore.currentStep === 1" class="space-y-12">
        <div class="text-center space-y-4">
          <h1 class="headline-lg text-on-surface">
            Set up your Gameday Plan
          </h1>
          <p class="body-md text-on-surface-variant max-w-xl mx-auto">
            Enter your club and team details manually to get started.
          </p>
        </div>

        <div class="flex justify-center gap-4">
          <UButton
            size="xl"
            icon="i-lucide-arrow-right"
            @click="planStore.nextStep()"
          >
            Start Setup
          </UButton>
        </div>

        <div v-if="planStore.lastPlanId" class="flex justify-center pt-8">
          <UButton
            icon="i-lucide-history"
            variant="outline"
            size="lg"
            @click="handleResume"
          >
            Resume Last Plan
          </UButton>
        </div>
      </div>

      <!-- Wizard Step > 1 -->
      <div v-else class="space-y-8">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            @click="planStore.prevStep()"
          >
            Back
          </UButton>
          <span class="text-sm font-medium text-on-surface-variant">Step {{ planStore.currentStep }}</span>
        </div>

        <!-- Step 4: Members (Bulk Add) -->
        <div v-if="planStore.currentStep === 4" class="space-y-6 max-w-2xl mx-auto">
          <div class="text-center space-y-2">
            <h2 class="headline-md">
              Add Members
            </h2>
            <p class="body-md text-on-surface-variant">
              Paste a list of names (one per line) to quickly add helpers.
            </p>
          </div>

          <UTextarea
            v-model="membersInput"
            placeholder="Max Mustermann&#10;Erika Musterfrau&#10;..."
            :rows="10"
            size="xl"
            autoresize
          />

          <div class="flex justify-center gap-4">
            <UButton variant="ghost" @click="planStore.finalizePlan()">
              Skip for now
            </UButton>
            <UButton size="xl" @click="handleImportMembers">
              Add Members & Finish
            </UButton>
          </div>
        </div>

        <!-- Step 2: Club Info -->
        <div v-if="planStore.currentStep === 2" class="space-y-6 max-w-2xl mx-auto">
          <div class="space-y-2">
            <h2 class="headline-md">
              Club Information
            </h2>
            <p class="body-md text-on-surface-variant">
              Enter your club details manually.
            </p>
          </div>

          <div class="space-y-4">
            <UFormField label="Club Name">
              <UInput v-model="manualClubName" placeholder="e.g. TSV Example City" size="lg" />
            </UFormField>

            <UButton size="xl" :disabled="!manualClubName" @click="handleManualClub">
              Continue
            </UButton>
          </div>
        </div>

        <!-- Step 3: Teams -->
        <div v-if="planStore.currentStep === 3" class="space-y-6 max-w-2xl mx-auto text-center">
          <h2 class="headline-md">
            Manual Team Setup
          </h2>
          <p>Manual team entry coming soon...</p>
          <UButton size="xl" @click="planStore.nextStep()">
            Continue to Members
          </UButton>
        </div>
      </div>
    </div>

    <!-- Advanced Mode / Finished Wizard -->
    <div v-else class="space-y-8">
      <!-- Existing Live Sync UI and Editor -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="text-center sm:text-left">
          <h1 class="headline-lg text-on-surface">
            {{ $t('pages.setup.title') }} (Real-time Sync)
          </h1>
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

        <UButton to="/" icon="i-lucide-arrow-left" size="lg" variant="ghost">
          {{ $t('common.back_to_home') }}
        </UButton>
      </div>

      <div v-if="planStore.error" class="p-4 bg-error/10 text-error rounded-lg">
        {{ planStore.error }}
      </div>

      <div class="bg-surface-container-low p-6 rounded-xl space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="font-bold opacity-70">Plan ID:</span><br>
            <code class="text-primary">{{ planStore.plan?.id }}</code>
          </div>
          <div>
            <span class="font-bold opacity-70">Encryption Key:</span><br>
            <code class="text-secondary">{{ planStore.key }}</code>
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
        </div>
        <UTextarea
          v-model="jsonInput"
          autoresize
          :rows="12"
          class="font-mono text-xs w-full bg-surface-container-lowest"
        />
      </div>
    </div>
  </UContainer>
</template>
