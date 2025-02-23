<template>
  <div class="min-h-screen bg-base-200">
    <!-- Top Navigation -->
    <div class="navbar bg-base-100 shadow-lg sticky top-0 z-10">
      <div class="flex-none">
        <button 
          @click="view = view === 'events' ? 'helpers' : 'events'"
          class="btn btn-ghost"
        >
          {{ view === 'events' ? 'Show Helpers' : 'Show Events' }}
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="p-4 sticky top-16 bg-base-200 z-10">
      <div class="form-control">
        <div class="input w-full">
          <Search :size="12"></Search>
          <input 
            v-model="searchQuery"
            placeholder="Search..."
            type="search"
            class="grow"/>
        </div>
      </div>
      
      <!-- Filters -->
      <div class="flex gap-2 mt-2 overflow-x-auto pb-2">
        <button 
          v-for="skill in uniqueSkills" 
          :key="skill"
          @click="toggleSkillFilter(skill)"
          :class="['btn btn-sm', selectedSkills.includes(skill) ? 'btn-primary' : 'btn-soft']"
        >
          {{ skill }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <!-- Events View -->
      <div v-if="view === 'events'">
        <div v-for="event in filteredEvents" :key="event.id" class="card bg-base-100 shadow-xl mb-4">
          <div class="card-body">
            <h2 class="card-title">{{ event.name }}</h2>
            <div class="divider">Assigned Helpers</div>
            <ul class="menu bg-base-100">
              <li v-for="helper in event.helpers" :key="helper.id">
                <div class="flex flex-col w-full">
                  <span class="font-medium">{{ helper.name }}</span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span 
                      v-for="skill in helper.skills" 
                      :key="skill"
                      class="badge badge-sm"
                    >
                      {{ skill }}
                    </span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Helpers View -->
      <div v-else>
        <div v-for="helper in filteredHelpers" :key="helper.id" class="card bg-base-100 shadow-xl mb-4">
          <div class="card-body">
            <h2 class="card-title">{{ helper.name }}</h2>
            <div class="flex flex-wrap gap-1 mb-2">
              <span 
                v-for="skill in helper.skills" 
                :key="skill"
                class="badge badge-primary"
              >
                {{ skill }}
              </span>
            </div>
            <div class="text-sm text-gray-600">
              {{ getHelperEventAssignment(helper) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {SetDummyData} from "~/utils/SetDummyData.js";
import { Search } from "lucide-vue-next";

const route = useRoute();
const planId = route.params.id;
const view = ref('events');
const searchQuery = ref('');
const selectedSkills = ref([]);

// Load session data
const planData = ref(null);
const loadError = ref(null);

// onMounted(async () => {
//   const storedData = localStorage.getItem(`plan_${sessionId}`);
//   if (!storedData) {
//     loadError.value = 'Session not found';
//     return;
//   }
//
//   try {
//     sessionData.value = JSON.parse(storedData);
//   } catch (error) {
//     loadError.value = 'Invalid session data';
//     return;
//   }
// });
// Set dummy data
planData.value = SetDummyData();

// Computed properties
const events = computed(() => planData.value?.events || []);
const allHelpers = computed(() => {
  const available = planData.value?.availableHelpers || [];
  const assigned = events.value.flatMap(event => event.helpers);
  return [...available, ...assigned];
});

const uniqueSkills = computed(() => {
  const skills = new Set();
  allHelpers.value.forEach(helper => {
    helper.skills.forEach(skill => skills.add(skill));
  });
  return Array.from(skills);
});

// Filtering logic
const filteredEvents = computed(() => {
  return events.value.filter(event => {
    const matchesSearch = searchQuery.value === '' || 
      event.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      event.helpers.some(helper => 
        helper.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      );

    const matchesSkills = selectedSkills.value.length === 0 ||
      event.helpers.some(helper => 
        helper.skills.some(skill => selectedSkills.value.includes(skill))
      );

    return matchesSearch && matchesSkills;
  });
});

const filteredHelpers = computed(() => {
  return allHelpers.value.filter(helper => {
    const matchesSearch = searchQuery.value === '' || 
      helper.name.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesSkills = selectedSkills.value.length === 0 ||
      helper.skills.some(skill => selectedSkills.value.includes(skill));

    return matchesSearch && matchesSkills;
  });
});

// Helper functions
const toggleSkillFilter = (skill) => {
  const index = selectedSkills.value.indexOf(skill);
  if (index === -1) {
    selectedSkills.value.push(skill);
  } else {
    selectedSkills.value.splice(index, 1);
  }
};

const getHelperEventAssignment = (helper) => {
  const assignedEvent = events.value.find(event => 
    event.helpers.some(h => h.id === helper.id)
  );
  return assignedEvent 
    ? `Assigned to: ${assignedEvent.name}`
    : 'Available';
};
</script>

<style scoped>
/* Custom scrollbar for filters */
.overflow-x-auto {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}
</style>