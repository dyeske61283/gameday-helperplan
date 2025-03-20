<template>
    <div class="container mx-auto p-4 flex flex-col items-center justify-center flex-1">
        <NuxtLink class="btn btn-primary btn-xl mt-24" to="/setup">Plan erstellen</NuxtLink>
        <div class="divider my-4">oder</div>
        <input type="text" placeholder="Link oder Code eingeben" class="input" />
        <div role="alert" class="mt-auto alert alert-soft" v-if="showExample">
            <span class="">Wenn du dir erstmal ein Beispiel anschauen willst, dann <NuxtLink class="link"
                    to="./example">klicke hier.</NuxtLink></span>
            <div>
                <button class="btn btn-sm btn-ghost" @click="closeExample"><X></X></button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
 import { X } from 'lucide-vue-next';
 const showExample = useShowExampleLink();

 const closeExample = () => {
    showExample.value = false;
 }
</script>
