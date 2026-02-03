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
    :ui="{viewport: 'gap-2'}"
  >
    <UPageCard
      v-bind="item"
      :variant="index % 2 === 0 ? 'soft' : 'outline'"
      :key="index"
      :title="item.homeTeam"
      :description="item.locationName"
      class=""
    >
    <template #header>
      <div class="text-lg font-semibold">
        {{ item.homeTeam }}
      </div>
    </template>
    <template #body>
      <div class="text-base">
        Helfer: {{ item.helpingTeam }}
      </div>
    </template>
    <template #footer>
      <div class="text-sm text-secondary">
        {{ new Date(item.dateAndTime).toLocaleString() }}
      </div>
    </template>
    </UPageCard>
  </UScrollArea>
</template>