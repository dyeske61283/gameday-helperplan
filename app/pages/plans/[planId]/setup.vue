<!-- Nuxt requires camelCase dynamic parameter names here. -->
<!-- eslint-disable unicorn/filename-case -->
<script setup lang="ts">
import type { SeasonPlan } from "../../../utils/plan-types";
import { toRaw } from "vue";
import { usePlanStore } from "../../../stores/plan";
import { copyToClipboard } from "../../../utils/clipboard";
import { createPlanLink } from "../../../utils/plan-links";

const route = useRoute();
const planStore = usePlanStore();
const toast = useToast();
const { t } = useI18n();
usePlanInit();

onMounted(() => planStore.setEditing(true));
onUnmounted(() => planStore.setEditing(false));

const planLink = computed(() => planStore.key ? `/plans/${route.params.planId}#key=${planStore.key}` : `/plans/${route.params.planId}${route.hash}`);
const scheduleLink = computed(() => planLink.value);
const shareUrl = computed(() => planStore.key ? createPlanLink(String(route.params.planId), planStore.key, `/plans/${route.params.planId}/setup`) : "");
const draft = ref<SeasonPlan | null>(null);
const clubName = ref("");
const season = ref("");
const contactEmail = ref("");
const homepage = ref("");
const rolesText = ref("");
const locationsText = ref("");
const newTeamName = ref("");
const newMemberName = ref("");
const isDirty = ref(false);
const syncingDrafts = ref(false);
const shareState = ref<"idle" | "copied" | "failed">("idle");

function syncDrafts() {
  if (!planStore.plan || isDirty.value)
    return;
  syncingDrafts.value = true;
  draft.value = structuredClone(toRaw(planStore.plan));
  clubName.value = planStore.plan.club.name;
  season.value = planStore.plan.season;
  contactEmail.value = planStore.plan.club.contactEmail;
  homepage.value = planStore.plan.club.homepage;
  rolesText.value = planStore.roles.map(role => `${role.name} | ${role.scope}`).join("\n");
  locationsText.value = planStore.locations.map(location => `${location.name}${location.link ? ` | ${location.link}` : ""}`).join("\n");
  nextTick(() => syncingDrafts.value = false);
}

watch(() => planStore.plan, syncDrafts, { immediate: true });
function markDirty() {
  isDirty.value = true;
  planStore.setEditing(true);
}

const teams = computed(() => Object.values(draft.value?.teams ?? {}));
const members = computed(() => Object.values(draft.value?.members ?? {}));

function addTeam() {
  const name = newTeamName.value.trim();
  if (!name || !draft.value)
    return;
  const id = `team-${crypto.randomUUID().slice(0, 8)}`;
  draft.value.teams[id] = { id, name, isManual: true, updatedAt: new Date() };
  newTeamName.value = "";
  markDirty();
}

function removeTeam(teamId: string) {
  if (!draft.value)
    return;
  delete draft.value.teams[teamId];
  Object.values(draft.value.members).forEach(member => member.teamIds = member.teamIds.filter(id => id !== teamId));
  markDirty();
}

function addMember() {
  const name = newMemberName.value.trim();
  if (!name || !draft.value)
    return;
  const id = `member-${crypto.randomUUID().slice(0, 8)}`;
  draft.value.members[id] = { id, name, teamIds: [], skillIds: [], isManual: true, updatedAt: new Date() };
  newMemberName.value = "";
  markDirty();
}

function removeMember(memberId: string) {
  if (draft.value)
    delete draft.value.members[memberId];
  markDirty();
}

function validate() {
  if (!clubName.value.trim() || !season.value.trim())
    return "ui.checkPlanDetails";
  if (!draft.value || Object.values(draft.value.teams).some(team => !team.name.trim()) || Object.values(draft.value.members).some(member => !member.name.trim()))
    return "ui.teamMemberNamesRequired";
  if (contactEmail.value && (!contactEmail.value.includes("@") || !contactEmail.value.includes(".")))
    return "ui.validEmailRequired";
  if (homepage.value && !/^https?:\/\//.test(homepage.value))
    return "ui.homepageProtocolRequired";
  return null;
}

async function save() {
  const validationError = validate();
  if (validationError || !planStore.plan || !draft.value) {
    toast.add({ title: "ui.checkChanges", description: validationError || "ui.planUnavailable", color: "error" });
    return;
  }
  draft.value.club = { ...draft.value.club, name: clubName.value.trim(), contactEmail: contactEmail.value.trim(), homepage: homepage.value.trim(), lastUpdated: new Date() };
  draft.value.season = season.value.trim();
  draft.value.config.roles = rolesText.value.split("\n").map((line, index) => {
    const [name, scope = planStore.roles[index]?.scope ?? "match"] = line.split("|").map(value => value.trim());
    const previous = planStore.roles[index];
    return { id: previous?.id ?? `role-${index + 1}`, name: name ?? "", scope: scope === "gameday" ? "gameday" as const : "match" as const, requiredSkillId: previous?.requiredSkillId ?? "" };
  }).filter(role => Boolean(role.name));
  draft.value.config.locations = locationsText.value.split("\n").map((line, index) => {
    const [name, link] = line.split("|").map(value => value.trim());
    return { id: planStore.locations[index]?.id ?? `location-${index + 1}`, name: name ?? "", ...(link ? { link } : {}) };
  }).filter(location => Boolean(location.name));
  Object.values(draft.value.teams).forEach((team) => {
    team.name = team.name.trim();
    team.updatedAt = new Date();
  });
  Object.values(draft.value.members).forEach((member) => {
    member.name = member.name.trim();
    member.updatedAt = new Date();
  });
  if (await planStore.savePlan(draft.value)) {
    isDirty.value = false;
    planStore.setEditing(false);
  }
  else {
    toast.add({ title: "ui.saveFailed", description: planStore.error || "ui.couldNotSavePlan", color: "error" });
  }
}

async function reload() {
  if (!planStore.plan || !planStore.key)
    return;
  isDirty.value = false;
  planStore.setEditing(true);
  await planStore.loadPlan(planStore.plan.id, planStore.key);
}

async function copyShareUrl() {
  if (!shareUrl.value)
    return;
  try {
    shareState.value = await copyToClipboard(shareUrl.value) ? "copied" : "failed";
  }
  catch { shareState.value = "failed"; }
}

useHead({ title: t("ui.editPlan") });
</script>

<template>
  <UContainer class="max-w-4xl space-y-8 py-8">
    <div v-if="planStore.isLoading && !planStore.plan" class="py-16 text-center">
      {{ $t("ui.schedule.loadingPlan") }}
    </div>
    <main v-else-if="planStore.error && !planStore.plan" class="mx-auto max-w-xl space-y-4 py-16 text-center">
      <h1 class="text-2xl font-bold">
        {{ $t("ui.planSetup.couldNotLoadPlan") }}
      </h1>
      <p class="text-error">
        {{ planStore.error }}
      </p>
      <UButton :to="planLink">
        {{ $t("ui.planSetup.returnToPlan") }}
      </UButton>
    </main>
    <main v-else-if="!planStore.plan" class="py-16 text-center">
      <p>{{ $t("ui.schedule.thisPlanIsUnavailable") }}</p>
      <UButton to="/" class="mt-4">
        {{ $t("ui.schedule.returnStart") }}
      </UButton>
    </main>
    <main v-else class="space-y-8">
      <header class="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-sm text-primary">
            {{ $t("ui.planSetup.planSetup") }}
          </p>
          <h1 class="text-3xl font-bold">
            {{ planStore.plan.club.name || $t("ui.editPlan") }}
          </h1>
          <p class="text-on-surface-variant">
            {{ $t("ui.planSetup.changesAreEncryptedAndSharedWithEveryoneUsingThisLink") }}
          </p>
        </div>
        <div class="flex gap-2">
          <UButton :to="scheduleLink" variant="outline">
            {{ $t("ui.planSetup.viewSchedule") }}
          </UButton>
          <UButton :loading="planStore.isLoading" @click="save">
            {{ $t("ui.planSetup.saveChanges") }}
          </UButton>
        </div>
      </header>
      <div v-if="planStore.error" class="rounded-lg bg-error/10 p-4 text-error">
        {{ planStore.error }}
      </div>
      <section class="space-y-4 rounded-xl border p-5">
        <h2 class="text-xl font-bold">
          {{ $t("ui.planSetup.planDetails") }}
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="$t('ui.clubName')" required>
            <UInput v-model="clubName" @input="markDirty" />
          </UFormField>
          <UFormField :label="$t('ui.season')" required>
            <UInput v-model="season" @input="markDirty" />
          </UFormField>
          <UFormField :label="$t('ui.contactEmail')">
            <UInput v-model="contactEmail" type="email" @input="markDirty" />
          </UFormField>
          <UFormField :label="$t('ui.homepage')">
            <UInput v-model="homepage" type="url" @input="markDirty" />
          </UFormField>
        </div>
      </section>
      <section class="space-y-4 rounded-xl border p-5">
        <h2 class="text-xl font-bold">
          {{ $t("ui.setup.teams") }}
        </h2>
        <div class="flex gap-2">
          <UInput v-model="newTeamName" class="grow" /><UButton :disabled="!newTeamName.trim()" @click="addTeam">
            {{ $t("ui.planSetup.addTeam") }}
          </UButton>
        </div>
        <div v-for="team in teams" :key="team.id" class="flex gap-2">
          <UInput v-model="team.name" class="grow" @input="markDirty" /><UButton color="error" variant="ghost" @click="removeTeam(team.id)">
            {{ $t("ui.common.remove") }}
          </UButton>
        </div>
        <p v-if="!teams.length" class="text-sm text-on-surface-variant">
          {{ $t("ui.planSetup.noTeamsYet") }}
        </p>
      </section>
      <section class="space-y-4 rounded-xl border p-5">
        <h2 class="text-xl font-bold">
          {{ $t("ui.common.members") }}
        </h2>
        <div class="flex gap-2">
          <UInput v-model="newMemberName" class="grow" /><UButton :disabled="!newMemberName.trim()" @click="addMember">
            {{ $t("ui.planSetup.addMember") }}
          </UButton>
        </div>
        <div v-for="member in members" :key="member.id" class="space-y-2 rounded-lg border p-3">
          <div class="flex gap-2">
            <UInput v-model="member.name" class="grow" @input="markDirty" /><UButton color="error" variant="ghost" @click="removeMember(member.id)">
              {{ $t("ui.common.remove") }}
            </UButton>
          </div><select v-model="member.teamIds" multiple :aria-label="$t('ui.memberTeams')" class="w-full rounded-lg border bg-transparent p-2 text-sm" @change="markDirty">
            <option v-for="team in teams" :key="team.id" :value="team.id">
              {{ team.name }}
            </option>
          </select>
        </div>
        <p v-if="!members.length" class="text-sm text-on-surface-variant">
          {{ $t("ui.planSetup.noMembersYet") }}
        </p>
      </section>
      <section class="space-y-4 rounded-xl border p-5">
        <h2 class="text-xl font-bold">
          {{ $t("ui.planSetup.scheduleConfiguration") }}
        </h2>
        <UFormField :label="$t('ui.dutyRoles')">
          <UTextarea v-model="rolesText" :rows="5" class="w-full" @input="markDirty" />
        </UFormField>
        <UFormField :label="$t('ui.locations')">
          <UTextarea v-model="locationsText" :rows="4" class="w-full" @input="markDirty" />
        </UFormField>
      </section>
      <section v-if="shareUrl" aria-labelledby="share-heading" class="space-y-3 rounded-xl border border-primary/30 p-5">
        <h2 id="share-heading" class="text-xl font-bold">
          {{ $t("ui.planSetup.shareThisPlan") }}
        </h2>
        <div class="flex flex-col gap-2 sm:flex-row">
          <UInput :model-value="shareUrl" readonly :aria-label="$t('ui.shareLink')" class="grow" /><UButton @click="copyShareUrl">
            {{ $t("ui.common.copyShareLink") }}
          </UButton>
        </div>
        <p v-if="shareState === 'copied'" role="status" class="text-sm text-success">
          {{ $t("ui.common.shareCopied") }}
        </p>
        <p v-else-if="shareState === 'failed'" role="alert" class="text-sm text-error">
          {{ $t("ui.common.shareCopyFailed") }}
        </p>
      </section>
      <footer class="flex items-center justify-between border-t pt-6">
        <span class="text-sm text-on-surface-variant">{{ isDirty ? $t("ui.common.saveChanges") : $t("ui.saved") }}</span><UButton variant="outline" :loading="planStore.isLoading" @click="reload">
          {{ $t("ui.planSetup.reloadFromServer") }}
        </UButton>
      </footer>
    </main>
  </UContainer>
</template>
