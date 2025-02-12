<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <div class="navbar bg-base-100 shadow-lg">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl mr-auto">Helferplan</a>
      </div>
      <div class="flex-none">
        <RotateCcw :size="32" @click="confirmRestart()"/>
      </div>
    </div>
    <NuxtPage />
  </div>

</template>

<script setup lang="ts">
  import {RotateCcw} from 'lucide-vue-next'

  function confirmRestart() {

  }
</script>