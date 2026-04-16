<script setup lang="ts">
const { locale, locales } = useI18n();

const currentLocale = computed(() => locales.value.find(l => l.code === locale.value));

const items = computed(() => [
  locales.value.map(l => ({
    label: l.name,
    onSelect: () => {
      locale.value = l.code;
    },
    icon: l.code === locale.value ? 'i-lucide-check' : undefined
  }))
]);
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      variant="ghost"
      color="neutral"
      icon="i-lucide-languages"
      class="rounded-full"
      :label="currentLocale?.name"
    />
  </UDropdownMenu>
</template>
