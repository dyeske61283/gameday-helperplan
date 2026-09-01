<script setup lang="ts">
import type { Match, Slot } from "../utils/plan-types";
import { usePlanStore } from "../stores/plan";
import { proposeHelperTeamsForMatch } from "../utils/helper-team-proposals";

const planStore = usePlanStore();
const toast = useToast();

function getSuggestedHelperTeams(match: Match): string[] {
  return proposeHelperTeamsForMatch(match, Object.values(planStore.matches)).slice(0, 2);
}

const searchQuery = ref("");
const selectedGamedayDate = ref<string>("");
const onlyUnassigned = ref(false);

// Modal state
const isAssignmentModalOpen = ref(false);
const activeMatchId = ref<string | null>(null);
const activeSlot = ref<Slot | null>(null);
const selectedMemberId = ref<string | null>(null);
const customHelperInput = ref("");
const memberListTab = ref<"team" | "all">("team");

onMounted(() => {
  planStore.ensurePlanLoaded();
  planStore.initFromUrl();
});

// Formatters
function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  catch {
    return dateStr;
  }
}

function formatMatchTime(timeVal: Date | string) {
  try {
    const d = new Date(timeVal);
    if (isNaN(d.getTime()))
      return String(timeVal);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  catch {
    return String(timeVal);
  }
}

function getRole(roleId: string) {
  return planStore.roles.find(r => r.id === roleId);
}

function getRoleName(roleId: string) {
  return getRole(roleId)?.name || roleId;
}

function getMemberName(slot: Slot) {
  if (slot.assignedMemberId && planStore.members[slot.assignedMemberId]) {
    return planStore.members[slot.assignedMemberId]?.name || null;
  }
  return slot.customHelperName || null;
}

// Matches list with gameday information
const matchesWithGameday = computed(() => {
  const result: Array<{ match: Match; gamedayDate: string }> = [];

  for (const gameday of planStore.gamedaysList) {
    for (const matchId of gameday.matchIds) {
      const match = planStore.matches[matchId];
      if (match) {
        result.push({ match, gamedayDate: gameday.date });
      }
    }
  }

  // Fallback for any orphan matches not assigned to a gameday
  for (const match of Object.values(planStore.matches)) {
    if (!result.some(r => r.match.id === match.id)) {
      result.push({ match, gamedayDate: "" });
    }
  }

  return result;
});

// Filtered matches
const filteredMatches = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const dateFilter = selectedGamedayDate.value;
  const unassignedOnly = onlyUnassigned.value;

  return matchesWithGameday.value.filter(({ match, gamedayDate }) => {
    if (dateFilter && gamedayDate !== dateFilter)
      return false;

    if (unassignedOnly) {
      const hasUnassigned = match.slots.some(s => !s.assignedMemberId && !s.customHelperName);
      if (!hasUnassigned)
        return false;
    }

    if (!query)
      return true;

    const home = planStore.teams[match.homeTeamId]?.name?.toLowerCase() || "";
    const away = match.awayTeamName.toLowerCase();
    const helperTeam = planStore.teams[match.helperTeamId || ""]?.name?.toLowerCase() || "";

    return home.includes(query) || away.includes(query) || helperTeam.includes(query) || gamedayDate.includes(query);
  });
});

// Team Select Options for Helper Team
const teamOptions = computed(() => {
  return [
    { label: "— No Helper Team —", value: "" },
    ...planStore.teamsList.map(t => ({ label: t.name, value: t.id })),
  ];
});

// Dates for filter dropdown
const gamedayDateOptions = computed(() => {
  return [
    { label: "All Gamedays", value: "" },
    ...planStore.gamedaysList.map(gd => ({
      label: `${formatDate(gd.date)} (${gd.date})`,
      value: gd.date,
    })),
  ];
});

// Modal helpers
function openAssignmentModal(matchId: string, slot: Slot) {
  activeMatchId.value = matchId;
  activeSlot.value = slot;
  selectedMemberId.value = slot.assignedMemberId || null;
  customHelperInput.value = slot.customHelperName || "";
  memberListTab.value = "team";
  isAssignmentModalOpen.value = true;
}

const activeMatch = computed(() => {
  if (!activeMatchId.value)
    return null;
  return planStore.matches[activeMatchId.value] || null;
});

const candidateMembers = computed(() => {
  if (!activeMatch.value)
    return [];

  const helperTeamId = activeMatch.value.helperTeamId;
  let list = planStore.membersList;

  if (memberListTab.value === "team" && helperTeamId) {
    list = list.filter(m => m.teamIds.includes(helperTeamId));
  }

  const role = activeSlot.value ? getRole(activeSlot.value.roleId) : null;
  const reqSkill = role?.requiredSkillId;

  // Sort qualified members to the top
  return [...list].sort((a, b) => {
    if (!reqSkill)
      return a.name.localeCompare(b.name);
    const aHas = a.skillIds.includes(reqSkill) ? 1 : 0;
    const bHas = b.skillIds.includes(reqSkill) ? 1 : 0;
    if (aHas !== bHas)
      return bHas - aHas;
    return a.name.localeCompare(b.name);
  });
});

function confirmAssignment() {
  if (!activeMatchId.value || !activeSlot.value)
    return;

  planStore.assignMemberToSlot(
    activeMatchId.value,
    activeSlot.value.id,
    selectedMemberId.value,
    customHelperInput.value.trim() || null,
  );

  isAssignmentModalOpen.value = false;
  toast.add({
    title: "Slot Updated",
    description: "Helper duty assignment updated successfully.",
    color: "success",
  });
}

function handleClearActiveSlot() {
  if (!activeMatchId.value || !activeSlot.value)
    return;
  planStore.assignMemberToSlot(activeMatchId.value, activeSlot.value.id, null, null);
  isAssignmentModalOpen.value = false;
}

function handleAutoStaff(matchId: string) {
  planStore.autoAssignMatchSlots(matchId);
  toast.add({
    title: "Auto-Staff Complete",
    description: "Unassigned slots filled from team roster.",
    color: "info",
  });
}

function handleClearMatch(matchId: string) {
  planStore.clearMatchSlots(matchId);
  toast.add({
    title: "Slots Cleared",
    description: "All duty slots for this match have been reset.",
    color: "neutral",
  });
}

async function handleSavePlan() {
  await planStore.savePlan();
  if (planStore.error) {
    toast.add({
      title: "Save Failed",
      description: planStore.error,
      color: "error",
    });
  }
  else {
    toast.add({
      title: "Plan Saved",
      description: "All assignment changes synced to server.",
      color: "success",
    });
  }
}
</script>

<template>
  <UContainer class="py-8 md:py-12 max-w-5xl space-y-8 pb-32">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
      <div class="space-y-1">
        <h1 class="text-3xl font-extrabold text-on-surface tracking-tight">
          Duty Assignments
        </h1>
        <p class="text-sm text-neutral-500">
          Assign responsible helper teams and distribute individual duties across matches.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          to="/dashboard"
          icon="i-lucide-arrow-left"
          variant="ghost"
          class="rounded-full"
        >
          View Schedule
        </UButton>
        <UButton
          icon="i-lucide-save"
          color="primary"
          class="rounded-full"
          :loading="planStore.isLoading"
          @click="handleSavePlan"
        >
          Save Plan
        </UButton>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="p-4 rounded-2xl bg-surface-container-low border border-neutral-200 dark:border-neutral-800 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
        <div class="sm:col-span-5">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search team or match..."
            size="md"
            class="w-full"
            clearable
          />
        </div>

        <div class="sm:col-span-4">
          <select
            v-model="selectedGamedayDate"
            class="w-full text-xs font-semibold rounded-lg bg-surface-container-lowest border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option v-for="opt in gamedayDateOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="sm:col-span-3 flex items-center justify-between sm:justify-end gap-4">
          <div class="flex items-center gap-2">
            <USwitch
              id="filter-unassigned"
              v-model="onlyUnassigned"
            />
            <label for="filter-unassigned" class="text-xs font-medium cursor-pointer">
              Unassigned
            </label>
          </div>

          <span class="text-xs text-neutral-500">
            {{ filteredMatches.length }} matches
          </span>
        </div>
      </div>
    </div>

    <!-- Match Duty Assignment Cards -->
    <div v-if="filteredMatches.length > 0" class="space-y-6">
      <div
        v-for="{ match, gamedayDate } in filteredMatches"
        :key="match.id"
        class="bg-surface-container-low rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden p-5 space-y-5"
      >
        <!-- Match Header & Helper Team Selector -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div class="space-y-1">
            <div class="flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <span v-if="gamedayDate" class="flex items-center gap-1">
                <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5 text-primary" />
                {{ formatDate(gamedayDate) }}
              </span>
              <span>•</span>
              <span class="font-mono text-primary">{{ formatMatchTime(match.time) }}</span>
            </div>
            <div class="text-xl font-bold text-on-surface">
              <span>{{ planStore.teams[match.homeTeamId]?.name || match.homeTeamId }}</span>
              <span class="mx-2 text-neutral-400 font-normal">vs</span>
              <span class="text-neutral-600 dark:text-neutral-300">{{ match.awayTeamName }}</span>
            </div>
          </div>

          <!-- Helper Team Dropdown & Auto-Staff Action -->
          <div class="flex flex-col sm:items-end gap-2">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Duty Team:</span>
                <select
                  :value="match.helperTeamId || ''"
                  class="text-xs font-semibold rounded-lg bg-surface-container-lowest border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  @change="(e: any) => planStore.assignHelperTeam(match.id, e.target.value)"
                >
                  <option v-for="opt in teamOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div class="flex items-center gap-1.5">
                <UButton
                  size="xs"
                  variant="soft"
                  color="secondary"
                  icon="i-lucide-wand-sparkles"
                  @click="handleAutoStaff(match.id)"
                >
                  Auto-Staff
                </UButton>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-rotate-ccw"
                  @click="handleClearMatch(match.id)"
                >
                  Reset
                </UButton>
              </div>
            </div>

            <!-- Smart Helper Team Suggestions (Based on Gameday Proximity) -->
            <div
              v-if="!match.helperTeamId && getSuggestedHelperTeams(match).length > 0"
              class="flex flex-wrap items-center gap-1.5"
            >
              <span class="text-[10px] text-secondary font-bold uppercase flex items-center gap-1">
                <UIcon name="i-lucide-sparkles" class="w-3 h-3" />
                Suggested:
              </span>
              <UButton
                v-for="suggestedTeamId in getSuggestedHelperTeams(match)"
                :key="suggestedTeamId"
                size="xs"
                variant="subtle"
                color="secondary"
                class="rounded-md text-[10px] py-0.5 px-2"
                @click="planStore.assignHelperTeam(match.id, suggestedTeamId)"
              >
                + {{ planStore.teams[suggestedTeamId]?.name || suggestedTeamId }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Duty Slots Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="slot in match.slots"
            :key="slot.id"
            class="p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3"
            :class="[
              getMemberName(slot)
                ? 'bg-surface-container-lowest border-neutral-200 dark:border-neutral-800 hover:border-primary/50'
                : 'bg-amber-500/5 border-dashed border-amber-500/30 hover:border-amber-500',
            ]"
            @click="openAssignmentModal(match.id, slot)"
          >
            <!-- Slot Role Header -->
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-0.5">
                <span class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                  {{ getRoleName(slot.roleId) }}
                </span>
                <span
                  v-if="getRole(slot.roleId)?.requiredSkillId"
                  class="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 font-medium"
                >
                  <UIcon name="i-lucide-award" class="w-3 h-3" />
                  Requires {{ getRole(slot.roleId)?.requiredSkillId }}
                </span>
              </div>
              <UIcon
                name="i-lucide-pencil"
                class="w-3.5 h-3.5 text-neutral-400 shrink-0"
              />
            </div>

            <!-- Slot Assigned Person -->
            <div class="pt-1">
              <div v-if="getMemberName(slot)" class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {{ getMemberName(slot)?.substring(0, 1) }}
                </div>
                <span class="text-sm font-semibold text-on-surface truncate">
                  {{ getMemberName(slot) }}
                </span>
              </div>
              <div v-else class="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                <UIcon name="i-lucide-user-plus" class="w-4 h-4" />
                <span>Assign volunteer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16 p-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
      <UIcon name="i-lucide-search-x" class="w-12 h-12 mx-auto text-neutral-400 mb-3" />
      <h3 class="text-lg font-bold text-on-surface">
        No matches match the filters
      </h3>
      <p class="text-sm text-neutral-500 mt-1">
        Try adjusting your search criteria or toggle off unassigned filters.
      </p>
      <UButton
        class="mt-4"
        variant="ghost"
        color="primary"
        @click="searchQuery = ''; selectedGamedayDate = ''; onlyUnassigned = false"
      >
        Clear filters
      </UButton>
    </div>

    <!-- Floating Bottom Save Bar -->
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface-container-high/90 backdrop-blur-md shadow-2xl border border-neutral-200 dark:border-neutral-700 rounded-full px-6 py-3 flex items-center gap-4 max-w-lg w-full">
      <div class="grow text-xs text-on-surface font-medium truncate">
        <span class="font-bold">Plan:</span> {{ planStore.plan?.club.name || 'Helper Plan' }}
      </div>
      <UButton
        size="sm"
        color="primary"
        icon="i-lucide-save"
        class="rounded-full shrink-0"
        :loading="planStore.isLoading"
        @click="handleSavePlan"
      >
        Save Changes
      </UButton>
    </div>

    <!-- Slot Assignment Modal -->
    <UModal v-model:open="isAssignmentModalOpen" title="Assign Helper to Slot">
      <template #body>
        <div v-if="activeSlot && activeMatch" class="space-y-6">
          <!-- Role Details Header -->
          <div class="p-3.5 rounded-xl bg-surface-container border border-neutral-200 dark:border-neutral-800 space-y-1">
            <div class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Selected Duty
            </div>
            <div class="text-base font-bold text-on-surface">
              {{ getRoleName(activeSlot.roleId) }}
            </div>
            <div v-if="getRole(activeSlot.roleId)?.requiredSkillId" class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
              <UIcon name="i-lucide-award" class="w-4 h-4" />
              Requires {{ getRole(activeSlot.roleId)?.requiredSkillId }} license
            </div>
          </div>

          <!-- Tab Selection: Helper Team vs All Club Members -->
          <div class="flex rounded-lg bg-surface-container p-1 text-xs font-semibold">
            <button
              type="button"
              class="flex-1 py-1.5 rounded-md transition-all"
              :class="memberListTab === 'team' ? 'bg-surface text-primary shadow-xs' : 'text-neutral-500 hover:text-on-surface'"
              @click="memberListTab = 'team'"
            >
              Assigned Team Roster ({{ planStore.teams[activeMatch.helperTeamId || '']?.name || 'No Team' }})
            </button>
            <button
              type="button"
              class="flex-1 py-1.5 rounded-md transition-all"
              :class="memberListTab === 'all' ? 'bg-surface text-primary shadow-xs' : 'text-neutral-500 hover:text-on-surface'"
              @click="memberListTab = 'all'"
            >
              All Club Members
            </button>
          </div>

          <!-- Members List Picker -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-neutral-500 uppercase tracking-wider">Select Member</label>
            <div class="max-h-56 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1">
              <div
                v-for="member in candidateMembers"
                :key="member.id"
                class="p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                :class="[
                  selectedMemberId === member.id
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60',
                ]"
                @click="selectedMemberId = member.id; customHelperInput = ''"
              >
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 text-xs flex items-center justify-center font-bold">
                    {{ member.name.substring(0, 1) }}
                  </div>
                  <span class="text-sm">{{ member.name }}</span>
                </div>

                <!-- License Badges -->
                <div class="flex gap-1">
                  <UBadge
                    v-if="member.skillIds.includes('referee')"
                    size="xs"
                    color="success"
                    variant="subtle"
                  >
                    Ref
                  </UBadge>
                  <UBadge
                    v-if="member.skillIds.includes('esb')"
                    size="xs"
                    color="info"
                    variant="subtle"
                  >
                    ESB
                  </UBadge>
                </div>
              </div>

              <div v-if="candidateMembers.length === 0" class="p-4 text-center text-xs text-neutral-400">
                No members found in this roster.
              </div>
            </div>
          </div>

          <!-- Custom Non-Member Helper Input -->
          <div class="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <UFormField label="Or Custom Guest / Volunteer Name" description="For non-members or parents without an account">
              <UInput
                v-model="customHelperInput"
                placeholder="e.g. Parent of Max, Guest Volunteer"
                class="w-full"
                @input="selectedMemberId = null"
              />
            </UFormField>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <UButton
            variant="ghost"
            color="error"
            size="sm"
            @click="handleClearActiveSlot"
          >
            Clear Slot
          </UButton>

          <div class="flex gap-2">
            <UButton
              variant="outline"
              color="neutral"
              size="sm"
              @click="isAssignmentModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              size="sm"
              color="primary"
              :disabled="!selectedMemberId && !customHelperInput.trim()"
              @click="confirmAssignment"
            >
              Confirm Assignment
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
