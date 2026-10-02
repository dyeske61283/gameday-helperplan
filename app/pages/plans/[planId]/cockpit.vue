<script setup lang="ts">
import { usePlanStore } from "~/stores/plan";
import { createPlanLink } from "~/utils/plan-links";

const route = useRoute();
const planStore = usePlanStore();
const { t } = useI18n();
const planError = computed(() => planStore.error?.startsWith("ui.") ? t(planStore.error) : planStore.error);
usePlanInit();
function planLink(path = "") {
  const planId = String(route.params.planId);
  const pathname = `/plans/${planId}${path}`;
  return createPlanLink(planId, planStore.key!, pathname);
}
const duties = computed(() => {
  if (!planStore.selectedMemberId)
    return [];
  const matchDuties = Object.values(planStore.matches).flatMap(match => match.slots
    .filter(slot => slot.assignedMemberId === planStore.selectedMemberId)
    .map(slot => ({ match, slot, gameday: undefined })));
  const gamedayDuties = Object.values(planStore.gamedays).flatMap(gameday => gameday.slots
    .filter(slot => slot.assignedMemberId === planStore.selectedMemberId)
    .map(slot => ({ match: undefined, slot, gameday })));
  return [...matchDuties, ...gamedayDuties];
});
</script>

<template>
  <UContainer class="py-8 max-w-3xl space-y-6">
    <header>
      <h1 class="text-3xl font-bold">
        {{ $t("ui.bulk.bulk_90fdb0ae2e") }}
      </h1><p class="text-on-surface-variant">
        {{ $t("ui.bulk.bulk_b9b3ef8d3a") }}
      </p>
    </header>
    <div v-if="planStore.error" class="rounded-xl border border-dashed p-8 text-center space-y-3">
      <p>{{ $t('ui.loadPlanFailed') }}</p>
      <p class="text-sm text-neutral-500">
        {{ planError }}
      </p>
      <UButton to="/">
        {{ $t("ui.bulk.bulk_ca935c2eb5") }}
      </UButton>
    </div>
    <div v-else-if="!planStore.selectedMemberId" class="rounded-xl border border-dashed p-8 text-center">
      {{ $t("ui.bulk.bulk_89d8e68b1f") }}
    </div>
    <div v-else-if="!duties.length" class="rounded-xl border border-dashed p-8 text-center">
      {{ $t("ui.bulk.bulk_e7a8b3031e") }}
    </div>
    <div v-else class="space-y-3">
      <NuxtLink v-for="{ match, slot, gameday } in duties" :key="slot.id" :to="match ? planLink(`/matches/${match.id}`) : planLink()" class="block rounded-xl border p-4 hover:border-primary">
        <p class="font-semibold">
          {{ planStore.roles.find(role => role.id === slot.roleId)?.name || slot.roleId }}
        </p>
        <p class="text-sm text-neutral-500">
          {{ match ? `${planStore.teams[match.homeTeamId]?.name || match.homeTeamId} vs ${match.awayTeamName}` : `Gameday duty · ${gameday?.date}` }}
        </p>
      </NuxtLink>
    </div>
  </UContainer>
</template>
