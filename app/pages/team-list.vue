<script setup lang="ts">
import { usePlanStore } from "~/stores/plan";

const planStore = usePlanStore();

usePlanInit();

const searchQuery = ref("");
const activeAccordions = ref<string[]>([]);

// Modals state
const isMemberModalOpen = ref(false);
const selectedMember = ref<{ id: string; name: string; teamIds: string[]; skillIds: string[] } | null>(null);

const isTeamModalOpen = ref(false);
const selectedTeam = ref<{ id: string; name: string } | null>(null);
const isCreatingTeam = ref(false);
const newTeamName = ref("");

// Helper to get initials
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
}

// Watcher for search query to auto-reveal and scroll
watch(searchQuery, (newVal) => {
  if (newVal.trim().length > 1 && planStore.plan) {
    const matchedTeamIds: string[] = [];
    const lowerQuery = newVal.toLowerCase();

    // Find matching members
    Object.values(planStore.members).forEach((m: any) => {
      if (m.name.toLowerCase().includes(lowerQuery)) {
        if (m.teamIds.length > 0) {
          matchedTeamIds.push(...m.teamIds);
        }
        else {
          matchedTeamIds.push("teamless");
        }
      }
    });

    activeAccordions.value = Array.from(new Set(matchedTeamIds));

    // Auto-scroll to the first matching element after 200ms
    setTimeout(() => {
      const element = document.querySelector("[data-search-hit='true']");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 200);
  }
});

// Teams Computed
const accordionItems = computed(() => {
  const list = planStore.teamsList.map((t: any) => {
    return {
      label: t.name,
      value: t.id,
      content: t.id,
    };
  });

  // Append teamless item
  list.push({
    label: "Teamless Members",
    value: "teamless",
    content: "teamless",
  });

  return list;
});

// Filtered members per team
function getMembersForTeam(teamId: string) {
  const members = planStore.membersList.filter((m: any) => {
    if (teamId === "teamless") {
      return m.teamIds.length === 0;
    }
    return m.teamIds.includes(teamId);
  });

  if (!searchQuery.value.trim()) {
    return members;
  }

  return members.filter((m: any) =>
    m.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  );
}

const toast = useToast();

/**
 * Save the plan after a mutation. Silently skips in example/read-only mode.
 */
async function autoSave(title = "Saved", description = "Changes synced to server.") {
  if (!planStore.key) {
    toast.add({ title, description, color: "success" });
    return;
  }
  await planStore.savePlan();
  if (planStore.error) {
    toast.add({ title: "Save Failed", description: planStore.error, color: "error" });
  }
  else {
    toast.add({ title, description, color: "success" });
  }
}

// Member CRUD
function openMemberDetails(member: any) {
  selectedMember.value = {
    id: member.id,
    name: member.name,
    teamIds: [...member.teamIds],
    skillIds: [...member.skillIds],
  };
  isMemberModalOpen.value = true;
}

async function saveMember() {
  if (!selectedMember.value)
    return;
  planStore.updateMember(selectedMember.value.id, {
    name: selectedMember.value.name,
    teamIds: selectedMember.value.teamIds,
    skillIds: selectedMember.value.skillIds,
  });
  isMemberModalOpen.value = false;
  await autoSave("Member Saved", `${selectedMember.value.name} has been updated.`);
}

async function addMember() {
  const newM = planStore.addMember({
    name: "New Member",
    teamIds: [],
    skillIds: [],
  });
  openMemberDetails(newM);
}

// Team CRUD
function openCreateTeam() {
  isCreatingTeam.value = true;
  newTeamName.value = "";
  isTeamModalOpen.value = true;
}

function openEditTeam(teamId: string) {
  const team = planStore.teams[teamId];
  if (!team)
    return;
  isCreatingTeam.value = false;
  selectedTeam.value = { id: teamId, name: team.name };
  newTeamName.value = team.name;
  isTeamModalOpen.value = true;
}

async function saveTeam() {
  if (isCreatingTeam.value) {
    planStore.addTeam(newTeamName.value);
  }
  else if (selectedTeam.value) {
    planStore.updateTeam(selectedTeam.value.id, newTeamName.value);
  }
  isTeamModalOpen.value = false;
  await autoSave("Team Saved");
}

async function deleteTeam(teamId: string) {
  planStore.deleteTeam(teamId);
  await autoSave("Team Deleted");
}
</script>

<template>
  <UContainer class="py-12 max-w-4xl">
    <div class="space-y-8">
      <!-- Title & Actions Header -->
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 class="text-4xl font-bold tracking-tight text-on-surface">
            Teams
          </h1>
          <p class="text-sm text-neutral-500 mt-1">
            Manage your club teams, licenses, and member roles.
          </p>
        </div>
        <div class="flex gap-3">
          <UButton
            icon="i-lucide-users-round"
            variant="outline"
            @click="addMember"
          >
            Add Member
          </UButton>
          <UButton
            icon="i-lucide-plus"
            @click="openCreateTeam"
          >
            Create Team
          </UButton>
        </div>
      </div>

      <!-- Desktop Search Bar Top -->
      <div class="hidden md:block">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search members by name..."
          size="lg"
          class="w-full"
          clearable
        />
      </div>

      <!-- Teams Accordion List -->
      <div class="bg-surface-container-lowest rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden p-2">
        <UAccordion v-model="activeAccordions" :items="accordionItems" type="multiple">
          <template #body="{ item }">
            <div class="p-4 space-y-4">
              <!-- Team Actions (CRUD) / Header Details inside Accordion -->
              <div v-if="item.value !== 'teamless'" class="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div class="flex items-center gap-2">
                  <UBadge color="neutral" variant="soft" size="sm">
                    {{ getMembersForTeam(item.value).length }} members
                  </UBadge>
                </div>
                <div class="flex gap-2">
                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-lucide-pencil"
                    color="neutral"
                    @click.stop="openEditTeam(item.value)"
                  >
                    Edit Name
                  </UButton>
                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    color="error"
                    @click.stop="deleteTeam(item.value)"
                  >
                    Delete Team
                  </UButton>
                </div>
              </div>

              <!-- Inside Members List -->
              <div v-if="getMembersForTeam(item.value).length === 0" class="text-sm text-neutral-400 py-2 text-center">
                No members found
              </div>
              <div v-else v-auto-animate class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  v-for="member in getMembersForTeam(item.value)"
                  :key="member.id"
                  :data-search-hit="searchQuery && member.name.toLowerCase().includes(searchQuery.toLowerCase())"
                  class="flex items-center justify-between p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-surface hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all cursor-pointer"
                  @click="openMemberDetails(member)"
                >
                  <div class="flex items-center gap-3">
                    <UAvatar :alt="member.name" size="sm" class="font-bold">
                      {{ getInitials(member.name) }}
                    </UAvatar>
                    <div>
                      <h3 class="text-sm font-semibold text-on-surface">
                        {{ member.name }}
                      </h3>
                      <!-- Tags for Team Assignments -->
                      <div class="flex flex-wrap gap-1 mt-1">
                        <UBadge
                          v-for="tId in member.teamIds"
                          :key="tId"
                          size="xs"
                          variant="soft"
                        >
                          {{ planStore.teams[tId]?.name || tId }}
                        </UBadge>
                      </div>
                    </div>
                  </div>

                  <!-- Licenses (Referee, Timekeeper) with Strikethrough if Lacking -->
                  <div class="flex gap-2 items-center">
                    <!-- Referee License -->
                    <div
                      class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold"
                      :class="member.skillIds.includes('referee') ? 'text-success bg-success/10' : 'line-through text-neutral-400 opacity-40 bg-neutral-100 dark:bg-neutral-800'"
                    >
                      <UIcon name="i-lucide-award" class="w-3.5 h-3.5 mr-0.5" />
                      Ref
                    </div>
                    <!-- Timekeeper License -->
                    <div
                      class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold"
                      :class="member.skillIds.includes('esb') ? 'text-info bg-info/10' : 'line-through text-neutral-400 opacity-40 bg-neutral-100 dark:bg-neutral-800'"
                    >
                      <UIcon name="i-lucide-clock" class="w-3.5 h-3.5 mr-0.5" />
                      Time
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UAccordion>
      </div>

      <!-- Mobile Search Bar Bottom floating -->
      <div class="md:hidden fixed bottom-6 left-4 right-4 z-40 bg-surface-container-low shadow-xl border border-neutral-200 dark:border-neutral-800 rounded-full p-2 max-w-md mx-auto">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search members..."
          size="md"
          class="rounded-full"
          clearable
        />
      </div>
    </div>

    <!-- Member Details & Assignment Modal -->
    <UModal v-model:open="isMemberModalOpen" title="Member Details">
      <template #body>
        <div v-if="selectedMember" class="space-y-6">
          <!-- Name Input -->
          <UFormField label="Full Name">
            <UInput v-model="selectedMember.name" class="w-full" />
          </UFormField>

          <!-- Licenses (Toggles) -->
          <div>
            <span class="block text-sm font-medium mb-2 text-on-surface">Licenses</span>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex items-center gap-2">
                <USwitch
                  id="license-referee"
                  :model-value="selectedMember.skillIds.includes('referee')"
                  @update:model-value="(val) => {
                    if (val) selectedMember!.skillIds.push('referee');
                    else selectedMember!.skillIds = selectedMember!.skillIds.filter(s => s !== 'referee');
                  }"
                />
                <label for="license-referee" class="text-sm font-medium">Referee License</label>
              </div>
              <div class="flex items-center gap-2">
                <USwitch
                  id="license-esb"
                  :model-value="selectedMember.skillIds.includes('esb')"
                  @update:model-value="(val) => {
                    if (val) selectedMember!.skillIds.push('esb');
                    else selectedMember!.skillIds = selectedMember!.skillIds.filter(s => s !== 'esb');
                  }"
                />
                <label for="license-esb" class="text-sm font-medium">Timekeeper License (ESB)</label>
              </div>
            </div>
          </div>

          <!-- Team Assignments (Checkboxes) -->
          <div>
            <span class="block text-sm font-medium mb-2 text-on-surface">Team Assignments</span>
            <div class="space-y-2 max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
              <div
                v-for="team in planStore.teamsList"
                :key="team.id"
                class="flex items-center gap-2"
              >
                <UCheckbox
                  :id="`team-${team.id}`"
                  :model-value="selectedMember.teamIds.includes(team.id)"
                  @update:model-value="(val) => {
                    if (val) selectedMember!.teamIds.push(team.id);
                    else selectedMember!.teamIds = selectedMember!.teamIds.filter(t => t !== team.id);
                  }"
                />
                <label :for="`team-${team.id}`" class="text-sm">{{ team.name }}</label>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton variant="outline" color="neutral" @click="isMemberModalOpen = false">
            Cancel
          </UButton>
          <UButton @click="saveMember">
            Save Changes
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Team Add/Edit Modal -->
    <UModal v-model:open="isTeamModalOpen" :title="isCreatingTeam ? 'Create Team' : 'Edit Team'">
      <template #body>
        <UFormField label="Team Name">
          <UInput
            v-model="newTeamName"
            placeholder="e.g. Männer I, gem. E-Jugend"
            class="w-full"
            @keyup.enter="saveTeam"
          />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton variant="outline" color="neutral" @click="isTeamModalOpen = false">
            Cancel
          </UButton>
          <UButton :disabled="!newTeamName.trim()" @click="saveTeam">
            {{ isCreatingTeam ? 'Create' : 'Save' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
