<script setup lang="ts">
import type { Location } from "~/utils/plan-types";
import { copyToClipboard } from "~/utils/clipboard";

const props = defineProps<{
  location: Location;
  variant: "dialog" | "menu";
}>();

const { t } = useI18n();
const dialog = ref<HTMLDialogElement>();
const menuOpen = ref(false);
const copyMessage = ref("");
const menuId = `location-actions-${props.location.id}`;
const dialogId = `location-dialog-${props.location.id}`;
const dialogTitleId = `location-dialog-title-${props.location.id}`;

function openDialog() {
  copyMessage.value = "";
  dialog.value?.showModal();
}

async function copyLink() {
  const link = props.location.link;
  if (!link)
    return;
  const copied = await copyToClipboard(link);
  copyMessage.value = copied ? t("ui.locationLinkActions.linkCopied") : t("ui.locationLinkActions.linkCopyFailed");
}
</script>

<template>
  <div>
    <template v-if="location.link && variant === 'dialog'">
      <button type="button" class="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-surface-container" :aria-label="t('ui.locationLinkActions.openDialogActionsFor', { name: location.name })" aria-haspopup="dialog" :aria-controls="dialogId" @click="openDialog">
        {{ t("ui.locationLinkActions.dialogActions") }}
      </button>
      <dialog
        :id="dialogId"
        ref="dialog"
        :aria-labelledby="dialogTitleId"
        class="w-[min(24rem,calc(100%-2rem))] rounded-2xl border border-neutral-200 bg-surface-container-low p-0 text-on-surface shadow-xl backdrop:bg-black/40 dark:border-neutral-700"
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
            <button type="button" class="rounded-lg bg-primary px-4 py-3 text-left font-medium text-white" @click="copyLink">
              {{ t("ui.locationLinkActions.copyLink") }}
            </button>
            <a :href="location.link" target="_blank" rel="noopener noreferrer" class="rounded-lg border px-4 py-3 font-medium underline">
              {{ t("ui.locationLinkActions.openLink") }} <span class="sr-only">{{ t("ui.locationLinkActions.opensInNewTab") }}</span>
            </a>
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
