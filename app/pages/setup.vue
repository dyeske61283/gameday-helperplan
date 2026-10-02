<script setup lang="ts">
import { usePlanStore } from "../stores/plan";
import { copyToClipboard } from "../utils/clipboard";
import { createPlanLink } from "../utils/plan-links";
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
const finalizedPlan = ref<{ id: string; key: string } | null>(null);
const shareState = ref<"idle" | "copied" | "failed">("idle");

useHead({ title: () => t("ui.setUpPlan") });

const metadataValid = computed(() => NewPlanMetadataSchema.safeParse({ clubName: clubName.value, season: season.value }).success);
const hasResume = computed(() => !!planStore.resumeState?.id && !!planStore.resumeState.key);

function entries(value: string) {
  return value.split("\n").map(entry => entry.trim()).filter(Boolean);
}

function continueFromMetadata() {
  error.value = "";
  if (!metadataValid.value) {
    error.value = "Enter a club name and season to continue.";
    return;
  }
  step.value = 3;
}

function continueFromTeams() {
  error.value = "";
  step.value = 4;
}

async function createPlan() {
  error.value = "";
  if (!metadataValid.value) {
    step.value = 2;
    error.value = "Enter a club name and season to continue.";
    return;
  }

  const roles = entries(rolesText.value);
  if (!roles.length) {
    error.value = "Enter at least one duty role.";
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

    if (!await planStore.savePlan()) {
      error.value = planStore.error || "Could not save the plan.";
      return;
    }
    finalizedPlan.value = { id, key };
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Could not save the plan.";
  }
  finally {
    isSaving.value = false;
  }
}

const shareUrl = computed(() => finalizedPlan.value ? createPlanLink(finalizedPlan.value.id, finalizedPlan.value.key) : "");

async function copyShareUrl() {
  if (!shareUrl.value)
    return;
  shareState.value = await copyToClipboard(shareUrl.value) ? "copied" : "failed";
}

async function resumePlan() {
  if (planStore.resumeState)
    await navigateTo(`/plans/${planStore.resumeState.id}#key=${planStore.resumeState.key}`);
}
</script>

<template>
  <UContainer class="py-10">
    <div class="mx-auto max-w-2xl space-y-8">
      <header class="space-y-2">
        <p class="text-sm font-medium text-primary">
          Step {{ step }} of 4
        </p>
        <h1 class="text-3xl font-bold text-on-surface">
          Set up your Gameday Plan
        </h1>
        <p class="text-on-surface-variant">
          Create a local plan. No account is required.
        </p>
      </header>

      <UAlert v-if="error" color="error" :title="error" role="alert" />

      <section v-if="finalizedPlan" aria-labelledby="ready-heading" class="space-y-5 rounded-xl border border-success/40 p-5">
        <div>
          <h2 id="ready-heading" class="text-xl font-semibold">
            Plan ready
          </h2>
          <p class="text-on-surface-variant">
            Your encrypted plan is saved. Share this link or open the schedule.
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <UInput :model-value="shareUrl" readonly :aria-label="$t('ui.shareLink')" class="grow" />
          <UButton @click="copyShareUrl">
            Copy share link
          </UButton>
          <UButton :to="shareUrl" variant="outline">
            Open schedule
          </UButton>
        </div>
        <p v-if="shareState === 'copied'" role="status" class="text-sm text-success">
          Share link copied.
        </p>
        <p v-else-if="shareState === 'failed'" role="alert" class="text-sm text-error">
          Could not copy the share link. Copy it from the field above.
        </p>
      </section>

      <section v-if="step === 1" aria-labelledby="start-heading" class="space-y-5">
        <h2 id="start-heading" class="text-xl font-semibold">
          Start Setup
        </h2>
        <p class="text-on-surface-variant">
          Enter your club, roster, teams, and duties. The saved plan opens in its canonical schedule.
        </p>
        <div class="flex flex-wrap gap-3">
          <UButton size="lg" @click="step = 2">
            Start Setup
          </UButton>
          <UButton v-if="hasResume" variant="outline" size="lg" @click="resumePlan">
            Resume Last Plan
          </UButton>
          <UButton to="/" variant="ghost" size="lg">
            Cancel
          </UButton>
        </div>
      </section>

      <form v-else-if="step === 2" class="space-y-5" @submit.prevent="continueFromMetadata">
        <h2 class="text-xl font-semibold">
          Club Information
        </h2>
        <UFormField :label="$t('ui.clubName')" required>
          <UInput v-model="clubName" autofocus :placeholder="$t('ui.clubExample')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('ui.season')" required :hint="$t('ui.seasonHint')">
          <UInput v-model="season" :placeholder="$t('ui.seasonExample')" class="w-full" />
        </UFormField>
        <div class="flex justify-between gap-3">
          <UButton type="button" variant="ghost" @click="step = 1">
            Back
          </UButton>
          <div class="flex gap-3">
            <UButton type="button" variant="outline" @click="navigateTo('/')">
              Cancel
            </UButton><UButton type="submit">
              Continue
            </UButton>
          </div>
        </div>
      </form>

      <form v-else-if="step === 3" class="space-y-5" @submit.prevent="continueFromTeams">
        <h2 class="text-xl font-semibold">
          Teams
        </h2>
        <p class="text-sm text-on-surface-variant">
          Add one team per line. You can manage fixtures later.
        </p>
        <UTextarea v-model="teamsText" :rows="6" :placeholder="$t('ui.teamsExample')" class="w-full" />
        <div class="flex justify-between gap-3">
          <UButton type="button" variant="ghost" @click="step = 2">
            Back
          </UButton><div class="flex gap-3">
            <UButton type="button" variant="outline" @click="navigateTo('/')">
              Cancel
            </UButton><UButton type="submit">
              Continue to Members
            </UButton>
          </div>
        </div>
      </form>

      <form v-else class="space-y-5" @submit.prevent="createPlan">
        <h2 class="text-xl font-semibold">
          Add Members & Configure Duties
        </h2>
        <UFormField :label="$t('ui.members')" :hint="$t('ui.membersHint')">
          <UTextarea v-model="membersText" :rows="6" :placeholder="$t('ui.membersExample')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('ui.dutyRoles')" required :hint="$t('ui.dutyRolesHint')">
          <UTextarea v-model="rolesText" :rows="5" class="w-full" />
        </UFormField>
        <div class="flex justify-between gap-3">
          <UButton type="button" variant="ghost" @click="step = 3">
            Back
          </UButton><div class="flex gap-3">
            <UButton type="button" variant="outline" @click="navigateTo('/')">
              Cancel
            </UButton><UButton type="submit" :loading="isSaving">
              Add Members & Finish
            </UButton>
          </div>
        </div>
      </form>
    </div>
  </UContainer>
</template>
