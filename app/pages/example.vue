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
    <USeparator v-if="!dateSeen.has(item.dateAndTime.toDateString())" class="mb-4" :label="getDateLabel(item)" />
    <GamedayEventCard :event="item" />
  </UScrollArea>
</template>
