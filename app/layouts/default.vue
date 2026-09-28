<script lang="ts" setup>

</script>

<template>
  <div class="min-h-screen overflow-x-hidden flex flex-col">
    <UHeader title="Helperplan" :toggle="false">
      <template #right>
        <LanguageSwitcher />
        <UColorModeButton />
      </template>
    </UHeader>
    <UMain class="flex-1 min-h-0">
      <slot />
    </UMain>
  </div>
</template>
