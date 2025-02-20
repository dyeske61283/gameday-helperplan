<template>
    <div class="container mx-auto p-4 flex flex-col items-center flex-1">
        <h1 class="text-xl mb-8">Generiere Permalink...</h1>
        <span class="loading loading-ring loading-xl"></span>
    </div>
</template>
<script setup lang="ts">
    const planId = usePlanId();
    if(!planId.value) {
        planId.value = crypto.randomUUID();
    }
    setTimeout(async () => {
        const planId = usePlanId();
        await navigateTo('/plans/'+planId.value);
    }, 400)

</script>
