<script setup lang="ts">
const store = usePlanStore();
const { plan } = storeToRefs(store);

const roles = computed(() => plan.value?.roles || []);

function toggleRole(roleId: string) {
  if (!plan.value)
    return;
  const role = plan.value.roles.find(r => r.id === roleId);
  if (role) {
    role.enabled = !role.enabled;
  }
}
</script>

<template>
  <div v-if="plan" class="flex flex-col gap-12 max-w-2xl mx-auto">
    <div class="space-y-4 text-center">
      <h2 class="display-md text-on-surface">
        {{ $t('onboarding.step2.manual.title') }}
      </h2>
      <p class="body-md text-on-surface-variant">
        {{ $t('onboarding.step2.manual.description') }}
      </p>
    </div>

    <div class="space-y-8">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <UFormField :label="$t('onboarding.step2.manual.club_name')">
          <UInput v-model="plan.clubName" size="lg" class="input-kinetic" />
        </UFormField>
        <UFormField :label="$t('onboarding.step2.manual.season')">
          <UInput v-model="plan.season" size="lg" class="input-kinetic" />
        </UFormField>
      </div>

      <div class="space-y-6">
        <h3 class="title-md">
          {{ $t('onboarding.step2.manual.roles_title') }}
        </h3>
        <div class="space-y-4">
          <UCard
            v-for="role in roles"
            :key="role.id"
            :ui="{ body: { padding: 'p-4' } }"
            class="ghost-border"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="p-2 rounded-lg bg-primary-fixed">
                  <UIcon :name="role.id === 'timekeeper' ? 'i-lucide-clock' : role.id === 'scorekeeper' ? 'i-lucide-pencil-line' : role.id === 'floor_manager' ? 'i-lucide-briefcase' : 'i-lucide-camera'" class="size-6 text-primary" />
                </div>
                <div>
                  <div class="font-bold text-on-surface">
                    {{ $t(`roles.${role.id}.name`) }}
                  </div>
                  <div class="text-sm text-on-surface-variant">
                    {{ $t(`roles.${role.id}.description`) }}
                  </div>
                </div>
              </div>
              <USwitch :model-value="role.enabled" @update:model-value="toggleRole(role.id)" />
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <div class="flex justify-between pt-8">
      <UButton
        variant="ghost"
        color="neutral"
        size="lg"
        class="rounded-full"
        @click="store.prevStep"
      >
        {{ $t('common.back') }}
      </UButton>
      <UButton
        color="primary"
        size="xl"
        class="rounded-full px-12"
        @click="store.nextStep"
      >
        {{ $t('common.continue') }}
        <template #trailing>
          <UIcon name="i-lucide-arrow-right" />
        </template>
      </UButton>
    </div>
  </div>
</template>
