<template>
  <UContainer class="py-24">
    <div class="space-y-8 text-center sm:text-left">
      <h1 class="display-md text-on-surface">
        {{ $t('pages.setup.title') }}
      </h1>
      <p class="body-md text-on-surface-variant max-w-2xl mx-auto sm:mx-0">
        {{ $t('pages.setup.description') }}
      </p>
      <UButton to="/" icon="i-lucide-arrow-left" size="lg" class="rounded-full">
        {{ $t('common.back_to_home') }}
      </UButton>
    </div>
  </UContainer>
</template>
