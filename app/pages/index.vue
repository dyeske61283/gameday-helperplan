<template>
    <div class="container mx-auto p-4 flex flex-col items-center justify-center flex-1">
        <NuxtLink class="btn btn-primary btn-xl mt-24" to="/setup">Plan erstellen</NuxtLink>
        <div class="divider my-4">oder</div>
        <form @submit.prevent="loadPlan" class="flex justify-center flex-grow w-full">
            <input id="plan-link-input" name="PlanLinkInput" type="text" placeholder="Link oder Code eingeben" class="input" v-model="planIdInput" @input="errorMessage = ''" />
            <button type="submit" class="btn btn-soft btn-primary ml-2"><ArrowRight></ArrowRight></button>
        </form>
        <p v-if="errorMessage" class="text-error text-sm mt-1">{{ errorMessage }}</p>
        <div class="divider my-4" v-if="planStore.planId">oder</div>
        <NuxtLink class="link" :to='{ name: "plans-id", params: { id: planStore.planId }}' v-if="planStore.planId">Letzten Plan aufrufen</NuxtLink>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { navigateTo } from '#app';
import { ArrowRight } from 'lucide-vue-next';

const planStore = usePlanStore();
const planIdInput = ref('');
const errorMessage = ref('');

const loadPlan = async () => {
    try {
        let id = planIdInput.value;
        if (id.includes('/')) {
            id = id.substring(id.lastIndexOf('/') + 1);
        }
        if (!id) {
            errorMessage.value = 'Bitte geben Sie eine Plan-ID oder einen Link ein.';
            return;
        }
        const response = await planStore.fetchPlan(id);
        if (response) {
            navigateTo(`/plans/${id}`);
        } else {
            errorMessage.value = 'Plan nicht gefunden oder ungültige Eingabe.';
        }
    } catch (error) {
        errorMessage.value = 'Fehler beim Laden des Plans.';
        console.error(error);
    }
};
</script>
