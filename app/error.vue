<template>
    <div class="min-h-screen flex items-center justify-center bg-base-200">
        <div class="text-center">
            <h1 class="text-5xl font-bold mb-4 flex items-center justify-center">
                <AlertCircle class="mr-4" :size="32" /> 404
            </h1>
            <p class="text-xl mb-8">Hoppla, verlaufen?</p>
            <NuxtLink to="/" class="btn btn-primary">
                <Home class="" />
                Geh ham!
            </NuxtLink>
        </div>
    </div>
</template>

<script setup>
import { Home, AlertCircle } from 'lucide-vue-next';
defineProps({
    error: Object
})
</script>