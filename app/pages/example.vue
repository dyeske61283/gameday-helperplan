<script lang="ts" setup>
import provideGameData from "@/utils/provide-game-data";

let gameData = await provideGameData();
gameData = gameData.sort((a, b) => a.dateAndTime.getTime() - b.dateAndTime.getTime());

const dateSeen = new Set();

function getDateLabel(item: Awaited<ReturnType<typeof provideGameData>>[number]) {
  dateSeen.add(item.dateAndTime.toDateString());
  return item.dateAndTime.toLocaleString();
}
</script>

<template>
  <UScrollArea
    v-slot="{ item }"
    :items="gameData"
    class="w-full h-[80vh-(var(--ui-header-height))] pt-4 mb-8"
    :ui="{ viewport: 'gap-8 flex-1 items-center', item: 'container' }"
  >
    <div v-if="!dateSeen.has(item.dateAndTime.toDateString())" class="flex flex-col items-center mb-8">
      <div class="kinetic-divider w-full max-w-lg mb-4" />
      <span class="text-on-surface-variant label-md uppercase tracking-widest text-xs">{{ getDateLabel(item) }}</span>
    </div>
    <GamedayEventCard :event="item" class="mb-8" />
  </UScrollArea>
</template>
