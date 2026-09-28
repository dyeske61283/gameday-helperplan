<!-- Nuxt requires camelCase dynamic parameter names here. -->
<!-- eslint-disable unicorn/filename-case -->
<script setup lang="ts">
const route = useRoute();
const planLink = computed(() => `/plans/${route.params.planId}${route.hash}`);

useHead({ title: "Plan setup unavailable" });
</script>

<template>
  <UContainer class="py-16">
    <main class="mx-auto max-w-xl space-y-6 text-center">
      <h1 class="text-3xl font-bold text-on-surface">
        Plan setup is unavailable
      </h1>
      <p class="text-on-surface-variant">
        Editing this plan is not available yet. Return to the plan schedule to view its fixtures and helper duties.
      </p>
      <UButton :to="planLink" size="lg">
        Open plan schedule
      </UButton>
    </main>
  </UContainer>
</template>
