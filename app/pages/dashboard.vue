<script setup lang="ts">
import { usePlanStore } from "../stores/plan";
import { generateMemberICal } from "../utils/ical-export";

const planStore = usePlanStore();
const searchQuery = ref("");
const selectedTeamFilter = ref<string>("");

onMounted(() => {
  planStore.ensurePlanLoaded();
  planStore.initFromUrl();
});

// Computed active member match if search matches a member
const matchedMember = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query)
    return null;
  return planStore.membersList.find(m => m.name.toLowerCase().includes(query));
});

// Filtered Gamedays
const filteredGamedays = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const teamFilter = selectedTeamFilter.value;

  if (!query && !teamFilter) {
    return planStore.gamedaysList;
  }

  return planStore.gamedaysList.filter((gameday) => {
    const matches = gameday.matchIds
      .map(id => planStore.matches[id])
      .filter(Boolean);

    // Team Filter match
    if (teamFilter) {
      const hasTeam = matches.some(
        m => m.homeTeamId === teamFilter || m.helperTeamId === teamFilter,
      );
      if (!hasTeam)
        return false;
    }

    if (!query)
      return true;

    // Search query match in gameday date or location
    if (gameday.date.toLowerCase().includes(query))
      return true;

    // Match in team names or helper names
    return matches.some((match) => {
      const homeTeam = planStore.teams[match.homeTeamId]?.name?.toLowerCase() || "";
      const awayTeam = match.awayTeamName.toLowerCase();
      const helperTeam = planStore.teams[match.helperTeamId || ""]?.name?.toLowerCase() || "";

      if (homeTeam.includes(query) || awayTeam.includes(query) || helperTeam.includes(query)) {
        return true;
      }

      // Check slot assigned members
      return match.slots.some((slot) => {
        const memberName = slot.assignedMemberId
          ? planStore.members[slot.assignedMemberId]?.name?.toLowerCase() || ""
          : slot.customHelperName?.toLowerCase() || "";
        return memberName.includes(query);
      });
    });
  });
});

// Export iCal handler
function handleExportICal() {
  if (!matchedMember.value || !planStore.plan)
    return;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const icsContent = generateMemberICal(planStore.plan, matchedMember.value.id, shareUrl);

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `duties-${matchedMember.value.name.replace(/\s+/g, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Stats computed
const totalMatchesCount = computed(() => Object.keys(planStore.matches).length);
const totalAssignedSlots = computed(() => {
  let count = 0;
  for (const match of Object.values(planStore.matches)) {
    count += match.slots.filter(s => !!s.assignedMemberId || !!s.customHelperName).length;
  }
  return count;
});
</script>

<template>
  <UContainer class="py-8 md:py-12 max-w-5xl space-y-8">
    <!-- Header with Club Info & Quick Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-extrabold text-on-surface tracking-tight">
            {{ planStore.plan?.club.name || 'Gameday Schedule' }}
          </h1>
          <UBadge variant="subtle" color="primary" class="font-mono font-bold">
            {{ planStore.plan?.season || '2025/2026' }}
          </UBadge>
        </div>
        <p class="text-sm text-neutral-500">
          Season fixtures, helper schedules, and real-time duty tracking.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <UButton
          to="/assignments"
          icon="i-lucide-id-card-lanyard"
          color="primary"
          class="rounded-full"
        >
          Manage Duties
        </UButton>
        <UButton
          to="/team-list"
          icon="i-lucide-users"
          variant="outline"
          class="rounded-full"
        >
          Teams & Roster
        </UButton>
      </div>
    </div>

    <!-- Quick Stats Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <div class="p-4 rounded-xl bg-surface-container-low border border-neutral-200 dark:border-neutral-800">
        <div class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Gamedays
        </div>
        <div class="text-2xl font-black text-on-surface mt-1">
          {{ planStore.gamedaysList.length }}
        </div>
      </div>

      <div class="p-4 rounded-xl bg-surface-container-low border border-neutral-200 dark:border-neutral-800">
        <div class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Total Matches
        </div>
        <div class="text-2xl font-black text-on-surface mt-1">
          {{ totalMatchesCount }}
        </div>
      </div>

      <div class="p-4 rounded-xl bg-surface-container-low border border-neutral-200 dark:border-neutral-800 col-span-2 sm:col-span-1">
        <div class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Staffed Duty Slots
        </div>
        <div class="text-2xl font-black text-primary mt-1">
          {{ totalAssignedSlots }}
        </div>
      </div>
    </div>

    <!-- Filter & Personal "My Duties" Bar -->
    <div class="p-4 rounded-2xl bg-surface-container-low border border-neutral-200 dark:border-neutral-800 space-y-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Filter by your name, team, or date..."
          size="lg"
          class="grow"
          clearable
        />

        <UButton
          v-if="matchedMember"
          icon="i-lucide-calendar-arrow-down"
          color="secondary"
          variant="solid"
          class="shrink-0 rounded-xl"
          @click="handleExportICal"
        >
          Export {{ matchedMember.name }}'s Duties (.ics)
        </UButton>
      </div>

      <!-- Active Filter Helper Message -->
      <div v-if="matchedMember" class="text-xs text-secondary font-medium flex items-center gap-1.5">
        <UIcon name="i-lucide-sparkles" class="w-4 h-4" />
        Filtering duties for <strong>{{ matchedMember.name }}</strong>. Use the button above to sync to Apple Calendar or Google Calendar.
      </div>
    </div>

    <!-- Gamedays Chronological Timeline -->
    <div v-if="filteredGamedays.length > 0" class="space-y-6">
      <GamedayCard
        v-for="gameday in filteredGamedays"
        :key="gameday.id"
        :gameday="gameday"
        :filter-member-id="matchedMember?.id"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16 p-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
      <UIcon name="i-lucide-search-x" class="w-12 h-12 mx-auto text-neutral-400 mb-3" />
      <h3 class="text-lg font-bold text-on-surface">
        No gamedays found
      </h3>
      <p class="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
        No matches or duty assignments match your current search query.
      </p>
      <UButton
        class="mt-4"
        variant="ghost"
        color="primary"
        @click="searchQuery = ''; selectedTeamFilter = ''"
      >
        Clear filters
      </UButton>
    </div>
  </UContainer>
</template>
