<script lang="ts" setup>
import { usePlanStore } from "../stores/plan";

definePageMeta({ layout: false });

const planStore = usePlanStore();
const hasResume = computed(() => !!planStore.resumeState?.id && !!planStore.resumeState.key);
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-surface">
    <main class="w-full max-w-lg space-y-6 text-center">
      <UIcon name="i-lucide-link-2" class="mx-auto size-12 text-primary" />
      <h1 class="text-3xl font-bold text-on-surface">
        {{ $t("ui.home.openPlan") }}
      </h1>
      <p class="text-on-surface-variant">
        {{ $t("ui.home.receivedLink") }}
      </p>
      <UButton v-if="hasResume" :to="`/plans/${planStore.resumeState!.id}#key=${planStore.resumeState!.key}`" size="lg" class="rounded-full">
        {{ $t("ui.home.resumePlan") }}
      </UButton>
      <UButton to="/setup" variant="outline" size="lg" class="rounded-full">
        {{ $t("ui.home.newPlan") }}
      </UButton>
      <p v-if="!hasResume" class="text-sm text-on-surface-variant">
        {{ $t("ui.home.linkRequired") }}
      </p>
    </main>
  </div>
</template>
