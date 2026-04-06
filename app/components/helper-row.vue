<script setup lang="ts">
defineProps<{
  icon: string;
  label: string;
  name: string;
}>();
</script>

<template>
  <div class="flex items-center gap-2 group">
    <UIcon
      :name="icon"
      class="text-on-surface-variant group-hover:text-primary transition-colors"
    />
    <span class="text-xs text-on-surface-variant font-medium min-w-20 label-md">
      {{ label }}:
    </span>
    <span class="text-sm text-on-surface font-medium label-md">
      {{ name }}
    </span>
  </div>
</template>
