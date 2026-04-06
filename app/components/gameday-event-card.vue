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
      class="hover:kinetic-shadow transition-shadow duration-300 group bg-surface-container-lowest rounded-lg overflow-hidden" :ui="{
        body: 'p-0',
        header: 'px-6 py-4 bg-surface-container-low border-none',
        footer: 'px-6 py-4 border-none',
      }"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-calendar" class="text-2xl text-primary" />
            <div>
              <p class="text-sm font-medium text-on-surface-variant label-md">
                {{ formatDate(event.dateAndTime) }}
              </p>
              <p class="text-lg font-bold text-on-surface title-md">
                {{ formatTime(event.dateAndTime) }}
              </p>
            </div>
          </div>
          <UButton
            v-if="event.locationLink" :to="event.locationLink" target="_blank" color="neutral" variant="subtle"
            icon="i-lucide-map-pin" :label="event.locationName" trailing class="rounded-full label-md uppercase"
          />
          <div v-else class="flex items-center gap-2 text-on-surface-variant">
            <UIcon name="i-lucide-map-pin" />
            <span class="text-sm label-md">{{ event.locationName }}</span>
          </div>
        </div>
      </template>

      <div class="px-6 py-8 bg-surface-container-lowest">
        <div class="flex items-center justify-center gap-8">
          <div class="flex-1 text-right">
            <p class="text-2xl font-bold text-on-surface headline-lg">
              {{ event.homeTeam }}
            </p>
          </div>

          <div class="flex items-center justify-center px-4 py-2 bg-surface-inverse rounded-lg shadow-sm">
            <span class="text-xl font-bold text-white display-md !text-2xl">VS</span>
          </div>

          <div class="flex-1 text-left">
            <p class="text-2xl font-bold text-on-surface headline-lg">
              {{ event.awayTeam }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="event.annotations && event.annotations.length > 0"
        class="px-6 py-3 bg-secondary-fixed text-on-surface"
      >
        <div class="flex items-start gap-2">
          <UIcon name="i-lucide-info" class="text-secondary-fixed-variant shrink-0 self-center" />
          <div class="flex-1">
            <p v-for="(annotation, index) in event.annotations" :key="index" class="text-sm label-md">
              {{ annotation }}
            </p>
          </div>
        </div>
      </div>

      <div class="px-6 py-6 space-y-4 bg-surface-container-lowest">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-users" class="text-primary" />
          <span class="text-sm font-medium text-on-surface-variant label-md">Helping Team:</span>
          <span class="text-sm font-semibold text-on-surface label-md">{{ event.helpingTeam }}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
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
