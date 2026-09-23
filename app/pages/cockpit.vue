<script setup lang="ts">
import { usePlanStore } from "../stores/plan";

const planStore = usePlanStore();
usePlanInit();
const duties = computed(() => {
  if (!planStore.selectedMemberId)
    return [];
  return Object.values(planStore.matches).flatMap(match => match.slots.filter(slot => slot.assignedMemberId === planStore.selectedMemberId).map(slot => ({ match, slot })));
});
</script>

<template>
  <UContainer class="py-8 max-w-3xl space-y-6">
    <header>
      <h1 class="text-3xl font-bold">
        My duties
      </h1><p class="text-on-surface-variant">
        Your claimed helper duties.
      </p>
    </header>
    <div v-if="!planStore.selectedMemberId" class="rounded-xl border border-dashed p-8 text-center">
      Select a member from a match to see personal duties.
    </div>
    <div v-else-if="!duties.length" class="rounded-xl border border-dashed p-8 text-center">
      You have no personal duties.
    </div>
    <div v-else class="space-y-3">
      <NuxtLink v-for="{ match, slot } in duties" :key="slot.id" :to="`/plans/${planStore.plan?.id}/matches/${match.id}`" class="block rounded-xl border p-4 hover:border-primary">
        <p class="font-semibold">
          {{ planStore.roles.find(role => role.id === slot.roleId)?.name || slot.roleId }}
        </p>
        <p class="text-sm text-neutral-500">
          {{ planStore.teams[match.homeTeamId]?.name || match.homeTeamId }} vs {{ match.awayTeamName }}
        </p>
      </NuxtLink>
    </div>
  </UContainer>
</template>
