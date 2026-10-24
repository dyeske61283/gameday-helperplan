<script setup lang="ts">
import type { Location } from "~/utils/plan-types";
import { copyToClipboard } from "~/utils/clipboard";

const props = defineProps<{
  location: Location;
  variant: "dialog" | "menu";
}>();

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
  copyMessage.value = copied ? "Link copied." : "Could not copy link.";
}
</script>

<template>
  <div>
    <template v-if="location.link && variant === 'dialog'">
      <button type="button" class="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-surface-container" :aria-label="`Open dialog actions for ${location.name}`" aria-haspopup="dialog" :aria-controls="dialogId" @click="openDialog">
        Dialog actions
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
              Choose how to use this location link.
            </p>
          </div>
          <div class="flex flex-col gap-2">
            <button type="button" class="rounded-lg bg-primary px-4 py-3 text-left font-medium text-white" @click="copyLink">
              Copy link
            </button>
            <a :href="location.link" target="_blank" rel="noopener noreferrer" class="rounded-lg border px-4 py-3 font-medium underline">
              Open link <span class="sr-only">(opens in a new tab)</span>
            </a>
          </div>
          <p role="status" aria-live="polite" class="min-h-5 text-sm text-on-surface-variant">
            {{ copyMessage }}
          </p>
          <button type="button" class="rounded-lg px-3 py-2 text-sm underline" @click="dialog?.close()">
            Close
          </button>
        </div>
      </dialog>
    </template>

    <template v-else-if="location.link">
      <button
        type="button"
        class="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-surface-container"
        :aria-label="`Show actions for ${location.name}`"
        :aria-expanded="menuOpen"
        :aria-controls="menuId"
        @click="menuOpen = !menuOpen"
      >
        Show actions
      </button>
      <div v-show="menuOpen" :id="menuId" role="group" :aria-label="`Actions for ${location.name}`" class="mt-2 flex flex-col gap-2 rounded-xl border p-3">
        <button type="button" class="rounded-lg px-3 py-2 text-left font-medium hover:bg-surface-container" @click="copyLink">
          Copy link
        </button>
        <a :href="location.link" target="_blank" rel="noopener noreferrer" class="rounded-lg px-3 py-2 font-medium underline hover:bg-surface-container">
          Open link <span class="sr-only">(opens in a new tab)</span>
        </a>
        <p role="status" aria-live="polite" class="min-h-5 px-3 text-sm text-on-surface-variant">
          {{ copyMessage }}
        </p>
      </div>
    </template>

    <span v-else>{{ location.name }}</span>
  </div>
</template>
