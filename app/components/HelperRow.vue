<template>
  <div class="flex items-center gap-2 group">
    <UIcon
      :name="icon"
      class="text-gray-500 dark:text-gray-400 group-hover:text-primary transition-colors"
    />
    <span class="text-xs text-gray-500 dark:text-gray-400 font-medium min-w-20">
      {{ label }}:
    </span>
    <span class="text-sm text-gray-900 dark:text-white font-medium">
      {{ name }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  label: string
  name: string
}>()
</script>
