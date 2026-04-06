<script setup lang="ts">
type GamedayEvent = {
  dateAndTime: Date;
  locationName: string;
  locationLink: string;
  homeTeam: string;
  awayTeam: string;
  annotations: string[];
  helpingTeam: string;
  helperAdmission: string;
  helperSteward: string;
  helperTimekeeper: string;
  helperSecretary: string;
  helperWipe: string;
};

defineProps<{
  event: GamedayEvent;
}>();

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
</script>

<template>
  <UContainer>
    <UCard
      class="hover:shadow-lg transition-shadow duration-300 group bg-muted" :ui="{
        body: 'p-0',
        header: 'px-6 py-4',
      }"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-calendar" class="text-2xl text-primary" />
            <div>
              <p class="text-sm font-medium text-muted">
                {{ formatDate(event.dateAndTime) }}
              </p>
              <p class="text-lg font-bold text-foreground">
                {{ formatTime(event.dateAndTime) }}
              </p>
            </div>
          </div>
          <UButton
            v-if="event.locationLink" :to="event.locationLink" target="_blank" color="info" variant="ghost"
            icon="i-lucide-map-pin" :label="event.locationName" trailing
          />
          <div v-else class="flex items-center gap-2 text-info">
            <UIcon name="i-lucide-map-pin" />
            <span class="text-sm text-muted">{{ event.locationName }}</span>
          </div>
        </div>
      </template>

      <div class="px-6 py-5 bg-accent/5 dark:bg-surface">
        <div class="flex items-center justify-center gap-4">
          <div class="flex-1 text-right">
            <p class="text-2xl font-bold text-foreground">
              {{ event.homeTeam }}
            </p>
          </div>

          <div class="flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
            <span class="text-xl font-bold text-muted">VS</span>
          </div>

          <div class="flex-1 text-left">
            <p class="text-2xl font-bold text-foreground">
              {{ event.awayTeam }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="event.annotations && event.annotations.length > 0"
        class="px-6 py-3 bg-warning/10 dark:bg-warning/20 border-y border-warning/30"
      >
        <div class="flex items-start gap-2">
          <UIcon name="i-lucide-info" class="text-warning shrink-0 self-center" />
          <div class="flex-1">
            <p v-for="(annotation, index) in event.annotations" :key="index" class="text-sm text-warning-foreground">
              {{ annotation }}
            </p>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 space-y-3">
        <div class="flex items-center gap-2 text-muted">
          <UIcon name="i-lucide-users" class="text-primary" />
          <span class="text-sm font-medium">Helping Team:</span>
          <span class="text-sm font-semibold text-foreground">{{ event.helpingTeam }}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-muted">
          <HelperRow icon="i-lucide-ticket" label="Admission" :name="event.helperAdmission" />
          <HelperRow icon="i-lucide-shield-check" label="Steward" :name="event.helperSteward" />
          <HelperRow icon="i-lucide-clock" label="Timekeeper" :name="event.helperTimekeeper" />
          <HelperRow icon="i-lucide-square-pen" label="Secretary" :name="event.helperSecretary" />
          <HelperRow icon="i-lucide-sparkles" label="Wipe" :name="event.helperWipe" />
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
