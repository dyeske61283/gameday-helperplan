<script setup lang="ts">
import type { Match } from "~/utils/plan-types";
import { usePlanStore } from "~/stores/plan";
import { buildCalendarLayout } from "~/utils/calendar-layout";
import { generateMemberICal } from "~/utils/ical-export";
import { createPlanLink } from "~/utils/plan-links";

const route = useRoute();
const planStore = usePlanStore();
const searchQuery = ref("");
const viewMode = ref<"timeline" | "calendar">("timeline");

usePlanInit();

const planId = computed(() => String(route.params.planId));
const shareUrl = computed(() => planStore.key ? createPlanLink(planId.value, planStore.key) : "");
const shareState = ref<"idle" | "copied" | "failed">("idle");

function planLink(path = "") {
  const pathname = `/plans/${planId.value}${path}`;
  return planStore.key ? createPlanLink(planId.value, planStore.key, pathname) : `${pathname}${route.hash}`;
}

async function copyShareUrl() {
  if (!shareUrl.value)
    return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    shareState.value = "copied";
  }
  catch {
    shareState.value = "failed";
  }
}

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
  if (!query) {
    return planStore.gamedaysList;
  }

  return planStore.gamedaysList.filter((gameday) => {
    const matches = gameday.matchIds
      .map(id => planStore.matches[id])
      .filter((m): m is Match => !!m);

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

const calendarLayout = computed(() => buildCalendarLayout(filteredGamedays.value));

function showTimeline(gamedayId?: string) {
  viewMode.value = "timeline";
  if (gamedayId)
    window.location.hash = `gameday-${gamedayId}`;
}

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
  <UContainer v-if="planStore.isLoading" class="py-16 text-center">
    {{ $t("ui.schedule.loadingPlan") }}
  </UContainer>
  <UContainer v-else-if="planStore.error" class="py-16 text-center space-y-4">
    <h1 class="text-2xl font-bold">
      {{ $t("ui.schedule.couldNotOpenThisPlan") }}
    </h1>
    <p class="text-error">
      {{ planStore.error }}
    </p>
    <UButton to="/">
      {{ $t("ui.schedule.returnStart") }}
    </UButton>
  </UContainer>
  <UContainer v-else-if="!planStore.plan" class="py-16 text-center space-y-4">
    <h1 class="text-2xl font-bold">
      {{ $t("ui.schedule.thisPlanIsUnavailable") }}
    </h1>
    <p class="text-sm text-neutral-500">
      {{ $t("ui.schedule.openAValidSharedPlanLinkToContinue") }}
    </p>
    <UButton to="/">
      {{ $t("ui.schedule.returnStart") }}
    </UButton>
  </UContainer>
  <UContainer v-else class="py-8 md:py-12 max-w-5xl space-y-8">
    <!-- Header with Club Info & Quick Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-extrabold text-on-surface tracking-tight">
            {{ planStore.plan.club.name }}
          </h1>
          <UBadge variant="subtle" color="primary" class="font-mono font-bold">
            {{ planStore.plan.season }}
          </UBadge>
        </div>
        <p class="text-sm text-neutral-500">
          {{ $t("ui.schedule.seasonFixturesHelperSchedulesAndRealTimeDutyTracking") }}
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <UButton
          :to="planLink('/assignments')"
          icon="i-lucide-id-card-lanyard"
          color="primary"
          class="rounded-full"
        >
          {{ $t("ui.schedule.manageDuties") }}
        </UButton>
        <UButton
          :to="planLink('/teams')"
          icon="i-lucide-users"
          variant="outline"
          class="rounded-full"
        >
          {{ $t("ui.schedule.teamsRoster") }}
        </UButton>
        <UButton
          :to="planLink('/setup')"
          icon="i-lucide-settings"
          variant="outline"
          class="rounded-full"
        >
          {{ $t("ui.editPlan") }}
        </UButton>
      </div>
    </div>

    <section v-if="shareUrl" aria-labelledby="share-heading" class="space-y-3 rounded-xl border border-primary/30 p-5">
      <h2 id="share-heading" class="text-xl font-bold">
        {{ $t("ui.planSetup.shareThisPlan") }}
      </h2>
      <div class="flex flex-col gap-2 sm:flex-row">
        <UInput :model-value="shareUrl" readonly aria-label="Share link" class="grow" /><UButton @click="copyShareUrl">
          {{ $t("ui.common.copyShareLink") }}
        </UButton>
      </div>
      <p v-if="shareState === 'copied'" role="status" class="text-sm text-success">
        {{ $t("ui.common.shareCopied") }}
      </p>
      <p v-else-if="shareState === 'failed'" role="alert" class="text-sm text-error">
        {{ $t("ui.common.shareCopyFailed") }}
      </p>
    </section>

    <!-- Quick Stats Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <div class="p-4 rounded-xl bg-surface-container-low border border-neutral-200 dark:border-neutral-800">
        <div class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {{ $t("ui.schedule.gamedays") }}
        </div>
        <div class="text-2xl font-black text-on-surface mt-1">
          {{ planStore.gamedaysList.length }}
        </div>
      </div>

      <div class="p-4 rounded-xl bg-surface-container-low border border-neutral-200 dark:border-neutral-800">
        <div class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {{ $t("ui.schedule.totalMatches") }}
        </div>
        <div class="text-2xl font-black text-on-surface mt-1">
          {{ totalMatchesCount }}
        </div>
      </div>

      <div class="p-4 rounded-xl bg-surface-container-low border border-neutral-200 dark:border-neutral-800 col-span-2 sm:col-span-1">
        <div class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {{ $t("ui.schedule.staffedDutySlots") }}
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
          :placeholder="$t('ui.filterDuties')"
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
    <div v-if="filteredGamedays.length > 0" class="flex justify-end">
      <div class="inline-flex rounded-xl border border-neutral-200 dark:border-neutral-800 p-1" role="group" :aria-label="$t('ui.scheduleView')">
        <UButton :variant="viewMode === 'timeline' ? 'soft' : 'ghost'" icon="i-lucide-list" size="sm" @click="viewMode = 'timeline'">
          {{ $t("ui.schedule.timeline") }}
        </UButton>
        <UButton :variant="viewMode === 'calendar' ? 'soft' : 'ghost'" icon="i-lucide-calendar-days" size="sm" @click="viewMode = 'calendar'">
          {{ $t("ui.schedule.calendar") }}
        </UButton>
      </div>
    </div>

    <div v-if="viewMode === 'timeline' && filteredGamedays.length > 0" class="space-y-6">
      <GamedayCard
        v-for="gameday in filteredGamedays"
        :id="`gameday-${gameday.id}`"
        :key="gameday.id"
        tabindex="-1"
        :gameday="gameday"
        :filter-member-id="matchedMember?.id"
        :location="planStore.locations.find(location => location.id === gameday.locationId)"
        :matches="planStore.matches"
        :roles="planStore.roles"
        :teams="planStore.teams"
        :members="planStore.members"
        :plan-id="planId"
        :plan-key="planStore.key"
      />
    </div>

    <div v-else-if="viewMode === 'calendar' && (calendarLayout.months.length || calendarLayout.invalid.length)" class="space-y-6">
      <section v-for="month in calendarLayout.months" :key="month.key" class="space-y-3">
        <h2 class="text-xl font-bold capitalize">
          {{ month.label }}
        </h2>
        <div class="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500 sm:gap-2">
          <span v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="py-1 font-semibold">
            {{ day }}
          </span>
          <span v-for="emptyDay in month.leadingEmptyDays" :key="`empty-${emptyDay}`" aria-hidden="true" />
          <div v-for="day in month.days" :id="`calendar-${day.date}`" :key="day.date" class="min-h-24 rounded-xl border border-primary/40 bg-primary/5 p-2 text-left text-on-surface hover:border-primary hover:bg-primary/10 sm:min-h-28">
            <span class="font-bold">{{ day.dayNumber }}</span>
            <span v-for="gameday in day.gamedays" :key="gameday.id" class="mt-2 block truncate rounded-md bg-primary px-2 py-1 text-xs text-white">
              <a :href="`#gameday-${gameday.id}`" class="block focus:outline-2 focus:outline-offset-2 focus:outline-primary" @click.prevent="showTimeline(gameday.id)">
                {{ gameday.matchIds.length }} {{ gameday.matchIds.length === 1 ? 'match' : 'matches' }}
              </a>
            </span>
          </div>
        </div>
      </section>
      <div v-if="calendarLayout.invalid.length" class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
        <p>{{ calendarLayout.invalid.length }} gameday{{ calendarLayout.invalid.length === 1 ? '' : 's' }} have an invalid date and cannot be placed on the calendar.</p>
        <UButton class="mt-3" size="sm" variant="outline" color="warning" @click="showTimeline()">
          {{ $t("ui.schedule.showTimeline") }}
        </UButton>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16 p-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
      <UIcon name="i-lucide-search-x" class="w-12 h-12 mx-auto text-neutral-400 mb-3" />
      <h3 class="text-lg font-bold text-on-surface">
        {{ $t("ui.schedule.noGamedaysFound") }}
      </h3>
      <p class="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
        {{ $t("ui.schedule.noMatchesOrDutyAssignmentsMatchYourCurrentSearchQuery") }}
      </p>
      <UButton
        class="mt-4"
        variant="ghost"
        color="primary"
        @click="searchQuery = ''"
      >
        {{ $t("ui.common.clearFilters") }}
      </UButton>
    </div>
  </UContainer>
</template>
