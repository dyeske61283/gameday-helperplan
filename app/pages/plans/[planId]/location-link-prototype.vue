<script setup lang="ts">
import { usePlanStore } from "~/stores/plan";

const planStore = usePlanStore();
usePlanInit();
</script>

<template>
  <UContainer class="max-w-4xl space-y-6 py-8 md:py-12">
    <div v-if="planStore.isLoading" class="py-16 text-center">
      Loading plan…
    </div>
    <div v-else-if="!planStore.plan" class="py-16 text-center">
      <h1 class="text-2xl font-bold">
        Location link prototype
      </h1>
      <p class="mt-2 text-on-surface-variant">
        Open this page from a valid shared plan link.
      </p>
    </div>
    <template v-else>
      <header class="space-y-2">
        <p class="text-sm font-semibold uppercase tracking-wide text-primary">
          Throwaway UI prototype
        </p>
        <h1 class="text-3xl font-bold">
          Location link actions
        </h1>
        <p class="text-on-surface-variant">
          Compare a compact dialog with non-modal actions. These controls are not used by the live schedule.
        </p>
      </header>

      <article v-for="location in planStore.locations" :key="location.id" class="space-y-4 rounded-2xl border border-neutral-200 bg-surface-container-low p-4 sm:p-6 dark:border-neutral-800">
        <div>
          <h2 class="text-lg font-semibold">
            {{ location.name }}
          </h2>
          <p v-if="location.link" class="mt-1 break-all text-sm text-on-surface-variant">
            {{ location.link }}
          </p>
          <p v-else class="mt-1 text-sm text-on-surface-variant">
            No link configured; shown as plain text.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <section class="space-y-2 rounded-xl bg-surface-container p-4">
            <h3 class="font-semibold">
              Compact dialog
            </h3>
            <LocationLinkActions :location="location" variant="dialog" />
          </section>
          <section class="space-y-2 rounded-xl bg-surface-container p-4">
            <h3 class="font-semibold">
              Non-modal action menu
            </h3>
            <LocationLinkActions :location="location" variant="menu" />
          </section>
        </div>
      </article>
    </template>
  </UContainer>
</template>
