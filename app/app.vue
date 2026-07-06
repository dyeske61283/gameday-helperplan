<script setup lang="ts">
import * as locales from "@nuxt/ui/locale";

const { locale, t } = useI18n();

const lang = computed(() => locales[locale.value]?.code || "de");
const dir = computed(() => locales[locale.value]?.dir || "ltr");

useHead({
  title: computed(() => t("welcome")),
  htmlAttrs: {
    lang,
    dir,
  },
});
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtLayout>
      <NuxtRouteAnnouncer />
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
