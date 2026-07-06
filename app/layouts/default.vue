<script lang="ts" setup>
const { t } = useI18n();
const q = ref("");

const items = computed(() => [
  { label: t("nav.home"), icon: "i-lucide-home", to: "/" },
  { label: t("nav.teams"), icon: "i-lucide-users", to: "/teams" },
  { label: t("nav.schedule"), icon: "i-lucide-calendar-days", to: "/schedule" },
  { label: t("nav.table"), icon: "i-lucide-table", to: "/table" },
  { label: t("nav.stats"), icon: "i-lucide-bar-chart-2", to: "/stats" },
]);
</script>

<template>
  <div>
    <UHeader title="Helperplan" :toggle="false">
      <template #right>
        <UInput
          id="search-bar-input" v-model="q" icon="i-lucide-search" :placeholder="$t('common.search')" autofocus size="xl"
          class=""
        />
        <LanguageSwitcher />
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
