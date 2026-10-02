<!-- Nuxt requires camelCase dynamic parameter names here. -->
<!-- eslint-disable unicorn/filename-case -->
<script setup lang="ts">
import type { Slot } from "~/utils/plan-types";
import { usePlanStore } from "~/stores/plan";
import { isMemberEligibleForSlot } from "~/utils/helper-assignment";
import { createPlanLink } from "~/utils/plan-links";

const route = useRoute();
const planStore = usePlanStore();
const toast = useToast();
const { t } = useI18n();
usePlanInit();

const match = computed(() => planStore.matches[route.params.matchId as string]);
const isMemberPickerOpen = ref(false);
const pendingSlot = ref<Slot | null>(null);
const cockpitLink = computed(() => {
  const planId = String(route.params.planId);
  const pathname = `/plans/${planId}/cockpit`;
  return planStore.key ? createPlanLink(planId, planStore.key, pathname) : `${pathname}${route.hash}`;
});
function planLink(path = "") {
  const planId = String(route.params.planId);
  const pathname = `/plans/${planId}${path}`;
  return planStore.key ? createPlanLink(planId, planStore.key, pathname) : `${pathname}${route.hash}`;
}
const selectedMember = computed(() => planStore.selectedMemberId ? planStore.members[planStore.selectedMemberId] : undefined);
const roleName = (slot: Slot) => planStore.roles.find(role => role.id === slot.roleId)?.name || slot.roleId;
function canClaim(slot: Slot) {
  return !!planStore.plan && slot.assignmentStatus === "OPEN"
    && (!selectedMember.value || isMemberEligibleForSlot(planStore.plan, slot, selectedMember.value.id));
}

async function claim(slot: Slot) {
  if (!selectedMember.value) {
    pendingSlot.value = slot;
    isMemberPickerOpen.value = true;
    return;
  }
  const previous = {
    assignedMemberId: slot.assignedMemberId,
    assignmentStatus: slot.assignmentStatus,
    customHelperName: slot.customHelperName,
    updatedAt: slot.updatedAt,
  };
  try {
    planStore.claimSlot(match.value!.id, slot.id, planStore.selectedMemberId || undefined);
    await planStore.savePlan();
    if (planStore.error)
      throw new Error(planStore.error);
    toast.add({ title: t("ui.dutyClaimed"), color: "success" });
  }
  catch (error) {
    slot.assignedMemberId = previous.assignedMemberId;
    slot.assignmentStatus = previous.assignmentStatus;
    slot.customHelperName = previous.customHelperName;
    slot.updatedAt = previous.updatedAt;
    toast.add({ title: t("ui.couldNotClaimDuty"), description: (error as Error).message, color: "error" });
  }
}

async function resumeClaim() {
  const slot = pendingSlot.value;
  pendingSlot.value = null;
  isMemberPickerOpen.value = false;
  if (slot)
    await claim(slot);
}
</script>

<template>
  <UContainer class="py-8 max-w-3xl space-y-6">
    <div v-if="planStore.isLoading">
      {{ $t("ui.match.loadingMatch") }}
    </div>
    <div v-else-if="!match" class="text-center py-16 space-y-3">
      <h1 class="text-xl font-bold">
        {{ $t("ui.match.matchNotFound") }}
      </h1>
      <p class="text-sm text-neutral-500">
        {{ $t("ui.match.thisMatchIsNotPartOfTheSharedPlan") }}
      </p>
      <UButton :to="planLink()">
        {{ $t("ui.match.backToFixtures") }}
      </UButton>
    </div>
    <template v-else>
      <NuxtLink :to="planLink()" class="text-sm text-primary">
        {{ $t("ui.match.allFixtures") }}
      </NuxtLink>
      <header>
        <h1 class="text-3xl font-bold">
          {{ planStore.teams[match.homeTeamId]?.name || match.homeTeamId }} vs {{ match.awayTeamName }}
        </h1>
        <p class="text-on-surface-variant">
          {{ new Date(match.time).toLocaleString() }}
        </p>
      </header>
      <div v-if="match.slots.length" class="space-y-3">
        <div v-for="slot in match.slots" :key="slot.id" class="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <p class="font-semibold">
              {{ roleName(slot) }}
            </p><p class="text-sm text-neutral-500">
              {{ slot.assignedMemberId ? planStore.members[slot.assignedMemberId]?.name : slot.assignmentStatus === 'CANCELLED' ? $t("ui.cancelled") : $t("ui.open") }}
            </p>
          </div>
          <UButton v-if="slot.assignmentStatus === 'OPEN'" :disabled="!canClaim(slot)" @click="claim(slot)">
            {{ selectedMember ? 'Claim' : 'Select member' }}
          </UButton>
          <UBadge v-else>
            {{ slot.assignmentStatus }}
          </UBadge>
        </div>
      </div>
      <div v-else class="rounded-xl border border-dashed p-8 text-center">
        {{ $t("ui.match.thisFixtureHasNoHelperDuties") }}
      </div>
      <NuxtLink :to="cockpitLink" class="text-sm text-primary">
        {{ $t("ui.match.openPersonalCockpit") }}
      </NuxtLink>
      <UModal v-model:open="isMemberPickerOpen" :title="$t('ui.chooseMember')">
        <template #body>
          <div class="space-y-4">
            <p>{{ $t('ui.chooseMemberHint') }}</p>
            <select v-model="planStore.selectedMemberId" class="w-full rounded-lg border p-2" :aria-label="$t('ui.memberProfile')">
              <option :value="null">
                {{ $t("ui.match.selectAMember") }}
              </option>
              <option v-for="member in planStore.membersList" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
            <UButton :disabled="!planStore.selectedMemberId" @click="resumeClaim">
              {{ $t("ui.match.continueClaim") }}
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UContainer>
</template>
