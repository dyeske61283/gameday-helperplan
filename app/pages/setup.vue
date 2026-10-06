<script setup lang="ts">
import { usePlanStore } from "../stores/plan";
import { NewPlanMetadataSchema } from "../utils/plan-types";

const planStore = usePlanStore();
const { generateKey } = useEncryption();
const step = ref(1);
const clubName = ref("");
const season = ref(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
const teamsText = ref("");
const membersText = ref("");
const rolesText = ref("Timekeeper\nScorekeeper\nFloor Manager");
const error = ref("");
const isSaving = ref(false);

useHead({ title: "Set up a new plan" });

const metadataValid = computed(() => NewPlanMetadataSchema.safeParse({ clubName: clubName.value, season: season.value }).success);

function entries(value: string) {
  return value.split("\n").map(entry => entry.trim()).filter(Boolean);
}

function continueFromMetadata() {
  error.value = metadataValid.value ? "" : "Enter a club name and season to continue.";
  if (metadataValid.value)
    step.value = 3;
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

    if (!await planStore.finalizePlan()) {
      error.value = planStore.error || "Could not save the plan.";
      return;
    }
    await navigateTo(`/plans/${id}#key=${key}`);
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Could not save the plan.";
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
          Step {{ step }} of 3
        </p>
        <h1 class="text-3xl font-bold text-on-surface">
          Set up a new plan
        </h1>
        <p class="text-on-surface-variant">
          Create a local plan. No account is required.
        </p>
      </header>

      <UAlert v-if="error" color="error" :title="error" role="alert" />

      <section v-if="step === 1" class="space-y-5">
        <h2 class="text-xl font-semibold">
          Start setup
        </h2>
        <p class="text-on-surface-variant">
          Enter your club, teams, members, and duties. The saved plan opens in its canonical schedule.
        </p>
        <div class="flex flex-wrap gap-3">
          <UButton size="lg" @click="step = 2">
            Start setup
          </UButton>
          <UButton to="/" variant="ghost" size="lg">
            Cancel
          </UButton>
        </div>
      </section>

      <form v-else-if="step === 2" class="space-y-5" @submit.prevent="continueFromMetadata">
        <h2 class="text-xl font-semibold">
          Club information
        </h2>
        <UFormField label="Club name" required>
          <UInput v-model="clubName" autofocus class="w-full" />
        </UFormField>
        <UFormField label="Season" required>
          <UInput v-model="season" class="w-full" />
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

      <form v-else class="space-y-5" @submit.prevent="createPlan">
        <h2 class="text-xl font-semibold">
          Teams, members, and duties
        </h2>
        <UFormField label="Teams" hint="One per line.">
          <UTextarea v-model="teamsText" :rows="4" class="w-full" />
        </UFormField>
        <UFormField label="Members" hint="Names only; this is not an account or identity system.">
          <UTextarea v-model="membersText" :rows="4" class="w-full" />
        </UFormField>
        <UFormField label="Duty roles" required hint="One per line.">
          <UTextarea v-model="rolesText" :rows="4" class="w-full" />
        </UFormField>
        <div class="flex justify-between gap-3">
          <UButton type="button" variant="ghost" @click="step = 2">
            Back
          </UButton>
          <div class="flex gap-3">
            <UButton type="button" variant="outline" @click="navigateTo('/')">
              Cancel
            </UButton><UButton type="submit" :loading="isSaving">
              Create plan
            </UButton>
          </div>
        </div>
      </form>
    </div>
  </UContainer>
</template>
