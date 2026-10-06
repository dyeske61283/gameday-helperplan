<!-- Nuxt requires camelCase dynamic parameter names here. -->
<!-- eslint-disable unicorn/filename-case -->
<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();

const planLink = computed(() => `/plans/${route.params.planId}${route.hash}`);

useHead({ title: () => t("ui.editPlan") });
</script>

<template>
  <UContainer class="py-16">
    <section class="mx-auto max-w-xl space-y-6 text-center">
      <h1 class="text-3xl font-bold">
        {{ $t("ui.planSetup.unavailableTitle") }}
      </h1>
      <p class="text-on-surface-variant">
        {{ $t("ui.planSetup.unavailableDescription") }}
      </p>
      <UButton :to="planLink">
        {{ $t("ui.planSetup.returnToPlan") }}
      </UButton>
    </section>
  </UContainer>
</template>
