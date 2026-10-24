<script setup lang="ts">
import type { Location } from "~/utils/plan-types";
import { copyToClipboard } from "~/utils/clipboard";

const props = defineProps<{
  location: Location;
  variant: "dialog" | "menu";
  instanceId?: string;
}>();

const { t } = useI18n();
const dialog = ref<HTMLDialogElement>();
const menuOpen = ref(false);
const copyMessage = ref("");
const copySucceeded = ref(false);
const instanceId = props.instanceId ?? props.location.id;
const menuId = `location-actions-${instanceId}`;
const dialogId = `location-dialog-${instanceId}`;
const dialogTitleId = `location-dialog-title-${instanceId}`;

function openDialog() {
  copyMessage.value = "";
  copySucceeded.value = false;
  dialog.value?.showModal();
}

async function copyLink() {
  const link = props.location.link;
  if (!link)
    return;
  copySucceeded.value = false;
  const copied = await copyToClipboard(link);
  copySucceeded.value = copied;
  copyMessage.value = copied ? t("ui.locationLinkActions.linkCopied") : t("ui.locationLinkActions.linkCopyFailed");
}
</script>

<template>
  <div>
    <template v-if="location.link && variant === 'dialog'">
      <button type="button" :class="$slots.trigger ? 'cursor-pointer text-left underline hover:text-primary' : 'rounded-lg border px-3 py-2 text-sm font-medium hover:bg-surface-container'" :aria-label="t('ui.locationLinkActions.openDialogActionsFor', { name: location.name })" aria-haspopup="dialog" :aria-controls="dialogId" @click="openDialog">
        <slot name="trigger">
          {{ t("ui.locationLinkActions.dialogActions") }}
        </slot>
      </button>
      <dialog
        :id="dialogId"
        ref="dialog"
        :aria-labelledby="dialogTitleId"
        class="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-neutral-200 bg-surface-container-low p-0 text-on-surface shadow-xl backdrop:bg-black/40 dark:border-neutral-700"
      >
        <div class="space-y-4 p-5">
          <div>
            <h3 :id="dialogTitleId" class="text-lg font-semibold">
              {{ location.name }}
            </h3>
            <p class="mt-1 text-sm text-on-surface-variant">
              {{ t("ui.locationLinkActions.chooseHowToUseLink") }}
            </p>
          </div>
          <div class="flex flex-col gap-2">
            <a :href="location.link" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between gap-3 rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:bg-primary/90">
              <span>{{ t("ui.locationLinkActions.openLink") }} <span class="sr-only">{{ t("ui.locationLinkActions.opensInNewTab") }}</span></span>
              <UIcon name="i-lucide-external-link" class="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
            <button type="button" class="flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-medium transition-colors" :class="copySucceeded ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100' : 'border-neutral-300 text-on-surface hover:bg-surface-container dark:border-neutral-700'" @click="copyLink">
              <UIcon :name="copySucceeded ? 'i-lucide-check' : 'i-lucide-copy'" class="h-4 w-4" aria-hidden="true" />
              {{ copySucceeded ? t("ui.locationLinkActions.copied") : t("ui.locationLinkActions.copyLink") }}
            </button>
          </div>
          <p role="status" aria-live="polite" class="min-h-5 text-sm text-on-surface-variant">
            {{ copyMessage }}
          </p>
          <button type="button" class="rounded-lg px-3 py-2 text-sm underline" @click="dialog?.close()">
            {{ t("ui.locationLinkActions.close") }}
          </button>
        </div>
      </dialog>
    </template>

    <template v-else-if="location.link">
      <button
        type="button"
        class="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-surface-container"
        :aria-label="t('ui.locationLinkActions.showActionsFor', { name: location.name })"
        :aria-expanded="menuOpen"
        :aria-controls="menuId"
        @click="menuOpen = !menuOpen"
      >
        {{ t("ui.locationLinkActions.showActions") }}
      </button>
      <div v-show="menuOpen" :id="menuId" role="group" :aria-label="t('ui.locationLinkActions.actionsFor', { name: location.name })" class="mt-2 flex flex-col gap-2 rounded-xl border p-3">
        <button type="button" class="rounded-lg px-3 py-2 text-left font-medium hover:bg-surface-container" @click="copyLink">
          {{ t("ui.locationLinkActions.copyLink") }}
        </button>
        <a :href="location.link" target="_blank" rel="noopener noreferrer" class="rounded-lg px-3 py-2 font-medium underline hover:bg-surface-container">
          {{ t("ui.locationLinkActions.openLink") }} <span class="sr-only">{{ t("ui.locationLinkActions.opensInNewTab") }}</span>
        </a>
        <p role="status" aria-live="polite" class="min-h-5 px-3 text-sm text-on-surface-variant">
          {{ copyMessage }}
        </p>
      </div>
    </template>

    <span v-else>{{ location.name }}</span>
  </div>
</template>
