<template>
  <div class="min-h-screen max-h-screen bg-base-200 flex flex-col">
    <div class="navbar sticky top-0 z-50 bg-base-100">
      <div class="flex-1 p-2">
        <span class="text-xl font-bold">Helferplan</span>
      </div>
      <div class="flex-none">
        <NuxtLink to="https://github.com/dyeske61283/gameday-helperplan" target="_blank" class="btn btn-ghost btn-sm">
          <GitHubIcon></GitHubIcon>
        </NuxtLink>
      </div>
    </div>
    <div class="flex-1">
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
import { GitHubIcon } from 'vue3-simple-icons';

const planId = usePlanId();
</script>