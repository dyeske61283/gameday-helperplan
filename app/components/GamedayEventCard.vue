<template>
  <UCard
    class="max-w-2xl hover:shadow-lg transition-shadow duration-300 group"
    :ui="{
      body: 'p-0' ,
      header: 'px-6 py-4' 
    }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-calendar" class="text-2xl text-primary" />
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
              {{ formatDate(event.dateAndTime) }}
            </p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">
              {{ formatTime(event.dateAndTime) }}
            </p>
          </div>
        </div>
        <UButton
          v-if="event.locationLink"
          :to="event.locationLink"
          target="_blank"
          color="neutral"
          variant="soft"
          icon="i-lucide-map-pin"
          :label="event.locationName"
          trailing
        />
        <div v-else class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <UIcon name="i-lucide-map-pin" />
          <span class="text-sm">{{ event.locationName }}</span>
        </div>
      </div>
    </template>

    <div class="px-6 py-5 bg-linear-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-700">
      <div class="flex items-center justify-center gap-4">
        <div class="flex-1 text-right">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ event.homeTeam }}
          </p>
        </div>

        <div class="flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
          <span class="text-xl font-bold text-gray-600 dark:text-gray-300">VS</span>
        </div>

        <div class="flex-1 text-left">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ event.awayTeam }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="event.annotations && event.annotations.length > 0" class="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-y border-amber-200 dark:border-amber-800">
      <div class="flex items-start gap-2">
        <UIcon name="i-lucide-info" class="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div class="flex-1">
          <p v-for="(annotation, index) in event.annotations" :key="index" class="text-sm text-amber-800 dark:text-amber-200">
            {{ annotation }}
          </p>
        </div>
      </div>
    </div>

    <div class="px-6 py-4 space-y-3">
      <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <UIcon name="i-lucide-users" class="text-blue-600 dark:text-blue-400" />
        <span class="text-sm font-medium">Helping Team:</span>
        <span class="text-sm font-semibold">{{ event.helpingTeam }}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <HelperRow
          icon="i-lucide-ticket"
          label="Admission"
          :name="event.helperAdmission"
        />
        <HelperRow
          icon="i-lucide-shield-check"
          label="Steward"
          :name="event.helperSteward"
        />
        <HelperRow
          icon="i-lucide-clock"
          label="Timekeeper"
          :name="event.helperTimekeeper"
        />
        <HelperRow
          icon="i-lucide-square-pen"
          label="Secretary"
          :name="event.helperSecretary"
        />
        <HelperRow
          icon="i-lucide-sparkles"
          label="Wipe"
          :name="event.helperWipe"
        />
      </div>
    </div>
  </UCard>
</template>

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
}

defineProps<{
  event: GamedayEvent;
}>();

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};
</script>
