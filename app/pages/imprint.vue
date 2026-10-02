<template>
  <UContainer class="py-24">
    <div class="space-y-8 text-center sm:text-left">
      <h1 class="display-md text-on-surface">
        {{ $t("ui.info.imprint") }}
      </h1>
      <p class="body-md text-on-surface-variant max-w-2xl mx-auto sm:mx-0">
        {{ $t("ui.info.informationAboutTheProviderOfThisWebsite") }}
      </p>
      <p class="body-md text-on-surface-variant">
        {{ $t("ui.info.builtForTheHandballCommunity") }}
      </p>
      <UButton to="/" icon="i-lucide-arrow-left" size="lg" class="rounded-full">
        {{ $t("ui.common.backToHome") }}
      </UButton>
    </div>
  </UContainer>
</template>
