<script setup lang="ts">
import type { Gameday, Location, Match, Member, Role, Slot, Team } from "../utils/plan-types";
import { createPlanLink } from "../utils/plan-links";

const props = defineProps<{
  gameday: Gameday;
  filterMemberId?: string;
  location?: Location;
  matches: Record<string, Match>;
  roles: Role[];
  teams: Record<string, Team>;
  members: Record<string, Member>;
  planId: string;
  planKey?: string | null;
}>();
const { t } = useI18n();

const gamedayMatches = computed<Match[]>(() => {
  return props.gameday.matchIds
    .map(id => props.matches[id])
    .filter((m): m is Match => !!m);
});

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
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

function getRoleName(roleId: string) {
  const role = props.roles.find(r => r.id === roleId);
  return role?.name || roleId;
}

function getMemberName(slot: Slot) {
  if (slot.assignedMemberId && props.members[slot.assignedMemberId]) {
    return props.members[slot.assignedMemberId]?.name || t("common.unassigned");
  }
  return slot.customHelperName || t("common.unassigned");
}

function isAssigned(slot: Slot) {
  return !!slot.assignedMemberId || !!slot.customHelperName;
}

function matchLink(matchId: string) {
  const pathname = `/plans/${props.planId}/matches/${matchId}`;
  return props.planKey ? createPlanLink(props.planId, props.planKey, pathname) : pathname;
}
</script>

<template>
  <div class="bg-surface-container-low rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
    <!-- Gameday Header Banner -->
    <div class="p-5 bg-surface-container border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-calendar" class="text-primary w-5 h-5" />
          <h2 class="text-lg font-bold text-on-surface">
            {{ formatDate(gameday.date) }}
          </h2>
        </div>
        <div class="flex items-center gap-2 text-xs text-on-surface-variant mt-1">
          <span v-if="location" class="flex items-center gap-1">
            <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 text-secondary" />
            <a
              v-if="location.link"
              :href="location.link"
              target="_blank"
              rel="noopener noreferrer"
              class="underline hover:text-primary"
            >
              {{ location.name }}
            </a>
            <span v-else>{{ location.name }}</span>
          </span>
          <span v-if="gameday.openingTime" class="ml-2">
            {{ t("dashboard.opens") }}: {{ gameday.openingTime }}
          </span>
        </div>
      </div>
      <UBadge variant="soft" color="primary" size="sm">
        {{ gamedayMatches.length }} {{ gamedayMatches.length === 1 ? t("dashboard.match") : t("dashboard.matches") }}
      </UBadge>
    </div>

    <!-- Match Rows -->
    <div class="divide-y divide-neutral-100 dark:divide-neutral-800/60 p-4 space-y-4">
      <div
        v-for="match in gamedayMatches"
        :key="match.id"
        class="pt-3 first:pt-0 space-y-3"
      >
        <!-- Match Meta & Teams -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <NuxtLink :to="matchLink(match.id)" class="flex items-center gap-3 hover:text-primary">
            <div class="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-mono font-bold text-sm">
              {{ formatMatchTime(match.time) }}
            </div>
            <div class="font-bold text-on-surface">
              <span>{{ teams[match.homeTeamId]?.name || match.homeTeamId }}</span>
              <span class="mx-2 text-neutral-400 font-normal">{{ $t("ui.bulk.bulk_691a77cd21") }}</span>
              <span class="text-neutral-600 dark:text-neutral-300">{{ match.awayTeamName }}</span>
            </div>
          </NuxtLink>

          <!-- Helper Team Pill -->
          <div v-if="match.helperTeamId" class="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <UIcon name="i-lucide-shield" class="w-4 h-4 text-primary" />
            <span>{{ t("dashboard.duty_team") }}:</span>
            <span class="font-semibold text-primary">
              {{ teams[match.helperTeamId]?.name || match.helperTeamId }}
            </span>
          </div>
        </div>

        <!-- Duty Slots Pill Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
          <div
            v-for="slot in match.slots"
            :key="slot.id"
            class="flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors"
            :class="[
              isAssigned(slot)
                ? 'bg-surface-container-lowest border-neutral-200 dark:border-neutral-800'
                : 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400',
              filterMemberId && slot.assignedMemberId === filterMemberId
                ? 'ring-2 ring-primary ring-offset-1'
                : '',
            ]"
          >
            <div class="space-y-0.5 overflow-hidden pr-2">
              <span class="font-semibold block text-neutral-500 dark:text-neutral-400 text-[10px] uppercase tracking-wider">
                {{ getRoleName(slot.roleId) }}
              </span>
              <span
                class="font-medium truncate block"
                :class="isAssigned(slot) ? 'text-on-surface' : 'italic opacity-80'"
              >
                {{ getMemberName(slot) }}
              </span>
            </div>

            <!-- Assignment status -->
            <div class="shrink-0">
              <UBadge v-if="!isAssigned(slot)" size="xs" color="warning" variant="subtle">
                {{ t("dashboard.needed") }}
              </UBadge>
              <UBadge v-if="isAssigned(slot)" size="xs" color="success" variant="subtle">
                {{ $t("ui.bulk.bulk_e24e824b68") }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
