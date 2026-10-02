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
        {{ $t("ui.cockpit.myDuties") }}
      </h1><p class="text-on-surface-variant">
        {{ $t("ui.cockpit.yourClaimedHelperDuties") }}
      </p>
    </header>
    <label class="block space-y-2">
      <span class="font-semibold">{{ $t("ui.memberProfile") }}</span>
      <select v-model="planStore.selectedMemberId" class="w-full rounded-lg border p-2" :aria-label="$t('ui.memberProfile')">
        <option :value="null">
          {{ $t("ui.match.selectAMember") }}
        </option>
        <option v-for="member in planStore.membersList" :key="member.id" :value="member.id">
          {{ member.name }}
        </option>
      </select>
    </label>
    <div v-if="planStore.error" class="rounded-xl border border-dashed p-8 text-center space-y-3">
      <p>{{ $t('ui.loadPlanFailed') }}</p>
      <p class="text-sm text-neutral-500">
        {{ planError }}
      </p>
      <UButton to="/">
        {{ $t("ui.schedule.returnStart") }}
      </UButton>
    </div>
    <div v-else-if="!planStore.selectedMemberId" class="rounded-xl border border-dashed p-8 text-center">
      {{ $t("ui.cockpit.selectAMemberFromAMatchToSeePersonalDuties") }}
    </div>
    <div v-else-if="!duties.length" class="rounded-xl border border-dashed p-8 text-center">
      {{ $t("ui.cockpit.youHaveNoPersonalDuties") }}
    </div>
    <div v-else class="space-y-3">
      <NuxtLink v-for="{ match, slot, gameday } in duties" :key="slot.id" :to="match ? planLink(`/matches/${match.id}`) : planLink()" class="block rounded-xl border p-4 hover:border-primary">
        <p class="font-semibold">
          {{ planStore.roles.find(role => role.id === slot.roleId)?.name || slot.roleId }}
        </p>
        <p class="text-sm text-neutral-500">
          {{ match ? $t("ui.matchVersus", { home: planStore.teams[match.homeTeamId]?.name || match.homeTeamId, away: match.awayTeamName }) : $t("ui.gamedayDuty", { date: gameday?.date }) }}
        </p>
      </NuxtLink>
    </div>
  </UContainer>
</template>
