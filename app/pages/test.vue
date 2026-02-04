<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Handball Gameday Events
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Clean and concise event cards with all necessary information
        </p>
      </div>

      <GamedayEventCard :event="sampleEvent1" />

      <GamedayEventCard :event="sampleEvent2" />
    </div>
  </div>
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

const sampleEvent1: GamedayEvent = {
  dateAndTime: new Date('2026-02-15T18:30:00'),
  locationName: 'City Sports Arena',
  locationLink: 'https://maps.google.com',
  homeTeam: 'HC Wolves',
  awayTeam: 'Team Thunder',
  annotations: [
    'Derby match - expect high attendance',
    'Parking available at North entrance'
  ],
  helpingTeam: 'Youth Team A',
  helperAdmission: 'John Smith',
  helperSteward: 'Sarah Johnson',
  helperTimekeeper: 'Mike Davis',
  helperSecretary: 'Emma Wilson',
  helperWipe: 'Tom Brown'
};

const sampleEvent2: GamedayEvent = {
  dateAndTime: new Date('2026-02-22T16:00:00'),
  locationName: 'Regional Handball Center',
  locationLink: 'https://maps.google.com',
  homeTeam: 'HC Eagles',
  awayTeam: 'HC Wolves',
  annotations: [],
  helpingTeam: 'Youth Team B',
  helperAdmission: 'Anna Martinez',
  helperSteward: 'Chris Lee',
  helperTimekeeper: 'David Kim',
  helperSecretary: 'Lisa Chen',
  helperWipe: 'Mark Taylor'
};
</script>
