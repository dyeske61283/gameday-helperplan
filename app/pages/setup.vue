<script setup lang="ts">
import { usePlanStore } from "../stores/plan";
import { NewPlanMetadataSchema } from "../utils/plan-types";

const planStore = usePlanStore();
const { t } = useI18n();
const { generateKey } = useEncryption();
const step = ref(1);
const clubName = ref("");
const season = ref(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
const teamsText = ref("");
const membersText = ref("");
const rolesText = ref("Timekeeper\nScorekeeper\nFloor Manager");
const error = ref("");
const isSaving = ref(false);

useHead({ title: t("ui.home.newPlan") });

const metadataValid = computed(() => NewPlanMetadataSchema.safeParse({ clubName: clubName.value, season: season.value }).success);

function entries(value: string) {
  return value.split("\n").map(entry => entry.trim()).filter(Boolean);
}

function continueFromMetadata() {
  error.value = metadataValid.value ? "" : t("ui.clubSeasonRequired");
  if (metadataValid.value)
    step.value = 3;
}

async function createPlan() {
  error.value = "";
  if (!metadataValid.value) {
    step.value = 2;
    error.value = t("ui.clubSeasonRequired");
    return;
  }

  const roles = entries(rolesText.value);
  if (!roles.length) {
    error.value = t("ui.dutyRoleRequired");
    return;
  }

  isSaving.value = true;
  try {
    const id = crypto.randomUUID();
    const key = await generateKey();
    planStore.createNewPlan(id, key, { clubName: clubName.value.trim(), season: season.value.trim() });
    for (const name of entries(teamsText.value))
      planStore.addTeam(name);
    for (const name of entries(membersText.value))
      planStore.addMember({ name });
    planStore.configureRoles(roles);

    if (!await planStore.finalizePlan()) {
      error.value = planStore.error || t("ui.couldNotSavePlan");
      return;
    }
    await navigateTo(`/plans/${id}#key=${key}`);
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : t("ui.couldNotSavePlan");
  }
  finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <UContainer class="py-10">
    <div class="mx-auto max-w-2xl space-y-8">
      <header class="space-y-2">
        <p class="text-sm font-medium text-primary">
          {{ $t("onboarding.progress.step", { current: step, total: 3 }) }}
        </p>
        <h1 class="text-3xl font-bold text-on-surface">
          {{ $t("ui.home.newPlan") }}
        </h1>
        <p class="text-on-surface-variant">
          {{ $t("ui.setup.intro") }}
        </p>
      </header>

      <UAlert v-if="error" color="error" :title="error" role="alert" />

      <section v-if="step === 1" class="space-y-5">
        <h2 class="text-xl font-semibold">
          {{ $t("ui.setup.start") }}
        </h2>
        <p class="text-on-surface-variant">
          {{ $t("ui.setup.startIntro") }}
        </p>
        <div class="flex flex-wrap gap-3">
          <UButton size="lg" @click="step = 2">
            {{ $t("ui.setup.start") }}
          </UButton>
          <UButton to="/" variant="ghost" size="lg">
            {{ $t("ui.common.cancel") }}
          </UButton>
        </div>
      </section>

      <form v-else-if="step === 2" class="space-y-5" @submit.prevent="continueFromMetadata">
        <h2 class="text-xl font-semibold">
          {{ $t("ui.setup.clubInfo") }}
        </h2>
        <UFormField :label="$t('ui.clubName')" required>
          <UInput v-model="clubName" autofocus class="w-full" />
        </UFormField>
        <UFormField :label="$t('ui.season')" required>
          <UInput v-model="season" class="w-full" />
        </UFormField>
        <div class="flex justify-between gap-3">
          <UButton type="button" variant="ghost" @click="step = 1">
            {{ $t("ui.common.back") }}
          </UButton>
          <div class="flex gap-3">
            <UButton type="button" variant="outline" @click="navigateTo('/')">
              {{ $t("ui.common.cancel") }}
            </UButton><UButton type="submit">
              {{ $t("ui.common.continue") }}
            </UButton>
          </div>
        </div>
      </form>

      <form v-else class="space-y-5" @submit.prevent="createPlan">
        <h2 class="text-xl font-semibold">
          {{ $t("ui.setup.teamsMembersAndDuties") }}
        </h2>
        <UFormField :label="$t('ui.setup.teams')" :hint="$t('ui.setup.onePerLine')">
          <UTextarea v-model="teamsText" :rows="4" class="w-full" />
        </UFormField>
        <UFormField :label="$t('ui.members')" :hint="$t('ui.membersHint')">
          <UTextarea v-model="membersText" :rows="4" class="w-full" />
        </UFormField>
        <UFormField :label="$t('ui.dutyRoles')" required :hint="$t('ui.dutyRolesHint')">
          <UTextarea v-model="rolesText" :rows="4" class="w-full" />
        </UFormField>
        <div class="flex justify-between gap-3">
          <UButton type="button" variant="ghost" @click="step = 2">
            {{ $t("ui.common.back") }}
          </UButton>
          <div class="flex gap-3">
            <UButton type="button" variant="outline" @click="navigateTo('/')">
              {{ $t("ui.common.cancel") }}
            </UButton><UButton type="submit" :loading="isSaving">
              {{ $t("ui.setup.createPlan") }}
            </UButton>
          </div>
        </div>
      </form>
    </div>
  </UContainer>
</template>
