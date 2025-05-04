<script lang="ts" setup>

  definePageMeta({
    pageTransition: {
      name: '',
      mode: 'default'
    },
  });

  const eventId = useRoute().params.eventId;
</script>

<template>
  <h2>
    Hello from eventId: {{ eventId }}
  </h2>
</template>

<style scoped>
h2 {
    view-transition-name: event-title;
  }
</style>