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
        Open your helper plan
      </h1>
      <p class="text-on-surface-variant">
        Did you receive a link?
      </p>
      <UButton v-if="hasResume" :to="`/plans/${planStore.resumeState!.id}`" size="lg" class="rounded-full">
        Resume plan
      </UButton>
      <p v-else class="text-sm text-neutral-500">
        A shared plan link is required to get started.
      </p>
    </main>
  </div>
</template>
