<script setup lang="ts">
const planStore = usePlanStore();
</script>

<template>
  <div class="min-h-screen overflow-x-hidden flex flex-col">
    <UHeader :title="$t('ui.brand')" :toggle="false">
      <template #right>
        <LanguageSwitcher />
        <UColorModeButton />
      </template>
    </UHeader>
    <section v-if="planStore.pendingUpdate" aria-labelledby="plan-conflict-title" class="mx-auto mt-4 flex w-full max-w-5xl flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p id="plan-conflict-title" role="alert" aria-live="assertive">
        {{ $t("ui.concurrentPlanChanges", { count: planStore.mergeConflicts.length }) }}
      </p>
      <div role="group" :aria-label="$t('ui.conflictActions')" class="flex flex-wrap gap-2">
        <UButton variant="outline" :disabled="planStore.isLoading" @click="planStore.reloadRemote">
          {{ $t("ui.reloadRemote") }}
        </UButton>
        <UButton :loading="planStore.isLoading" @click="planStore.retryLocal">
          {{ $t("ui.keepLocalAndRetry") }}
        </UButton>
      </div>
    </section>
    <div v-else-if="planStore.isDirty" role="status" aria-live="polite" class="mx-auto mt-3 flex w-full max-w-5xl items-center justify-between gap-3 px-4 text-sm text-warning">
      <span>{{ $t("ui.unsavedPlanEdits") }}</span>
      <UButton v-if="planStore.error" size="xs" variant="outline" :loading="planStore.isLoading" @click="() => planStore.savePlan()">
        {{ $t("ui.retrySave") }}
      </UButton>
    </div>
    <UMain class="flex-1 min-h-0">
      <slot />
    </UMain>
  </div>
</template>
