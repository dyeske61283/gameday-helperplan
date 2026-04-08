<script lang="ts" setup>
const q = ref("");

const items = [
  { label: "Home", icon: "i-lucide-home", to: "/" },
  { label: "Teams", icon: "i-lucide-users", to: "/teams" },
  { label: "Spielplan", icon: "i-lucide-calendar-days", to: "/schedule" },
  { label: "Tabelle", icon: "i-lucide-table", to: "/table" },
  { label: "Statistiken", icon: "i-lucide-bar-chart-2", to: "/stats" },
];
</script>

<template>
  <div>
    <UHeader title="Helperplan" :toggle="false">
      <template #right>
        <UInput
          id="search-bar-input" v-model="q" icon="i-lucide-search" placeholder="Suchen.." autofocus size="xl"
          class=""
        />
        <UColorModeButton />
      </template>
    </UHeader>
    <UMain>
      <slot />
    </UMain>
    <UFooter class="fixed bottom-0 left-0 right-0 z-50 border-t border-default bg-white dark:bg-gray-900 md:hidden">
      <UNavigationMenu
        :items="items" :ui="{
          root: 'fixed justify-between',
          item: 'py-0 gap-2 px-2',
          link: 'flex-col',
          linkLeadingIcon: 'size-6',
          linkLabel: 'text-[10px]/3 font-normal',
        }" class="w-full"
      />
    </UFooter>
  </div>
</template>
