<!-- Nuxt requires camelCase dynamic parameter names here. -->
<!-- eslint-disable unicorn/filename-case -->
<script setup lang="ts">
import type { SeasonPlan } from "../../../utils/plan-types";
import { toRaw } from "vue";
import { usePlanStore } from "../../../stores/plan";
import { createPlanLink } from "../../../utils/plan-links";

const route = useRoute();
const planStore = usePlanStore();
const toast = useToast();
usePlanInit();

const planLink = computed(() => planStore.key ? createPlanLink(String(route.params.planId), planStore.key) : `/plans/${route.params.planId}${route.hash}`);
const scheduleLink = computed(() => planLink.value);
const shareUrl = computed(() => planStore.key ? createPlanLink(String(route.params.planId), planStore.key) : "");
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

function touch() {
  isDirty.value = true;
}

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
  touch();
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
  touch();
}

function validate() {
  if (!clubName.value.trim() || !season.value.trim())
    return "Club name and season are required.";
  if (!draft.value || Object.values(draft.value.teams).some(team => !team.name.trim()) || Object.values(draft.value.members).some(member => !member.name.trim()))
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
  if (!draft.value)
    return;
  draft.value.club = { ...draft.value.club, name: clubName.value.trim(), contactEmail: contactEmail.value.trim(), homepage: homepage.value.trim(), lastUpdated: new Date() };
  draft.value.season = season.value.trim();
  draft.value.config.roles = rolesText.value.split("\n").map((line, index) => {
    const [name, scope = "match"] = line.split("|").map(value => value.trim());
    const previous = planStore.roles[index];
    return { id: previous?.id ?? `role-${index + 1}`, name: name ?? "", scope: scope === "gameday" ? "gameday" as const : "match" as const, requiredSkillId: previous?.requiredSkillId ?? "" };
  }).filter((role): role is NonNullable<typeof role> & { name: string } => Boolean(role.name));
  draft.value.config.locations = locationsText.value.split("\n").map((line, index) => {
    const [name, link] = line.split("|").map(value => value.trim());
    return { id: planStore.locations[index]?.id ?? `location-${index + 1}`, name: name ?? "", ...(link ? { link } : {}) };
  }).filter((location): location is NonNullable<typeof location> & { name: string } => Boolean(location.name));
  Object.values(draft.value.teams).forEach((team) => {
    team.name = team.name.trim();
    team.updatedAt = new Date();
  });
  Object.values(draft.value.members).forEach((member) => {
    member.name = member.name.trim();
    member.updatedAt = new Date();
  });
  const saved = await planStore.savePlan(draft.value);
  if (!saved) {
    toast.add({ title: "Save failed", description: planStore.error || "Could not save the plan.", color: "error" });
  }
  else {
    isDirty.value = false;
    planStore.setEditing(false);
    toast.add({ title: "Plan saved", description: "Changes synced to the shared plan.", color: "success" });
  }
}

async function reload() {
  if (!planStore.plan || !planStore.key)
    return;
  isDirty.value = false;
  planStore.applyPendingUpdate();
  await planStore.loadPlan(planStore.plan.id, planStore.key);
  if (planStore.error)
    toast.add({ title: "Reload failed", description: planStore.error, color: "error" });
}

async function copyShareUrl() {
  if (!shareUrl.value)
    return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    shareState.value = "copied";
  }
  catch {
    shareState.value = "failed";
  }
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
      <div v-if="planStore.pendingUpdate" role="alert" class="rounded-lg bg-warning/10 p-4 text-warning">
        A newer shared plan version arrived while you were editing.
        <div class="mt-3 flex gap-2">
          <UButton size="sm" variant="outline" @click="reload">
            Use newer version
          </UButton>
          <UButton size="sm" variant="ghost" @click="planStore.setEditing(true)">
            Keep my changes
          </UButton>
        </div>
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
          <div v-for="team in teams" :key="team.id" class="flex gap-2">
            <UInput v-model="team.name" class="grow" @input="markDirty" /><UButton color="error" variant="ghost" @click="removeTeam(team.id)">
              Remove
            </UButton>
          </div>
          <p v-if="!teams.length" class="text-sm text-on-surface-variant">
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
          <div v-for="member in members" :key="member.id" class="space-y-2 rounded-lg border p-3">
            <div class="flex gap-2">
              <UInput v-model="member.name" class="grow" @input="markDirty" /><UButton color="error" variant="ghost" @click="removeMember(member.id)">
                Remove
              </UButton>
            </div>
            <select v-model="member.teamIds" multiple class="w-full rounded-lg border bg-transparent p-2 text-sm" aria-label="Member teams" @change="markDirty">
              <option v-for="team in teams" :key="team.id" :value="team.id">
                {{ team.name }}
              </option>
            </select>
          </div>
          <p v-if="!members.length" class="text-sm text-on-surface-variant">
            No members yet.
          </p>
        </div>
      </section>

      <section class="space-y-4 rounded-xl border p-5">
        <h2 class="text-xl font-bold">
          Schedule configuration
        </h2>
        <UFormField label="Duty roles" hint="One per line: role name | match or gameday">
          <UTextarea v-model="rolesText" :rows="5" class="w-full" @input="markDirty" />
        </UFormField>
        <UFormField label="Locations" hint="One per line: location name | optional URL">
          <UTextarea v-model="locationsText" :rows="4" class="w-full" @input="markDirty" />
        </UFormField>
      </section>

      <section v-if="shareUrl" aria-labelledby="share-heading" class="space-y-3 rounded-xl border border-primary/30 p-5">
        <h2 id="share-heading" class="text-xl font-bold">
          Share this plan
        </h2>
        <div class="flex flex-col gap-2 sm:flex-row">
          <UInput :model-value="shareUrl" readonly aria-label="Share link" class="grow" />
          <UButton @click="copyShareUrl">
            Copy share link
          </UButton>
        </div>
        <p v-if="shareState === 'copied'" role="status" class="text-sm text-success">
          Share link copied.
        </p>
        <p v-else-if="shareState === 'failed'" role="alert" class="text-sm text-error">
          Could not copy the share link. Copy it from the field above.
        </p>
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
