<script setup lang="ts">
import { nuligaApiStub } from "~/utils/nuliga-api";

const store = usePlanStore();
const { plan } = storeToRefs(store);

const searchResults = ref<{ id: string; name: string }[]>([]);
const searchQuery = ref("");
const isLoading = ref(false);

const selectedClubId = ref("");
const step = ref<"search" | "select_data">("search");

const rosters = ref<{ id: string; name: string; league: string; selected: boolean }[]>([]);
const matchDays = ref<{ id: string; date: string; opponent: string; selected: boolean }[]>([]);

async function searchClubs() {
  if (!searchQuery.value)
    return;
  isLoading.value = true;
  searchResults.value = await nuligaApiStub.searchClubs(searchQuery.value);
  isLoading.value = false;
}

async function selectClub(clubId: string) {
  selectedClubId.value = clubId;
  if (!plan.value)
    return;

  isLoading.value = true;
  const clubData = await nuligaApiStub.getClubData(clubId);
  plan.value.clubName = clubData.name;

  const rawRosters = await nuligaApiStub.getRosters(clubId);
  rosters.value = rawRosters.map(r => ({ ...r, selected: true }));

  const rawGames = await nuligaApiStub.getMatchDays(clubId);
  matchDays.value = rawGames.map(g => ({ ...g, selected: true }));

  isLoading.value = false;
  step.value = "select_data";
}

function finishAutoOnboarding() {
  if (!plan.value)
    return;

  // Integrate selected data
  plan.value.rosters = rosters.value
    .filter(r => r.selected)
    .map(r => ({ id: r.id, name: r.name, members: [] }));

  plan.value.games = matchDays.value
    .filter(g => g.selected)
    .map(g => ({
      id: g.id,
      date: g.date,
      opponent: g.opponent,
      location: "TBD",
      rosterId: "",
      assignments: {},
    }));

  store.nextStep();
}
</script>

<template>
  <div v-if="plan" class="flex flex-col gap-12 max-w-2xl mx-auto">
    <div class="space-y-4 text-center">
      <h2 class="display-md text-on-surface">
        {{ $t('onboarding.step2.auto.title') }}
      </h2>
      <p class="body-md text-on-surface-variant">
        {{ $t('onboarding.step2.auto.description') }}
      </p>
    </div>

    <div v-if="step === 'search'" class="space-y-6">
      <UCard :ui="{ body: { padding: 'p-8' } }">
        <div class="space-y-6">
          <UFormField :label="$t('onboarding.step2.auto.search_club')">
            <div class="flex gap-2">
              <UInput
                v-model="searchQuery"
                :loading="isLoading"
                icon="i-lucide-search"
                class="flex-1 input-kinetic"
                :placeholder="$t('onboarding.step2.auto.placeholder')"
                @keyup.enter="searchClubs"
              />
              <UButton color="primary" @click="searchClubs">
                {{ $t('common.search') }}
              </UButton>
            </div>
          </UFormField>

          <div v-if="searchResults.length > 0" class="space-y-2">
            <UButton
              v-for="club in searchResults"
              :key="club.id"
              variant="ghost"
              class="w-full justify-start text-left"
              @click="selectClub(club.id)"
            >
              {{ club.name }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else-if="step === 'select_data'" class="space-y-8">
      <div class="space-y-4">
        <h3 class="title-md">
          {{ $t('onboarding.step2.auto.import_rosters') }}
        </h3>
        <div class="grid grid-cols-1 gap-2">
          <UCheckbox
            v-for="roster in rosters"
            :key="roster.id"
            v-model="roster.selected"
            :label="`${roster.name} (${roster.league})`"
          />
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="title-md">
          {{ $t('onboarding.step2.auto.import_games') }}
        </h3>
        <div class="grid grid-cols-1 gap-2">
          <UCheckbox
            v-for="game in matchDays"
            :key="game.id"
            v-model="game.selected"
            :label="`${new Date(game.date).toLocaleDateString()} - ${game.opponent}`"
          />
        </div>
      </div>

      <div class="flex justify-end pt-8">
        <UButton
          color="primary"
          size="xl"
          class="rounded-full px-12"
          @click="finishAutoOnboarding"
        >
          {{ $t('common.continue') }}
          <template #trailing>
            <UIcon name="i-lucide-arrow-right" />
          </template>
        </UButton>
      </div>
    </div>

    <div class="flex justify-between pt-8">
      <UButton
        variant="ghost"
        color="neutral"
        size="lg"
        class="rounded-full"
        @click="step === 'select_data' ? (step = 'search') : store.prevStep()"
      >
        {{ $t('common.back') }}
      </UButton>
    </div>
  </div>
</template>
