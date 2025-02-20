<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <div class="navbar bg-base-100 shadow-lg">
      <div class="flex-1 flex gap-1 justify-center items-center">
        <span class="btn btn-ghost text-xl disabled">Helferplan</span>
        <button :class="{invisible: !planId}" class="btn btn-accent btn-sm ml-auto">Plan anzeigen</button>
        <button :class="{invisible: !planId}" class="btn btn-accent btn-sm"><Share :size="18"></Share></button>
      </div>
    </div>
    <NuxtPage />
  </div>

</template>

<script setup lang="ts">
  import { Share } from 'lucide-vue-next';
  const planId = usePlanId();
</script>