<template>
  <div class="h-full flex flex-col">
    <!-- Top Controls - Now properly sticky -->
    <div class="bg-base-100">
      <div class="flex items-center gap-1 px-2 pb-2 mt-1">
        <div class="flex-1">
          <div class="join w-full">
            <input type="text" placeholder="Search events..." class="input input-bordered join-item w-full"
              v-model="searchQuery" />
            <button class="btn join-item" @click="clearSearch">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <button class="btn btn-ghost" @click="toggleSortDirection">
          <CalendarArrowDown v-if="sortDirection === 'desc'"></CalendarArrowDown>
          <CalendarArrowUp v-if="sortDirection === 'asc'"></CalendarArrowUp>
        </button>
        <button class="btn btn-ghost" @click="openFilters">
          <div class="indicator">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span v-if="activeFilters > 0" class="badge badge-xs badge-primary indicator-item">{{ activeFilters
            }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Event List - Scrollable container -->
    <div class="flex-1 max-h-[82vh] px-4 overflow-auto" v-auto-animate>
      <template v-for="(events, date) in filteredAndSortedEvents" :key="date">
        <div id="event-date" class="sticky bg-base-200 font-bold top-0 z-10 m-1"> {{ formatDate(date as string) }}
        </div>
        <div class="p-4" v-auto-animate>
          <NuxtLink v-for="event in events" :key="event.id" :to="`/plans/${route.params.id}/events/${event.id}`" @click.native="selected = event.id"
            class="card bg-base-100 shadow-xl mb-4 hover:shadow-2xl transition-shadow cursor-pointer">
            <div class="card-body">
              <h2 :id="'event-title-' + event.id" :class="{ active: selected === event.id }" class="card-title">{{ event.name }}</h2>
              <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{{ event.location }}</span>
              </div>
              <div class="flex justify-between items-center mt-2">
                <span>{{ event.time }}</span>
                <div :class="getStatusBadgeClass(event.status)">
                  {{ getStatusText(event.status) }}
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </template>
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
          <li><a @click="addNewEvent">Add New Event</a></li>
          <li><a @click="importEvents">Import Events</a></li>
          <li><a @click="addHelpers">Add Helpers</a></li>
        </ul>
      </div>
    </div>

    <!-- Filter Modal -->
    <dialog id="filter_modal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Filter Events</h3>
        <div class="form-control">
          <label class="label cursor-pointer">
            <span class="label-text">Show Complete Events</span>
            <input type="checkbox" class="toggle" v-model="filters.showComplete" />
          </label>
          <label class="label cursor-pointer">
            <span class="label-text">Show Partially Staffed Events</span>
            <input type="checkbox" class="toggle" v-model="filters.showPartial" />
          </label>
          <label class="label cursor-pointer">
            <span class="label-text">Show Events Needing Help</span>
            <input type="checkbox" class="toggle" v-model="filters.showMissing" />
          </label>
        </div>
        <div class="modal-action">
          <form method="dialog">
            <button class="btn">Close</button>
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
import { ref, computed } from 'vue'
import { format } from 'date-fns'
import {CalendarArrowDown, CalendarArrowUp} from 'lucide-vue-next';

const route = useRoute();
const selected = useState();

// Sample data - replace with your actual data source
const events = ref<{date: string, id: number, name: string, location: string, time: string, status: 'complete' | 'missing' | 'partial'}[]>([
  {
    id: 1,
    name: 'Summer Festival',
    date: '2024-04-15',
    time: '14:00',
    location: 'Central Park',
    status: 'complete'
  },
  {
    id: 2,
    name: 'Charity Run',
    date: '2024-04-15',
    time: '08:00',
    location: 'City Stadium',
    status: 'partial'
  },
  {
    id: 3,
    name: 'Food Drive',
    date: '2024-04-16',
    time: '10:00',
    location: 'Community Center',
    status: 'missing'
  },
  {
    id: 4,
    name: 'Food Drive',
    date: '2024-04-16',
    time: '10:00',
    location: 'Community Center',
    status: 'missing'
  },
  {
    id: 5,
    name: 'Food Drive',
    date: '2024-04-16',
    time: '10:00',
    location: 'Community Center',
    status: 'missing'
  },
  {
    id: 6,
    name: 'Food Drive',
    date: '2024-04-16',
    time: '10:00',
    location: 'Community Center',
    status: 'missing'
  },
  {
    id: 7,
    name: 'Food Drive',
    date: '2024-04-16',
    time: '10:00',
    location: 'Community Center',
    status: 'missing'
  },
  {
    id: 8,
    name: 'Food Drive',
    date: '2024-04-16',
    time: '10:00',
    location: 'Community Center',
    status: 'missing'
  },
  {
    id: 9,
    name: 'Food Drive',
    date: '2024-04-16',
    time: '10:00',
    location: 'Community Center',
    status: 'missing'
  }
]);

// Search and filter state
const searchQuery = ref('')
const sortDirection = ref('asc')
const filters = ref({
  showComplete: true,
  showPartial: true,
  showMissing: true
})

// Computed property for active filters count
const activeFilters = computed(() => {
  return Object.values(filters.value).filter(v => !v).length
})

// Filter and sort events
const filteredAndSortedEvents = computed(() => {
  let filteredEvents = events.value.filter(event => {
    // Apply search filter
    const matchesSearch = !searchQuery.value ||
      event.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.value.toLowerCase())

    // Apply status filters
    const matchesStatus =
      (event.status === 'complete' && filters.value.showComplete) ||
      (event.status === 'partial' && filters.value.showPartial) ||
      (event.status === 'missing' && filters.value.showMissing)

    return matchesSearch && matchesStatus
  })

  // Sort events
  filteredEvents.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`)
    const dateB = new Date(`${b.date} ${b.time}`)
    return sortDirection.value === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
  })

  // Group by date
  return filteredEvents.reduce((groups: {[key: string]: {date: string, id: number, name: string, location: string, time: string, status: 'missing' | 'partial' | 'complete'}[]}, event) => {
    const date = event.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
    return groups
  }, {})
});

// Format date for display
const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
};

// Status badge styling
const getStatusBadgeClass = (status: 'complete' | 'partial' | 'missing') => {
  const baseClasses = 'badge'
  switch (status) {
    case 'complete':
      return `${baseClasses} badge-success`
    case 'partial':
      return `${baseClasses} badge-warning`
    case 'missing':
      return `${baseClasses} badge-error`
    default:
      return baseClasses
  }
};

// Status text
const getStatusText = (status: 'complete' | 'partial' | 'missing') => {
  switch (status) {
    case 'complete':
      return 'Helpers Assigned'
    case 'partial':
      return 'Partially Staffed'
    case 'missing':
      return 'Helpers Needed'
    default:
      return 'Unknown'
  }
};

const addNewEvent = () => {
  // Implement add new event logic
  console.log('Adding new event')
}

const importEvents = () => {
  // Implement import events logic
  console.log('Importing events')
}

const addHelpers = () => {
  // Implement add helpers logic
  console.log('Adding helpers')
}

const clearSearch = () => {
  searchQuery.value = ''
}

const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

const openFilters = () => {
  const filterModal = document.getElementById('filter_modal') as HTMLDialogElement;
  filterModal.showModal();
};
</script>

<style scoped>
  h2.active {
    view-transition-name: event-title;
  }
</style>