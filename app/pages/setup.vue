<script setup lang="ts">
useHead({ title: "Plan setup unavailable" });
</script>

<template>
  <UContainer class="py-16">
    <main class="mx-auto max-w-xl space-y-6 text-center">
      <h1 class="text-3xl font-bold text-on-surface">
        Plan setup is unavailable
      </h1>
      <p class="text-on-surface-variant">
        Creating a new plan is not available yet. Open a shared plan link to continue, or return to the start page.
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <UButton to="/" size="lg">
          Return to start
        </UButton>
      </div>
    </main>
  </UContainer>
</template>
