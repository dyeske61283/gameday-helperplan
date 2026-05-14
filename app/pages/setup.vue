<script setup lang="ts">
import { usePlanStore } from "../stores/plan";
import { nuligaApi } from "../utils/nuliga-api";

const planStore = usePlanStore();
const route = useRoute();
const toast = useToast();
const clip = useClipboard();

const jsonInput = ref("");
const isSyncing = computed(() => !!planStore.plan && !!planStore.key);

const searchQuery = ref("");
const searchResults = ref<any[]>([]);
const isSearching = ref(false);

const rosters = ref<any[]>([]);
const isLoadingRosters = ref(false);
const selectedRosters = ref<Set<string>>(new Set());

const membersInput = ref("");
const manualClubName = ref("");

function handleManualClub() {
  planStore.importClub({
    clubId: `manual-${crypto.randomUUID().substring(0, 8)}`,
    clubName: manualClubName.value,
  });
  planStore.nextStep();
}

async function handleSearch() {
  if (searchQuery.value.length < 3)
    return;
  isSearching.value = true;
  try {
    const response = await nuligaApi.searchClubs(searchQuery.value) as any;
    searchResults.value = response.clubs || [];
  }
  catch (err: unknown) {
    console.error(err);
    toast.add({
      title: "Search Error",
      description: "Failed to search for clubs.",
      color: "error",
    });
  }
  finally {
    isSearching.value = false;
  }
}

function selectClub(club: any) {
  planStore.importClub({
    clubId: club.clubId,
    clubName: club.clubName,
    contactEmail: club.contactEmail,
    homepage: club.homepage,
  });
  planStore.nextStep();
}

async function loadRosters() {
  if (!planStore.plan?.club.id)
    return;
  isLoadingRosters.value = true;
  try {
    const response = await nuligaApi.getRosters(planStore.plan.club.id) as any;
    rosters.value = response.teams || [];
  }
  catch (err: unknown) {
    console.error(err);
    toast.add({
      title: "Error",
      description: "Failed to load rosters.",
      color: "error",
    });
  }
  finally {
    isLoadingRosters.value = false;
  }
}

function toggleRoster(teamId: string) {
  if (selectedRosters.value.has(teamId)) {
    selectedRosters.value.delete(teamId);
  }
  else {
    selectedRosters.value.add(teamId);
  }
}

async function handleImportTeamsAndMatches() {
  if (selectedRosters.value.size === 0) {
    toast.add({
      title: "Selection Empty",
      description: "Please select at least one team.",
      color: "warning",
    });
    return;
  }

  planStore.isLoading = true;
  try {
    // 1. Import Teams
    const teamsToImport = rosters.value
      .filter(r => selectedRosters.value.has(r.teamId))
      .map(r => ({
        teamId: r.teamId,
        teamName: r.teamName,
        leagueName: r.leagueName,
      }));
    planStore.importTeams(teamsToImport);

    // 2. Fetch and Import Matches
    const matchResponse = await nuligaApi.getMatchDays(planStore.plan!.club.id) as any;
    const matches = matchResponse.meetings || [];

    // Filter matches to only include home matches for selected teams
    const clubName = planStore.plan!.club.name;
    const filteredMatches = matches.filter((m: any) => {
      const isHomeMatch = m.teamHomeName.includes(clubName);
      const isSelectedTeam = teamsToImport.some(t => m.teamHomeName.includes(t.teamName) || m.teamGuestName.includes(t.teamName));
      return isHomeMatch && isSelectedTeam;
    });

    planStore.importMatches(filteredMatches.map((m: any) => ({
      meetingId: m.meetingId,
      scheduledTime: m.scheduledTime,
      teamHomeName: m.teamHomeName,
      teamGuestName: m.teamGuestName,
    })));

    toast.add({
      title: "Import Successful",
      description: `Imported ${teamsToImport.length} teams and ${filteredMatches.length} matches.`,
      color: "success",
    });

    planStore.nextStep();
  }
  catch (err: unknown) {
    console.error(err);
    toast.add({
      title: "Import Error",
      description: "Failed to import matches.",
      color: "error",
    });
  }
  finally {
    planStore.isLoading = false;
  }
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

watch(() => planStore.currentStep, (newStep) => {
  if (newStep === 3 && planStore.onboardingPath === "auto" && rosters.value.length === 0) {
    loadRosters();
  }
});

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
      <!-- Wizard Step 1: Path Selection -->
      <div v-if="planStore.currentStep === 1" class="space-y-12">
        <div class="text-center space-y-4">
          <h1 class="headline-lg text-on-surface">
            Choose your setup path
          </h1>
          <p class="body-md text-on-surface-variant max-w-xl mx-auto">
            Start by connecting your club data from nuLiga or set up everything manually.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <button
            class="group relative flex flex-col items-center p-8 bg-surface-container-low rounded-3xl border-2 border-transparent hover:border-primary transition-all text-center"
            @click="planStore.setPath('auto')"
          >
            <div class="mb-6 p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
              <UIcon name="i-lucide-zap" class="text-4xl" />
            </div>
            <h2 class="title-lg mb-2">
              nuLiga Integration
            </h2>
            <p class="body-md text-on-surface-variant">
              Import clubs, teams, and matches automatically. Recommended for active clubs.
            </p>
          </button>

          <button
            class="group relative flex flex-col items-center p-8 bg-surface-container-low rounded-3xl border-2 border-transparent hover:border-secondary transition-all text-center"
            @click="planStore.setPath('manual')"
          >
            <div class="mb-6 p-4 bg-secondary/10 rounded-2xl text-secondary group-hover:scale-110 transition-transform">
              <UIcon name="i-lucide-edit" class="text-4xl" />
            </div>
            <h2 class="title-lg mb-2">
              Manual Setup
            </h2>
            <p class="body-md text-on-surface-variant">
              Define your own structure from scratch. Best for custom events or testing.
            </p>
          </button>
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

        <!-- Step 2 Auto: Club Search -->
        <div v-if="planStore.onboardingPath === 'auto' && planStore.currentStep === 2" class="space-y-6 max-w-2xl mx-auto">
          <div class="space-y-2">
            <h2 class="headline-md">
              Find your Club
            </h2>
            <p class="body-md text-on-surface-variant">
              Search by name or club ID to import your data.
            </p>
          </div>

          <div class="flex gap-2">
            <UInput
              v-model="searchQuery"
              placeholder="Search club name..."
              class="grow"
              size="xl"
              @keyup.enter="handleSearch"
            />
            <UButton
              icon="i-lucide-search"
              size="xl"
              :loading="isSearching"
              @click="handleSearch"
            >
              Search
            </UButton>
          </div>

          <div v-if="searchResults.length > 0" class="space-y-2">
            <button
              v-for="club in searchResults"
              :key="club.clubId"
              class="w-full flex items-center justify-between p-4 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors text-left"
              @click="selectClub(club)"
            >
              <div>
                <div class="font-bold text-on-surface">
                  {{ club.clubName }}
                </div>
                <div class="text-xs text-on-surface-variant">
                  ID: {{ club.clubId }}
                </div>
              </div>
              <UIcon name="i-lucide-chevron-right" class="text-on-surface-variant" />
            </button>
          </div>
        </div>

        <!-- Step 3 Auto: Roster & Match Import -->
        <div v-if="planStore.onboardingPath === 'auto' && planStore.currentStep === 3" class="space-y-6 max-w-4xl mx-auto">
          <div class="space-y-2 text-center">
            <h2 class="headline-md">
              Select Teams
            </h2>
            <p class="body-md text-on-surface-variant">
              Which teams from <strong>{{ planStore.plan?.club.name }}</strong> do you want to include?
            </p>
          </div>

          <div v-if="isLoadingRosters" class="flex justify-center py-12">
            <UIcon name="i-lucide-refresh-cw" class="text-4xl animate-spin text-primary" />
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UCard
              v-for="roster in rosters"
              :key="roster.teamId"
              class="cursor-pointer transition-all border-2" :class="[
                selectedRosters.has(roster.teamId) ? 'border-primary bg-primary/5' : 'border-transparent hover:border-outline',
              ]"
              @click="toggleRoster(roster.teamId)"
            >
              <div class="flex items-start gap-3">
                <UCheckbox :model-value="selectedRosters.has(roster.teamId)" @click.stop="toggleRoster(roster.teamId)" />
                <div>
                  <div class="font-bold">
                    {{ roster.teamName }}
                  </div>
                  <div class="text-xs text-on-surface-variant">
                    {{ roster.leagueName }}
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <div class="flex justify-center pt-8">
            <UButton
              size="xl"
              icon="i-lucide-download"
              :loading="planStore.isLoading"
              :disabled="selectedRosters.size === 0"
              @click="handleImportTeamsAndMatches"
            >
              Import Teams & Matches
            </UButton>
          </div>
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

        <!-- Step 2 Manual: Club Info -->
        <div v-if="planStore.onboardingPath === 'manual' && planStore.currentStep === 2" class="space-y-6 max-w-2xl mx-auto">
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

        <!-- Step 3 Manual: Teams (Coming Soon) -->
        <div v-if="planStore.onboardingPath === 'manual' && planStore.currentStep === 3" class="space-y-6 max-w-2xl mx-auto text-center">
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
