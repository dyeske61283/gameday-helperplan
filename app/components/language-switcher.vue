<script setup lang="ts">
import * as allLocales from "@nuxt/ui/locale";

const { locale, setLocale, locales } = useI18n();

const currentLocale = computed(() => allLocales[locale.value]);

const items = computed(() => Object.values(allLocales).filter(v => locales.value.some(vs => vs.code === v.code)));
</script>

<template>
  <USelectMenu
    :model-value="locale" :items="items"
    :content="{ align: 'start' }"
    value-key="code"
    label-key="code"
    variant="ghost"
    color="neutral"
    icon="i-lucide-languages"
    :search-input="false"
    class="rounded-full"
    :label="currentLocale.code"
    :ui="{
      value: 'uppercase',
      itemLabel: 'uppercase',
    }"
    @update:model-value="setLocale($event === 'de' ? 'de' : 'en')"
  />
</template>
