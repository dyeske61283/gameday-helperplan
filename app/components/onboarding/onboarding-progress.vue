<script setup lang="ts">
defineProps<{
  current: number;
  total: number;
}>();
</script>

<template>
  <div class="flex items-center gap-4 w-full max-w-xs mx-auto">
    <div class="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
      <div
        class="h-full kinetic-gradient transition-all duration-500 ease-out"
        :style="{ width: `${(current / total) * 100}%` }"
      />
    </div>
    <span class="label-md whitespace-nowrap">
      {{ $t('onboarding.progress.step', { current, total }) }}
    </span>
  </div>
</template>
