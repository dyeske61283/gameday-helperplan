<script setup lang="ts">
import { usePlanStore } from "../stores/plan";

const planStore = usePlanStore();
const route = useRoute();
const toast = useToast();
const clip = useClipboard();
const currentStep = ref(1);
const jsonInput = ref("");
const isSyncing = computed(() => !!planStore.plan && !!planStore.key);

const membersInput = ref("");
const manualClubName = ref("");
const newWizardTeamName = ref("");

function handleAddWizardTeam() {
  if (!newWizardTeamName.value.trim())
    return;
  planStore.addTeam(newWizardTeamName.value.trim());
  newWizardTeamName.value = "";
}

function nextStep() {
  currentStep.value++;
}

function prevStep() {
  if (currentStep.value > 0)
    currentStep.value--;
}

async function finalizePlan() {
  await planStore.finalizePlan();
  nextStep();
}

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
      lastUpdated: new Date(),
    };
  }
  nextStep();
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
      updatedAt: new Date(),
    };
  });

  toast.add({
    title: "Members Added",
    description: `Added ${names.length} members.`,
    color: "success",
  });

  finalizePlan();
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
  const currentKey = planStore.key;

  if (lastId && currentKey) {
    currentStep.value = 5;
  }
  else {
    toast.add({
      title: "Error",
      description: "Could not resume. Need both a stored Plan ID and a Key in the URL fragment.",
      color: "error",
    });
  }
}

const dashboardLink = computed(() => {
  if (!planStore.plan?.id)
    return "/dashboard";
  return `/plans/${planStore.plan.id}`;
});

const assignmentsLink = computed(() => {
  if (!planStore.plan?.id)
    return "/assignments";
  return `/plans/${planStore.plan.id}`;
});

const shareLink = computed(() => {
  if (import.meta.server || !planStore.plan)
    return "";
  const url = new URL(window.location.href);
  url.pathname = `/plans/${planStore.plan.id}`;
  url.search = "";
  url.hash = `key=${planStore.key}`;
  return url.toString();
});

onMounted(async () => {
  planStore.initFromUrl();

  const queryId = route.query.planId as string;
  if (queryId && planStore.key) {
    await planStore.loadPlan(queryId, planStore.key);
    currentStep.value = 5;
  }
});

onUnmounted(() => {
  planStore.stopWatching();
});

defineExpose({
  currentStep,
});
</script>

<template>
  <UContainer class="py-12 md:py-24">
    <div v-if="currentStep < 5" class="space-y-12">
      <!-- Wizard Step 1: Start Setup -->
      <div v-if="currentStep === 1" class="space-y-12">
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
            @click="nextStep()"
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
            @click="prevStep()"
          >
            Back
          </UButton>
          <span class="text-sm font-medium text-on-surface-variant">Step {{ currentStep }}</span>
        </div>

        <!-- Step 4: Members (Bulk Add) -->
        <div v-if="currentStep === 4" class="space-y-6 max-w-2xl mx-auto">
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
            <UButton variant="ghost" @click="finalizePlan()">
              Skip for now
            </UButton>
            <UButton size="xl" @click="handleImportMembers">
              Add Members & Finish
            </UButton>
          </div>
        </div>

        <!-- Step 2: Club Info -->
        <div v-if="currentStep === 2" class="space-y-6 max-w-2xl mx-auto">
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
        <div v-if="currentStep === 3" class="space-y-6 max-w-2xl mx-auto">
          <div class="space-y-2">
            <h2 class="headline-md">
              Add Club Teams
            </h2>
            <p class="body-md text-on-surface-variant">
              Add the teams for your club (e.g., adult teams, youth teams).
            </p>
          </div>

          <!-- Add Team Input -->
          <div class="flex gap-2">
            <UInput
              v-model="newWizardTeamName"
              placeholder="e.g. Männer I, Damen I, w. B-Jugend"
              size="lg"
              class="grow"
              @keyup.enter="handleAddWizardTeam"
            />
            <UButton
              size="lg"
              color="primary"
              :disabled="!newWizardTeamName.trim()"
              @click="handleAddWizardTeam"
            >
              Add Team
            </UButton>
          </div>

          <!-- Quick Suggestions -->
          <div class="space-y-1.5">
            <span class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Quick Suggestions:</span>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="suggestion in ['Männer I', 'Männer II', 'Damen I', 'm. A-Jugend', 'w. B-Jugend', 'gem. E-Jugend', 'Minis']"
                :key="suggestion"
                size="xs"
                variant="subtle"
                color="neutral"
                class="rounded-full"
                @click="planStore.addTeam(suggestion)"
              >
                + {{ suggestion }}
              </UButton>
            </div>
          </div>

          <!-- Added Teams List -->
          <div class="space-y-2 pt-2">
            <span class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Created Teams ({{ planStore.teamsList.length }}):</span>
            <div v-if="planStore.teamsList.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="team in planStore.teamsList"
                :key="team.id"
                class="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-surface"
              >
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-shield" class="text-primary w-4 h-4" />
                  <span class="text-sm font-semibold text-on-surface">{{ team.name }}</span>
                </div>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-lucide-trash-2"
                  @click="planStore.deleteTeam(team.id)"
                />
              </div>
            </div>
            <div v-else class="p-6 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
              No teams added yet. Type a team name above or click a suggestion.
            </div>
          </div>

          <div class="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <UButton variant="ghost" @click="nextStep()">
              Skip for now
            </UButton>
            <UButton size="xl" @click="nextStep()">
              Continue to Members
            </UButton>
          </div>
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
          :to="assignmentsLink"
          icon="i-lucide-id-card-lanyard"
          size="lg"
          color="primary"
          class="rounded-full"
        >
          Manage Duties
        </UButton>

        <UButton
          :to="dashboardLink"
          icon="i-lucide-layout-dashboard"
          size="lg"
          variant="outline"
          class="rounded-full"
        >
          View Schedule
        </UButton>

        <UButton
          icon="i-lucide-save"
          size="lg"
          color="secondary"
          :disabled="!planStore.plan"
          :loading="planStore.isLoading"
          class="rounded-full"
          @click="handleSave"
        >
          Save Plan
        </UButton>

        <UButton
          icon="i-lucide-refresh-cw"
          size="lg"
          variant="ghost"
          :disabled="!planStore.plan"
          :loading="planStore.isLoading"
          class="rounded-full"
          @click="handleLoad"
        >
          Reload
        </UButton>

        <UButton to="/" icon="i-lucide-arrow-left" size="lg" variant="ghost" class="rounded-full">
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
