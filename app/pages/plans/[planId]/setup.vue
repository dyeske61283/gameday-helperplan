<!-- Nuxt requires camelCase dynamic parameter names here. -->
<!-- eslint-disable unicorn/filename-case -->
<script setup lang="ts">
import { usePlanStore } from "../../../stores/plan";

const route = useRoute();
const planStore = usePlanStore();
const toast = useToast();
usePlanInit();

const planLink = computed(() => `/plans/${route.params.planId}${planStore.key ? `#key=${planStore.key}` : route.hash}`);
const scheduleLink = computed(() => `/plans/${route.params.planId}${planStore.key ? `#key=${planStore.key}` : route.hash}`);
const clubName = ref("");
const season = ref("");
const contactEmail = ref("");
const homepage = ref("");
const teamDrafts = ref<Record<string, string>>({});
const memberDrafts = ref<Record<string, { name: string; teamIds: string[] }>>({});
const newTeamName = ref("");
const newMemberName = ref("");
const isDirty = ref(false);
const syncingDrafts = ref(false);

function syncDrafts() {
  if (!planStore.plan || isDirty.value)
    return;
  syncingDrafts.value = true;
  clubName.value = planStore.plan.club.name;
  season.value = planStore.plan.season;
  contactEmail.value = planStore.plan.club.contactEmail;
  homepage.value = planStore.plan.club.homepage;
  teamDrafts.value = Object.fromEntries(planStore.teamsList.map(team => [team.id, team.name]));
  memberDrafts.value = Object.fromEntries(planStore.membersList.map(member => [member.id, { name: member.name, teamIds: [...member.teamIds] }]));
  nextTick(() => syncingDrafts.value = false);
}

watch(() => planStore.plan, syncDrafts, { immediate: true });
watch([clubName, season, contactEmail, homepage, teamDrafts, memberDrafts], () => {
  if (planStore.plan && !syncingDrafts.value)
    isDirty.value = true;
}, { deep: true });

function markDirty() {
  isDirty.value = true;
}

function addTeam() {
  const name = newTeamName.value.trim();
  if (!name)
    return;
  const team = planStore.addTeam(name);
  teamDrafts.value[team.id] = team.name;
  newTeamName.value = "";
  markDirty();
}

function removeTeam(teamId: string) {
  planStore.deleteTeam(teamId);
  delete teamDrafts.value[teamId];
  Object.values(memberDrafts.value).forEach(member => member.teamIds = member.teamIds.filter(id => id !== teamId));
  markDirty();
}

function addMember() {
  const name = newMemberName.value.trim();
  if (!name)
    return;
  const member = planStore.addMember({ name });
  memberDrafts.value[member.id] = { name: member.name, teamIds: [] };
  newMemberName.value = "";
  markDirty();
}

function removeMember(memberId: string) {
  planStore.deleteMember(memberId);
  delete memberDrafts.value[memberId];
  markDirty();
}

function validate() {
  if (!clubName.value.trim() || !season.value.trim())
    return "Club name and season are required.";
  if (Object.values(teamDrafts.value).some(name => !name.trim()) || Object.values(memberDrafts.value).some(member => !member.name.trim()))
    return "Team and member names cannot be empty.";
  if (contactEmail.value && (!contactEmail.value.includes("@") || !contactEmail.value.includes(".")))
    return "Enter a valid contact email.";
  if (homepage.value && !/^https?:\/\//.test(homepage.value))
    return "Homepage must start with http:// or https://.";
  return null;
}

async function save() {
  const validationError = validate();
  if (validationError || !planStore.plan) {
    toast.add({ title: "Check your changes", description: validationError || "Plan is unavailable.", color: "error" });
    return;
  }
  planStore.updatePlanDetails({ club: { name: clubName.value.trim(), contactEmail: contactEmail.value.trim(), homepage: homepage.value.trim() }, season: season.value.trim() });
  Object.entries(teamDrafts.value).forEach(([id, name]) => planStore.updateTeam(id, name.trim()));
  Object.entries(memberDrafts.value).forEach(([id, member]) => planStore.updateMember(id, { name: member.name.trim(), teamIds: member.teamIds }));
  await planStore.savePlan();
  if (planStore.error) {
    toast.add({ title: "Save failed", description: planStore.error, color: "error" });
  }
  else {
    isDirty.value = false;
    toast.add({ title: "Plan saved", description: "Changes synced to the shared plan.", color: "success" });
  }
}

async function reload() {
  if (!planStore.plan || !planStore.key)
    return;
  isDirty.value = false;
  await planStore.loadPlan(planStore.plan.id, planStore.key);
  if (planStore.error)
    toast.add({ title: "Reload failed", description: planStore.error, color: "error" });
}

useHead({ title: "Edit plan" });
</script>

<template>
  <UContainer class="max-w-4xl space-y-8 py-8">
    <div v-if="planStore.isLoading && !planStore.plan" class="py-16 text-center">
      Loading plan...
    </div>
    <main v-else-if="planStore.error && !planStore.plan" class="mx-auto max-w-xl space-y-4 py-16 text-center">
      <h1 class="text-2xl font-bold">
        Could not load plan
      </h1>
      <p class="text-error">
        {{ planStore.error }}
      </p>
      <UButton :to="planLink">
        Return to plan
      </UButton>
    </main>
    <main v-else-if="!planStore.plan" class="py-16 text-center">
      This plan is unavailable.
    </main>
    <main v-else class="space-y-8">
      <header class="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-sm text-primary">
            Plan setup
          </p>
          <h1 class="text-3xl font-bold">
            {{ planStore.plan.club.name || "Edit shared plan" }}
          </h1>
          <p class="text-on-surface-variant">
            Changes are encrypted and shared with everyone using this link.
          </p>
        </div>
        <div class="flex gap-2">
          <UButton :to="scheduleLink" variant="outline">
            View schedule
          </UButton>
          <UButton :loading="planStore.isLoading" @click="save">
            Save changes
          </UButton>
        </div>
      </header>

      <div v-if="planStore.error" class="rounded-lg bg-error/10 p-4 text-error">
        {{ planStore.error }}
      </div>

      <section class="space-y-4 rounded-xl border p-5">
        <h2 class="text-xl font-bold">
          Plan details
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Club name" required>
            <UInput v-model="clubName" @input="markDirty" />
          </UFormField>
          <UFormField label="Season" required>
            <UInput v-model="season" placeholder="2026/2027" @input="markDirty" />
          </UFormField>
          <UFormField label="Contact email">
            <UInput v-model="contactEmail" type="email" @input="markDirty" />
          </UFormField>
          <UFormField label="Homepage">
            <UInput v-model="homepage" type="url" placeholder="https://example.org" @input="markDirty" />
          </UFormField>
        </div>
      </section>

      <section class="space-y-4 rounded-xl border p-5">
        <h2 class="text-xl font-bold">
          Teams
        </h2>
        <div class="flex gap-2">
          <UInput v-model="newTeamName" class="grow" placeholder="Team name" @keyup.enter="addTeam" /><UButton :disabled="!newTeamName.trim()" @click="addTeam">
            Add team
          </UButton>
        </div>
        <div class="space-y-2">
          <div v-for="team in planStore.teamsList" :key="team.id" class="flex gap-2">
            <UInput v-model="teamDrafts[team.id]" class="grow" @input="markDirty" /><UButton color="error" variant="ghost" @click="removeTeam(team.id)">
              Remove
            </UButton>
          </div>
          <p v-if="!planStore.teamsList.length" class="text-sm text-on-surface-variant">
            No teams yet.
          </p>
        </div>
      </section>

      <section class="space-y-4 rounded-xl border p-5">
        <h2 class="text-xl font-bold">
          Members
        </h2>
        <div class="flex gap-2">
          <UInput v-model="newMemberName" class="grow" placeholder="Member name" @keyup.enter="addMember" /><UButton :disabled="!newMemberName.trim()" @click="addMember">
            Add member
          </UButton>
        </div>
        <div class="space-y-3">
          <div v-for="member in planStore.membersList" :key="member.id" class="space-y-2 rounded-lg border p-3">
            <div class="flex gap-2">
              <UInput v-model="memberDrafts[member.id]!.name" class="grow" @input="markDirty" /><UButton color="error" variant="ghost" @click="removeMember(member.id)">
                Remove
              </UButton>
            </div>
            <select v-model="memberDrafts[member.id]!.teamIds" multiple class="w-full rounded-lg border bg-transparent p-2 text-sm" aria-label="Member teams" @change="markDirty">
              <option v-for="team in planStore.teamsList" :key="team.id" :value="team.id">
                {{ team.name }}
              </option>
            </select>
          </div>
          <p v-if="!planStore.membersList.length" class="text-sm text-on-surface-variant">
            No members yet.
          </p>
        </div>
      </section>

      <footer class="flex items-center justify-between border-t pt-6">
        <span class="text-sm text-on-surface-variant">{{ isDirty ? "Unsaved changes" : "All changes saved" }}</span>
        <UButton variant="outline" :loading="planStore.isLoading" @click="reload">
          Reload from server
        </UButton>
      </footer>
    </main>
  </UContainer>
</template>
