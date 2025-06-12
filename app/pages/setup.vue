<template>
    <div class="container mx-auto p-4 flex flex-col items-center flex-1">
        <h1 class="text-xl mb-8">Generiere Permalink...</h1>
        <span class="loading loading-ring loading-xl"></span>
    </div>
</template>
<script setup lang="ts">
    const planStore = usePlanStore();

    await callOnce(() => planStore.createPlan());

    setTimeout(async () => {
        await navigateTo('/plans/'+planStore.planId);
    }, 400)

</script>
