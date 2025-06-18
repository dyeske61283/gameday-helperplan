<template>
  <div class="h-full flex flex-col">
    <!-- Top Controls -->
    <div class="bg-base-100">
      <div class="flex items-center gap-1 px-2 pb-2 mt-1">
        <div class="flex-1">
          <label class="input input-bordered w-full">
            <input type="search" placeholder="Suche Helferlisten..." class="grow" v-model="searchQuery" />
          </label>
        </div>
        <button class="btn btn-ghost" @click="cycleSortState">
          <span class="mr-1 text-xs">{{ sortState.startsWith('name') ? 'Name' : 'Anzahl' }}</span>
          <CalendarArrowDown v-if="sortState.endsWith('_desc')"></CalendarArrowDown>
          <CalendarArrowUp v-if="sortState.endsWith('_asc')"></CalendarArrowUp>
        </button>
        <button class="btn btn-ghost" @click="openFilters">
          <div class="indicator">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span v-if="activeFilters > 0" class="badge badge-xs badge-primary indicator-item">{{ activeFilters }}</span>
          </div>
        </button>
        <label class="btn btn-soft swap" v-if="planStore.planId" @click="navigateToEvents">
          <!-- Checked by default: means "Users" (Helpers view) is active -->
          <input type="checkbox" checked />
          <Calendar class="swap-off"></Calendar> <!-- Shown if box becomes unchecked (would navigate to Events) -->
          <Users class="swap-on"></Users> <!-- Shown because box is checked (current view is Helpers) -->
        </label>
      </div>
    </div>

    <div class="flex flex-1 px-4 py-2 bg-base-200 flex-col items-center gap-4 mt-2" v-if="!planStore.planId || (plan && plan.helperLists && plan.helperLists.length === 0)">
      <p class="text-center text-xl mb-4">Keine Helferlisten im Plan.</p>
      <p>
        Füge neue Helferlisten hinzu, um sie hier anzuzeigen.
      </p>
    </div>

    <!-- Helper List - Scrollable container -->
    <div class="flex-1 max-h-[82vh] px-4 overflow-auto" v-auto-animate v-if="plan && plan.helperLists && plan.helperLists.length > 0">
      <div v-for="list in filteredAndSortedHelperLists" :key="list.name"
           class="card bg-base-100 shadow-xl mb-4 hover:shadow-2xl transition-shadow cursor-pointer"
           @click="navigateToHelperListDetail(list.name)">
        <div class="card-body">
          <h2 class="card-title">{{ list.name }}</h2>
          <p>Anzahl Helfer: {{ list.helpers.length }}</p>
          <div v-if="list.helpers.length > 0" class="text-sm mt-1">
            <p class="font-medium">Helfer:</p>
            <ul class="list-disc list-inside ml-2">
              <li v-for="helper in list.helpers.slice(0, 3)" :key="helper.id">
                {{ helper.name }}
              </li>
            </ul>
            <p v-if="list.helpers.length > 3" class="text-xs italic ml-2">
              ...und {{ list.helpers.length - 3 }} weitere.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Action Button -->
    <div class="fixed bottom-6 right-6 z-50">
      <div class="dropdown dropdown-top dropdown-end">
        <button tabindex="0" class="btn btn-primary btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
          <li><a @click="addNewHelperList">Neue Helferliste</a></li>
          <li><a @click="importHelpers">Helfer importieren</a></li>
          <li><a @click="viewAllHelpers">Alle Helfer anzeigen</a></li>
        </ul>
      </div>
    </div>

    <!-- Filter Modal -->
    <dialog id="filter_modal_helper_lists" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Filter Helferlisten</h3>

        <div class="form-control space-y-4">
          <div>
            <h4 class="font-semibold mb-2">Anzahl Helfer</h4>
            <div class="flex gap-2">
              <input type="number" class="input input-bordered w-full" v-model.number="filters.minHelpers" placeholder="Min. Anzahl" />
              <input type="number" class="input input-bordered w-full" v-model.number="filters.maxHelpers" placeholder="Max. Anzahl" />
            </div>
          </div>

          <div v-if="availableSkillsForFiltering.length > 0">
            <h4 class="font-semibold mb-2">Benötigte Skills (enthält mindestens einen der gewählten Skills)</h4>
            <div class="max-h-60 overflow-y-auto p-2 bg-base-200 rounded-md">
              <label class="label cursor-pointer" v-for="skill in availableSkillsForFiltering" :key="skill">
                <span class="label-text">{{ skill }}</span>
                <input type="checkbox" class="checkbox checkbox-primary" :value="skill" v-model="filters.requiredSkills" />
              </label>
            </div>
          </div>
        </div>

        <div class="modal-action mt-6">
          <button class="btn btn-ghost" @click="resetFilters">Filter zurücksetzen</button>
          <form method="dialog">
            <button class="btn btn-primary">Anwenden</button> <!-- Closes modal and applies filters implicitly due to v-model -->
          </form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlanStore } from '~/app/stores/Plan';
import type { Plan, HelperList } from '~/shared/types/types';
import { Users, Calendar, CalendarArrowDown, CalendarArrowUp } from 'lucide-vue-next';
import { vAutoAnimate } from '@formkit/auto-animate/vue';

const planStore = usePlanStore();
const route = useRoute();
const router = useRouter();

const plan = ref<Plan | null>(null);
const searchQuery = ref('');
// const sortDirection = ref<'asc' | 'desc'>('asc'); // Remove this
const sortState = ref<'name_asc' | 'name_desc' | 'helperCount_asc' | 'helperCount_desc'>('name_asc');
const filters = ref<{
  minHelpers: number | null;
  maxHelpers: number | null;
  requiredSkills: string[];
}>({
  minHelpers: null,
  maxHelpers: null,
  requiredSkills: [],
});

const availableSkillsForFiltering = ref<string[]>([]);

const activeFilters = computed(() => {
  let count = 0;
  if (filters.value.minHelpers !== null) count++;
  if (filters.value.maxHelpers !== null) count++;
  if (filters.value.requiredSkills.length > 0) count++;
  return count;
});

onMounted(async () => {
  const planId = route.params.id as string;
  if (planId) {
    const fetchedPlan = await planStore.fetchPlan(planId);
    if (fetchedPlan) {
      plan.value = fetchedPlan as Plan;
      if (plan.value && plan.value.neededSkills) {
        // Ensure unique skills
        availableSkillsForFiltering.value = [...new Set(plan.value.neededSkills)];
      }
    } else {
      console.error('Plan could not be fetched for helper lists page.');
    }
  }
});

function resetFilters() {
  filters.value.minHelpers = null;
  filters.value.maxHelpers = null;
  filters.value.requiredSkills = [];
}

const filteredAndSortedHelperLists = computed((): HelperList[] => {
  if (!plan.value || !plan.value.helperLists) {
    return [];
  }

  let listsToDisplay = [...plan.value.helperLists];
  const query = searchQuery.value.toLowerCase();

  // Search Filter
  if (query) {
    listsToDisplay = listsToDisplay.filter(list => {
      // Check list name
      if (list.name.toLowerCase().includes(query)) {
        return true;
      }
      // Check helpers within the list
      return list.helpers.some(helper => {
        if (helper.name.toLowerCase().includes(query)) return true;
        if (helper.description.toLowerCase().includes(query)) return true;
        if (helper.labels.some(label => label.toLowerCase().includes(query))) return true;
        if (helper.skills.some(skill => skill.toLowerCase().includes(query))) return true;
        return false;
      });
    });
  }

  // Search Filter (remains the same)
  if (query) {
    // ... (search logic as before)
    listsToDisplay = listsToDisplay.filter(list => {
      if (list.name.toLowerCase().includes(query)) return true;
      return list.helpers.some(helper => {
        if (helper.name.toLowerCase().includes(query)) return true;
        if (helper.description.toLowerCase().includes(query)) return true;
        if (helper.labels.some(label => label.toLowerCase().includes(query))) return true;
        if (helper.skills.some(skill => skill.toLowerCase().includes(query))) return true;
        return false;
      });
    });
  }

  // Apply Filters
  if (filters.value.minHelpers !== null) {
    listsToDisplay = listsToDisplay.filter(list => list.helpers.length >= (filters.value.minHelpers as number));
  }
  if (filters.value.maxHelpers !== null) {
    listsToDisplay = listsToDisplay.filter(list => list.helpers.length <= (filters.value.maxHelpers as number));
  }
  if (filters.value.requiredSkills.length > 0) {
    listsToDisplay = listsToDisplay.filter(list =>
      list.helpers.some(helper =>
        helper.skills.some(skill => (filters.value.requiredSkills as string[]).includes(skill))
      )
    );
  }

  // Sorting Logic (remains the same)
  // ... (sort logic as before)
  listsToDisplay.sort((a, b) => {
    // ... (existing sort logic using sortState)
    switch (sortState.value) {
      case 'name_asc':
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      case 'name_desc':
        return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
      case 'helperCount_asc':
        return a.helpers.length - b.helpers.length;
      case 'helperCount_desc':
        return b.helpers.length - a.helpers.length;
      default:
        return 0;
    }
  });

  return listsToDisplay;
});

// function toggleSortDirection() { // Rename and modify this
//   sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
// }
function cycleSortState() {
  switch (sortState.value) {
    case 'name_asc':
      sortState.value = 'name_desc';
      break;
    case 'name_desc':
      sortState.value = 'helperCount_asc';
      break;
    case 'helperCount_asc':
      sortState.value = 'helperCount_desc';
      break;
    case 'helperCount_desc':
      sortState.value = 'name_asc';
      break;
  }
}

function openFilters() {
  const filterModal = document.getElementById('filter_modal_helper_lists') as HTMLDialogElement;
  if (filterModal) {
    filterModal.showModal();
  }
}

function navigateToEvents() {
  router.push(`/plans/${route.params.id}/`);
}

function navigateToHelperListDetail(listName: string) {
  // Using encodeURIComponent for safety in URL
  router.push(`/plans/${route.params.id}/helpers/${encodeURIComponent(listName)}`);
}

function addNewHelperList() {
  console.log('Add new helper list clicked - placeholder');
  // Future: router.push(`/plans/${route.params.id}/helpers/new`);
}

function importHelpers() {
  console.log('Import helpers clicked - placeholder');
  // Future: Implement import helpers functionality
}

function viewAllHelpers() {
  console.log('View all helpers clicked - placeholder');
  // Future: router.push(`/plans/${route.params.id}/helpers/all`); // Example route
}
</script>

<style scoped>
/* Add any specific styles if needed, or adapt from event page */
.card-title {
  font-weight: bold; /* Example */
}
</style>
