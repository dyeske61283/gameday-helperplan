<script lang="ts" setup>

  const eventName = ref('');
  const eventDate = ref('');

  function createEvent() {
    // Hier Logik zum Erstellen des Events hinzufügen
    console.log('Event erstellt:', eventName.value, eventDate.value);
  }
</script>

<template>
  <div>
    <h1>Neues Event</h1>
    <form @submit.prevent="createEvent">
      <div class="form-group">
        <label for="eventName">Event Name</label>
        <input id="eventName" v-model="eventName" type="text" class="input" required />
      </div>
      <div class="form-group">
        <label for="eventDate">Datum</label>
        <input id="eventDate" v-model="eventDate" type="date" class="input" required />
      </div>
      <button type="submit" class="btn btn-primary">Event erstellen</button>
    </form>
  </div>
</template>