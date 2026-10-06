<script setup lang="ts">
const { t } = useI18n();

useHead({ title: () => t("ui.setUpPlan") });
</script>

<template>
  <UContainer class="py-16">
    <section class="mx-auto max-w-xl space-y-6 text-center">
      <h1 class="text-3xl font-bold">
        {{ $t("ui.setup.unavailableTitle") }}
      </h1>
      <p class="text-on-surface-variant">
        {{ $t("ui.setup.unavailableDescription") }}
      </p>
      <UButton to="/">
        {{ $t("ui.common.backToHome") }}
      </UButton>
    </section>
  </UContainer>
</template>
