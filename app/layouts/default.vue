<script lang="ts" setup>

</script>

<template>
  <div>
    <UHeader title="Helperplan" :toggle="false">
      <template #right>
        <LanguageSwitcher />
        <UColorModeButton />
      </template>
    </UHeader>
    <UMain>
      <slot />
    </UMain>
  </div>
</template>
