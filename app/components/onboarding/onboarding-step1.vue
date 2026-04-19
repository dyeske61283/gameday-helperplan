<script setup lang="ts">
const store = usePlanStore();
</script>

<template>
  <div class="flex flex-col gap-8 text-center max-w-2xl mx-auto">
    <div class="space-y-4">
      <h2 class="display-md text-on-surface">
        {{ $t('onboarding.step1.title') }}
      </h2>
      <p class="body-md text-on-surface-variant">
        {{ $t('onboarding.step1.description') }}
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <UCard
        class="cursor-pointer transition-all hover:ring-2 hover:ring-primary group"
        :ui="{ body: { padding: 'p-8' } }"
        @click="store.setPath('manual')"
      >
        <div class="flex flex-col items-center gap-4">
          <div class="p-4 rounded-full bg-surface-container group-hover:bg-primary-container transition-colors">
            <UIcon name="i-lucide-pencil" class="size-8 text-primary" />
          </div>
          <div class="space-y-2">
            <h3 class="headline-sm text-on-surface">
              {{ $t('onboarding.step1.manual.title') }}
            </h3>
            <p class="label-md">
              {{ $t('onboarding.step1.manual.description') }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard
        class="cursor-pointer transition-all hover:ring-2 hover:ring-primary group"
        :ui="{ body: { padding: 'p-8' } }"
        @click="store.setPath('auto')"
      >
        <div class="flex flex-col items-center gap-4">
          <div class="p-4 rounded-full bg-surface-container group-hover:bg-primary-container transition-colors">
            <UIcon name="i-lucide-zap" class="size-8 text-primary" />
          </div>
          <div class="space-y-2">
            <h3 class="headline-sm text-on-surface">
              {{ $t('onboarding.step1.auto.title') }}
            </h3>
            <p class="label-md">
              {{ $t('onboarding.step1.auto.description') }}
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
