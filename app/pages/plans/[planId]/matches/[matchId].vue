<!-- Nuxt requires camelCase dynamic parameter names here. -->
<!-- eslint-disable unicorn/filename-case -->
<script setup lang="ts">
import type { Slot } from "../../../../utils/plan-types";
import { usePlanStore } from "../../../../stores/plan";

const route = useRoute();
const planStore = usePlanStore();
const toast = useToast();
usePlanInit();

const match = computed(() => planStore.matches[route.params.matchId as string]);
const selectedMember = computed(() => planStore.selectedMemberId ? planStore.members[planStore.selectedMemberId] : undefined);
const roleName = (slot: Slot) => planStore.roles.find(role => role.id === slot.roleId)?.name || slot.roleId;
function canClaim(slot: Slot) {
  return !!selectedMember.value && slot.assignmentStatus === "OPEN" && (() => {
    const role = planStore.roles.find(candidate => candidate.id === slot.roleId);
    return !role?.requiredSkillId || selectedMember.value!.skillIds.includes(role.requiredSkillId);
  })();
}

async function claim(slot: Slot) {
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
    toast.add({ title: "Duty claimed", color: "success" });
  }
  catch (error) {
    slot.assignedMemberId = previous.assignedMemberId;
    slot.assignmentStatus = previous.assignmentStatus;
    slot.customHelperName = previous.customHelperName;
    slot.updatedAt = previous.updatedAt;
    toast.add({ title: "Could not claim duty", description: (error as Error).message, color: "error" });
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-3xl space-y-6">
    <div v-if="planStore.isLoading">
      Loading match...
    </div>
    <div v-else-if="!match" class="text-center py-16 space-y-3">
      <h1 class="text-xl font-bold">
        Match not found
      </h1>
      <p class="text-sm text-neutral-500">
        This match is not part of the shared plan.
      </p>
      <UButton :to="`/plans/${route.params.planId}`">
        Back to fixtures
      </UButton>
    </div>
    <template v-else>
      <NuxtLink :to="`/plans/${route.params.planId}`" class="text-sm text-primary">
        ← All fixtures
      </NuxtLink>
      <header>
        <h1 class="text-3xl font-bold">
          {{ planStore.teams[match.homeTeamId]?.name || match.homeTeamId }} vs {{ match.awayTeamName }}
        </h1>
        <p class="text-on-surface-variant">
          {{ new Date(match.time).toLocaleString() }}
        </p>
      </header>
      <div v-if="!selectedMember" class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
        Select a member below before claiming a duty.
      </div>
      <label class="block space-y-2"><span class="text-sm font-semibold">I am</span><select v-model="planStore.selectedMemberId" class="w-full rounded-lg border p-2"><option :value="null">Select a member</option><option v-for="member in planStore.membersList" :key="member.id" :value="member.id">{{ member.name }}{{ match.helperTeamId && member.teamIds.includes(match.helperTeamId) ? ' · duty team' : '' }}</option></select></label>
      <div v-if="match.slots.length" class="space-y-3">
        <div v-for="slot in match.slots" :key="slot.id" class="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <p class="font-semibold">
              {{ roleName(slot) }}
            </p><p class="text-sm text-neutral-500">
              {{ slot.assignedMemberId ? planStore.members[slot.assignedMemberId]?.name : slot.assignmentStatus === 'CANCELLED' ? 'Cancelled' : 'Open' }}
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
        This fixture has no helper duties.
      </div>
      <NuxtLink to="/cockpit" class="text-sm text-primary">
        Open personal cockpit
      </NuxtLink>
    </template>
  </UContainer>
</template>
