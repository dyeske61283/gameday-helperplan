<!-- Nuxt requires camelCase dynamic parameter names here. -->
<!-- eslint-disable unicorn/filename-case -->
<script setup lang="ts">
import { usePlanStore } from "../../../stores/plan";

const route = useRoute();
const planStore = usePlanStore();
usePlanInit();
const matches = computed(() => planStore.gamedaysList.flatMap(day => day.matchIds.map(id => planStore.matches[id]).filter((match): match is NonNullable<typeof match> => !!match)));
</script>

<template>
  <UContainer class="py-8 max-w-3xl space-y-6">
    <div v-if="planStore.isLoading" class="text-center py-16">
      Loading plan...
    </div>
    <div v-else-if="planStore.error" class="space-y-3 text-center py-16">
      <h1 class="text-xl font-bold">
        Could not open this plan
      </h1>
      <p class="text-sm text-error">
        {{ planStore.error }}
      </p>
      <UButton to="/">
        Return to start
      </UButton>
    </div>
    <div v-else-if="!planStore.plan" class="text-center py-16">
      This plan is unavailable.
    </div>
    <template v-else>
      <header>
        <p class="text-sm text-primary">
          {{ planStore.plan.season }}
        </p>
        <h1 class="text-3xl font-bold">
          {{ planStore.plan.club.name }}
        </h1>
        <p class="text-on-surface-variant">
          Fixtures and open helper duties
        </p>
      </header>
      <div v-if="matches.length" class="space-y-3">
        <NuxtLink v-for="match in matches" :key="match.id" :to="`/plans/${route.params.planId}/matches/${match.id}`" class="block rounded-xl border p-4 hover:border-primary">
          <div class="flex justify-between gap-4">
            <span class="font-semibold">{{ planStore.teams[match.homeTeamId]?.name || match.homeTeamId }} vs {{ match.awayTeamName }}</span>
            <span class="text-sm text-neutral-500">{{ new Date(match.time).toLocaleString() }}</span>
          </div>
          <p class="text-sm text-neutral-500">
            {{ match.slots.filter(slot => slot.assignmentStatus === 'OPEN').length }} open duties
          </p>
        </NuxtLink>
      </div>
      <div v-else class="rounded-xl border border-dashed p-8 text-center">
        No fixtures are available.
      </div>
    </template>
  </UContainer>
</template>
