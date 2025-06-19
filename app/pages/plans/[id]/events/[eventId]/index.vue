<template>
  <div v-if="loading" class="page-status">
    <p>Loading event data...</p>
  </div>
  <div v-else-if="event" class="event-details-container">
    <h1>{{ event.name }}</h1>

    <section class="event-actions">
      <h2>Actions</h2>
      <button @click="handleEdit">Edit Event</button>
      <button @click="handleDuplicate">Duplicate Event</button>
      <button @click="handleDelete">Delete Event</button>
    </section>

    <section class="event-meta">
      <h2>Details</h2>
      <p><strong>Date & Time:</strong> {{ formattedTimestamp }}</p>
      <div v-if="event.location">
        <p>
          <strong>Location:</strong>
          <a v-if="event.location.mapsUrl" :href="event.location.mapsUrl" target="_blank" rel="noopener noreferrer">
            {{ event.location.name }}
          </a>
          <span v-else>{{ event.location.name }}</span>
        </p>
        <p v-if="event.location.address"><strong>Address:</strong> {{ event.location.address }}</p>
        <p v-if="event.location.description"><strong>Description:</strong> {{ event.location.description }}</p>
      </div>
      <p v-else><strong>Location:</strong> Not specified</p>
    </section>

    <section class="needed-helpers">
      <h2>Needed Helpers & Skills</h2>
      <div v-if="event.neededHelpers && event.neededHelpers.length > 0">
        <ul>
          <li v-for="(slot, index) in event.neededHelpers" :key="index">
            <strong>{{ slot.name }}</strong>
            <ul v-if="slot.neededSkills && slot.neededSkills.length > 0">
              <li v-for="skill in slot.neededSkills" :key="skill">{{ skill }}</li>
            </ul>
            <p v-else>No specific skills listed for this role.</p>
          </li>
        </ul>
      </div>
      <p v-else>No helpers needed for this event.</p>
    </section>

    <section class="assigned-missing-helpers">
      <h2>Assigned & Missing Helpers</h2>
      <div v-if="assignedAndMissingHelpers.length > 0">
        <ul>
          <li v-for="(item, index) in assignedAndMissingHelpers" :key="index" :class="{ missing: item.isMissing }">
            <strong>Role: {{ item.slotName }}</strong>
            <div v-if="item.assignedHelperName" class="assigned-slot-actions">
              <span>Assigned: {{ item.assignedHelperName }}</span>
              <button @click="handleSwapHelper(item.slotName, item.assignedHelperName)">Swap Helper</button>
            </div>
            <div v-else class="missing-slot-actions">
              <p class="missing-indicator">Status: Missing</p>
              <button @click="handleAssignHelper(item.slotName)">Assign Helper</button>
            </div>
            <!-- Optional: Display needed skills for context -->
            <!-- <p><i>Skills Required: {{ item.neededSkills.join(', ') || 'Any' }}</i></p> -->
          </li>
        </ul>
      </div>
      <p v-else>No helper roles defined for this event.</p>
    </section>

    <!-- Other sections will be added here later -->

  </div>
  <div v-else class="page-status">
    <p>Event not found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { usePlanStore } from '~/stores/Plan';
import type { Plan, Event, Helper, Location, HelperSlot } from '#shared/types/types'; // Adjusted path

const route = useRoute();
const planStore = usePlanStore();

const plan = ref<Plan | null>(null);
const event = ref<Event | null>(null);
const loading = ref(true);

onMounted(async () => {
  const planId = route.params.id as string;
  const eventId = Number(route.params.eventId); // Ensure eventId is a number

  if (planStore.planId !== planId) { // Check if plan is already loaded
    // @ts-ignore // TODO: Fix type for planStore.plan
    plan.value = await planStore.fetchPlan(planId);
  } else {
    // @ts-ignore // TODO: Fix type for planStore.plan
    plan.value = planStore.plan;
  }

  if (plan.value && plan.value.events) {
    // @ts-ignore // TODO: Fix type for plan.value.events
    event.value = plan.value.events.find(e => e.id === eventId) || null;
  }
  loading.value = false;
});

const formattedTimestamp = computed(() => {
  if (event.value?.timestamp) {
    return new Date(event.value.timestamp).toLocaleString();
  }
  return 'Date not set';
});

const assignedAndMissingHelpers = computed(() => {
  if (!event.value || !event.value.neededHelpers) return [];

  // Create a mutable copy of assigned helpers to track who has been "assigned" in this computed property
  const availableAssignedHelpers = event.value.helpers ? [...event.value.helpers] : [];

  return event.value.neededHelpers.map(slot => {
    let foundHelper: Helper | undefined = undefined;

    // Attempt to find an available helper from event.helpers whose skills match the slot's neededSkills
    // A helper is suitable if they possess all skills required by the slot.
    // If slot has no specific skills, any helper could be theoretically assigned (though less likely in practice).
    const bestMatchIndex = availableAssignedHelpers.findIndex(helper => {
      if (!slot.neededSkills || slot.neededSkills.length === 0) return true; // Or false, depending on desired behavior
      return slot.neededSkills.every(skill => helper.skills.includes(skill));
    });

    if (bestMatchIndex !== -1) {
      foundHelper = availableAssignedHelpers[bestMatchIndex];
      availableAssignedHelpers.splice(bestMatchIndex, 1); // Remove this helper so they can't be assigned to another slot
    }

    return {
      slotName: slot.name,
      neededSkills: slot.neededSkills, // Keep for display if needed
      assignedHelperName: foundHelper ? foundHelper.name : null,
      isMissing: !foundHelper
    };
  });
});

const handleEdit = () => {
  console.log('Attempting to edit event:', event.value?.id);
  // Actual edit logic will be implemented later
  alert('Edit functionality not yet implemented.');
};

const handleDuplicate = () => {
  console.log('Attempting to duplicate event:', event.value?.id);
  // Actual duplicate logic will be implemented later
  alert('Duplicate functionality not yet implemented.');
};

const handleDelete = () => {
  console.log('Attempting to delete event:', event.value?.id);
  if (window.confirm(`Are you sure you want to delete the event "${event.value?.name || 'this event'}"? This action cannot be undone.`)) {
    console.log('User confirmed deletion for event:', event.value?.id);
    // Actual delete logic (API call) will be implemented later
    alert('Event deletion confirmed (functionality not yet fully implemented).');
    // Potentially redirect or update UI after successful deletion in the future
  } else {
    console.log('User cancelled deletion for event:', event.value?.id);
    alert('Event deletion cancelled.');
  }
};

const handleAssignHelper = (slotName: string) => {
  console.log(`Attempting to assign helper to slot: ${slotName} for event: ${event.value?.id}`);
  // Actual assignment logic (e.g., showing a modal with available helpers) will be implemented later
  alert(`Assign Helper functionality for slot "${slotName}" not yet implemented.`);
};

const handleSwapHelper = (slotName: string, currentHelperName: string) => {
  console.log(`Attempting to swap helper '${currentHelperName}' for slot: ${slotName} for event: ${event.value?.id}`);
  // Actual swap logic (e.g., showing a modal with other available helpers with the same skills) will be implemented later
  alert(`Swap Helper functionality for slot "${slotName}" (currently ${currentHelperName}) not yet implemented.`);
};

// Dummy data for now, will be replaced by actual data fetched from the store
const dummyEvent = ref<Event>({
  id: 1,
  timestamp: new Date(),
  name: 'Dummy Event Name',
  location: {
    name: 'Dummy Location',
    address: '123 Dummy Street',
    mapsUrl: 'https://maps.google.com'
  },
  neededHelpers: [
    { name: 'Sound Engineer', neededSkills: ['Audio Mixing', 'Live Sound'] },
    { name: 'Lighting Technician', neededSkills: ['DMX Control', 'Stage Lighting'] }
  ],
  helpers: [
    { id: 101, name: 'John Doe', skills: ['Audio Mixing'], description: '', labels: [], helperLists: [] }
  ]
});

// Use dummy data if event is not found for now
event.value = event.value || dummyEvent.value;

</script>

<style scoped>
/* Root style for the component, affects all states */
/* :host or common wrapper style would go in a global stylesheet or app root component.
   For this component, we ensure the main containers handle their own styling.
   The base font-family should ideally be set globally (e.g., on body).
   If not, apply it to the primary containers. */

.event-details-container {
  max-width: 960px; /* Max width for readability */
  margin: 0 auto; /* Center the container */
  padding: 20px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  font-family: Arial, sans-serif; /* Apply base font here if not global */
}

.page-status {
  text-align: center;
  padding: 40px 20px;
  font-size: 1.2em;
  color: #666;
  font-family: Arial, sans-serif; /* Apply base font here if not global */
}

h1 {
  color: #333;
  text-align: center; /* Center the main event title */
  margin-bottom: 30px;
}

/* Adjust section spacing */
.event-details-container > section {
  margin-bottom: 25px; /* Consistent bottom margin for all direct child sections */
}
.event-details-container > section:last-child {
  margin-bottom: 0; /* No margin for the last section */
}

p { /* General paragraph styling, can be refined if needed */
  color: #666; /* Kept from original, ensure it's still desired */
  line-height: 1.6; /* Improve readability */
}

.event-meta {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 5px;
}

.event-meta h2 {
  margin-top: 0;
  color: #555;
}

.event-meta p {
  margin-bottom: 5px;
}

.needed-helpers {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 5px;
}

.needed-helpers h2 {
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 10px;
}

.needed-helpers ul {
  list-style-type: none;
  padding-left: 0;
}

.needed-helpers > ul > li {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.needed-helpers strong {
  display: block;
  margin-bottom: 5px;
  color: #555;
}

.needed-helpers ul ul {
  list-style-type: disc;
  padding-left: 20px;
  margin-top: 5px;
}

.needed-helpers ul ul li {
  font-size: 0.9em;
  color: #777;
}

.assigned-missing-helpers {
  margin-top: 20px;
  padding: 15px;
  background-color: #f0f8ff; /* Light AliceBlue */
  border-radius: 5px;
}

.assigned-missing-helpers h2 {
  color: #333;
  border-bottom: 1px solid #dde;
  padding-bottom: 10px;
  margin-bottom: 10px;
}

.assigned-missing-helpers ul {
  list-style-type: none;
  padding-left: 0;
}

.assigned-missing-helpers li {
  padding: 10px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 10px;
}

.assigned-missing-helpers li.missing {
  background-color: #fff0f0; /* Light pink for missing */
  border-left: 5px solid #d9534f; /* Red border for missing */
}

.assigned-missing-helpers .missing-indicator {
  color: #d9534f; /* Red text for missing status */
  font-weight: bold;
}

.assigned-missing-helpers strong {
  display: block;
  margin-bottom: 5px;
}

.assigned-slot-actions, .missing-slot-actions { /* Group common styles if any */
  margin-top: 5px;
}

.assigned-slot-actions button, .missing-slot-actions button { /* Common button styling */
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  margin-left: 10px; /* Add some space next to the helper name or status */
}

.assigned-slot-actions button {
    background-color: #ffc107; /* Amber/Yellow for swap */
    color: #212529; /* Darker text for better contrast on yellow */
}

.assigned-slot-actions button:hover {
  background-color: #e0a800;
}

/* Ensure .missing-slot-actions button still has its green color */
.missing-slot-actions button {
  background-color: #28a745; /* Green for assign */
  color: white; /* Ensure text is white for green button */
  margin-left: 0; /* No margin-left needed if it's on its own line after status */
}

.missing-slot-actions button:hover {
  background-color: #218838;
}

.assigned-slot-actions span { /* Style for the "Assigned: Helper Name" text */
    vertical-align: middle;
}
.assigned-slot-actions button {
    vertical-align: middle;
    margin-left: 8px;
}

.event-actions {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #e9ecef; /* Light grey */
  border-radius: 5px;
  text-align: right;
}

.event-actions h2 {
    display: none; /* Visually hide if buttons are self-explanatory */
}

.event-actions button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 15px;
  margin-left: 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.event-actions button:hover {
  background-color: #0056b3;
}

.event-actions button:first-child {
  margin-left: 0;
}

/* Specific styling for delete button if desired */
.event-actions button:last-child { /* Assuming Delete is the last button */
    background-color: #dc3545; /* Red for delete */
}
.event-actions button:last-child:hover {
    background-color: #c82333;
}
</style>
