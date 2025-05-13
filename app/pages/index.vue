<template>
    <div class="container mx-auto p-4 flex flex-col items-center justify-center flex-1">
        <NuxtLink class="btn btn-primary btn-xl mt-24" to="/setup">Plan erstellen</NuxtLink>
        <div class="divider my-4">oder</div>
        <input type="text" placeholder="Link oder Code eingeben" class="input" />
    </div>
</template>
<script setup lang="ts">
 import { X } from 'lucide-vue-next';

</script>
