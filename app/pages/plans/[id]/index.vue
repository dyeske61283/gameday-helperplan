<template>
    <div class="container mx-auto p-4 flex flex-col items-center flex-1">
      <span class="text-sm">Plan ID from composable: {{ planId }}</span>
      <span class="text-sm">Plan ID from route: {{ planIdFromRoute }}</span>
      <span class="text-sm">Plan ID from route params: {{ planIdFromRouteParams }}</span>
      <span class="text-sm">Route: {{ $route.fullPath }}</span>
  </div>
</template>

<script lang="ts" setup>
  const route = useRoute();
  const planId = usePlanId();
  const planIdFromRoute = route.path.slice(route.path.lastIndexOf('/') + 1);
  const planIdFromRouteParams = route.params.id;
</script>