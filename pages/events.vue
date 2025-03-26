<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold text-center mb-6">Events erstellen</h1>
    
    <!-- Import ICS File -->
    <section class="mb-8">
      <h2 class="text-xl font-semibold mb-4">Import Calendar File</h2>
      <div class="form-control">
        <label class="label">
          <span class="label-text">Upload ICS File</span>
        </label>
        <input type="file" accept=".ics" @change="handleFileUpload" class="file-input file-input-bordered w-full max-w-xs" />
      </div>
    </section>

    <!-- Add Event Form -->
    <section class="mb-8">
      <h2 class="text-xl font-semibold mb-4">Add Event</h2>
      <form @submit.prevent="addEvent" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-control">
          <label for="event-title" class="label">
            <span class="label-text">Title</span>
          </label>
          <input id="event-title" v-model="newEvent.title" type="text" class="input input-bordered" required />
        </div>
        <div class="form-control">
          <label for="event-date" class="label">
            <span class="label-text">Date</span>
          </label>
          <input id="event-date" v-model="newEvent.date" type="date" class="input input-bordered" required />
        </div>
        <div class="form-control">
          <label for="event-time" class="label">
            <span class="label-text">Time</span>
          </label>
          <input id="event-time" v-model="newEvent.time" type="time" class="input input-bordered" required />
        </div>
        <div class="form-control mt-4 md:col-span-2">
          <button type="submit" class="btn btn-primary w-full">Add Event</button>
        </div>
      </form>
    </section>

    <!-- Display Events -->
    <section>
      <h2 class="text-xl font-semibold mb-4">Events</h2>
      <ul class="list-disc pl-5 space-y-2">
        <li v-for="event in events" :key="event.id" class="p-2 bg-base-200 rounded-lg">
          <span class="font-bold">{{ event.title }}</span> - {{ event.date }} {{ event.time }}
        </li>
      </ul>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const events = ref<{ id: number; title: string; date: string; time: string }[]>([]);
const newEvent = ref({ title: '', date: '', time: '' });

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        parseICS(content);
      }
    };
    reader.readAsText(file);
  }
};

const parseICS = (icsContent: string) => {
  // Placeholder for parsing ICS content and adding events
  console.log('ICS content:', icsContent);
};

const addEvent = () => {
  const id = Date.now();
  events.value.push({ id, ...newEvent.value });
  newEvent.value = { title: '', date: '', time: '' };
};
</script>