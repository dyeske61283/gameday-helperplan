<script setup lang="ts">
import type { UnsavedPlanChoice } from "../utils/unsaved-plan";
import { resolveUnsavedPlanChoice } from "../utils/unsaved-plan";

const planStore = usePlanStore();
const router = useRouter();
const { t } = useI18n();
const isNavigationPromptOpen = ref(false);
const conflictChoices = ref<Record<string, "local" | "remote">>({});
const hasAllConflictChoices = computed(() => planStore.mergeConflicts.every(conflict => conflictChoices.value[conflict.path]));
let finishDecision: ((choice: UnsavedPlanChoice) => void) | undefined;
let removeNavigationGuard: (() => void) | undefined;

function requestNavigationChoice(): Promise<UnsavedPlanChoice> {
  isNavigationPromptOpen.value = true;
  return new Promise(resolve => finishDecision = resolve);
}

function chooseNavigation(choice: UnsavedPlanChoice) {
  isNavigationPromptOpen.value = false;
  finishDecision?.(choice);
  finishDecision = undefined;
}

function formatConflictValue(value: unknown) {
  if (value === undefined)
    return t("ui.deletedValue");
  if (value instanceof Date)
    return value.toLocaleString();
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

watch(() => planStore.mergeConflicts, () => conflictChoices.value = {});

onMounted(() => {
  removeNavigationGuard = router.beforeEach(async (to, from) => {
    if (!planStore.isDirty || to.fullPath === from.fullPath || /^\/plans\/[^/]+\/setup$/.test(from.path))
      return true;
    const choice = await requestNavigationChoice();
    return resolveUnsavedPlanChoice(choice, () => planStore.savePlan(), () => planStore.discardLocalEdits());
  });
});

onBeforeUnmount(() => removeNavigationGuard?.());
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
      <div v-if="planStore.mergeConflicts.length" class="max-h-72 space-y-3 overflow-y-auto rounded-md border border-warning/30 p-3">
        <div v-for="(conflict, index) in planStore.mergeConflicts" :key="conflict.path" class="space-y-2 border-b border-warning/20 pb-3 last:border-0 last:pb-0">
          <p class="font-semibold">
            {{ $t("ui.conflictField", { path: conflict.path }) }}
          </p>
          <dl class="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            <dt class="font-medium">
              {{ $t("ui.baseValue") }}
            </dt><dd class="break-words">
              {{ formatConflictValue(conflict.base) }}
            </dd>
            <dt class="font-medium">
              {{ $t("ui.localValue") }}
            </dt><dd class="break-words">
              {{ formatConflictValue(conflict.local) }}
            </dd>
            <dt class="font-medium">
              {{ $t("ui.remoteValue") }}
            </dt><dd class="break-words">
              {{ formatConflictValue(conflict.remote) }}
            </dd>
          </dl>
          <label :for="`conflict-choice-${index}`" class="text-sm font-medium">{{ $t("ui.chooseResolution") }}</label>
          <select :id="`conflict-choice-${index}`" v-model="conflictChoices[conflict.path]" class="rounded-md border bg-surface px-2 py-1 text-sm">
            <option value="">
              {{ $t("ui.chooseResolution") }}
            </option>
            <option value="local">
              {{ $t("ui.useLocalValue") }}
            </option>
            <option value="remote">
              {{ $t("ui.useRemoteValue") }}
            </option>
          </select>
        </div>
      </div>
      <div role="group" :aria-label="$t('ui.conflictActions')" class="flex flex-wrap gap-2">
        <UButton variant="outline" :disabled="planStore.isLoading" @click="planStore.reloadRemote">
          {{ $t("ui.reloadRemote") }}
        </UButton>
        <UButton :loading="planStore.isLoading" @click="planStore.retryLocal">
          {{ $t("ui.keepLocalAndRetry") }}
        </UButton>
        <UButton :disabled="!hasAllConflictChoices || planStore.isLoading" :loading="planStore.isLoading" @click="planStore.retryWithChoices(conflictChoices)">
          {{ $t("ui.applyConflictChoices") }}
        </UButton>
      </div>
    </section>
    <div v-else-if="planStore.isDirty" role="status" aria-live="polite" class="mx-auto mt-3 flex w-full max-w-5xl items-center justify-between gap-3 px-4 text-sm text-warning">
      <span>{{ $t("ui.unsavedPlanEdits") }}</span>
      <UButton v-if="planStore.error" size="xs" variant="outline" :loading="planStore.isLoading" @click="() => planStore.savePlan()">
        {{ $t("ui.retrySave") }}
      </UButton>
    </div>
    <UModal v-model:open="isNavigationPromptOpen" :title="$t('ui.unsavedPlanTitle')" :close="false" @update:open="open => !open && chooseNavigation('stay')">
      <template #body>
        <p>{{ $t("ui.unsavedNavigationMessage") }}</p>
      </template>
      <template #footer>
        <div role="group" :aria-label="$t('ui.unsavedPlanActions')" class="flex flex-wrap justify-end gap-2">
          <UButton variant="outline" @click="chooseNavigation('stay')">
            {{ $t("ui.stayOnPage") }}
          </UButton>
          <UButton color="error" variant="outline" @click="chooseNavigation('discard')">
            {{ $t("ui.discardAndLeave") }}
          </UButton>
          <UButton @click="chooseNavigation('save')">
            {{ $t("ui.saveAndLeave") }}
          </UButton>
        </div>
      </template>
    </UModal>
    <UMain class="flex-1 min-h-0">
      <slot />
    </UMain>
  </div>
</template>
