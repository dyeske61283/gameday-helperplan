<template>
  <div class="min-h-screen max-h-screen bg-base-200 flex flex-col">
    <div class="navbar sticky top-0 z-50 bg-base-100">
      <div class="flex-1 p-2">
        <span class="text-xl font-bold">Helferplan</span>
      </div>
      <div class="flex-none">
        <div class="dropdown dropdown-bottom dropdown-end">
          <button tabindex="0" class="btn btn-primary btn-soft">
            <Menu></Menu>
          </button>
          <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
            <li><NuxtLink>Neuen Plan erstellen</NuxtLink></li>
            <li><NuxtLink>Anderen Plan auswählen</NuxtLink></li>
            <li><NuxtLink>Impressum</NuxtLink></li>
            <li>
              <NuxtLink to="https://github.com/dyeske61283/gameday-helperplan" target="_blank">
                Open Source auf <GitHubIcon></GitHubIcon>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="flex-1">
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
import { GitHubIcon } from 'vue3-simple-icons';
import { Menu } from 'lucide-vue-next';

const planId = usePlanId();
</script>