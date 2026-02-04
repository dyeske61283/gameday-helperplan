<script lang="ts" setup>

import provideGameData from '@/utils/provideGameData';
const gameData = await provideGameData();

const q = ref('');
</script>

<template>
  <UInput
    v-model="q"
    id ="search-bar-input"
    icon="i-lucide-search"
    placeholder="Suchen.."
    autofocus
    class="w-full fixed top-0 z-10 mt-2"
  />
  <UScrollArea
    v-slot="{ item, index }"
    :items="gameData"
    class="w-full h-[98vh] pt-12"
    :ui="{viewport: 'gap-2 space-y-8'}"
  >
    <GamedayEventCard :event="item" />
  </UScrollArea>
</template>