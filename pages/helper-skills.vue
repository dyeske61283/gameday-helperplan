<script lang="ts" setup>
import { ref } from 'vue';

const helperTypes = ref<string[]>(['Koch', 'Ballonflechter', 'Schiedsrichter']); // Example data
const selectedHelperType = ref<string | null>(null);
const skillsInput = ref<string>('');
const skills = ref<Record<string, string[]>>({});

const addSkill = () => {
  if (!selectedHelperType.value) return;
  if (!skills.value[selectedHelperType.value]) {
    skills.value[selectedHelperType.value] = [];
  }
  skills.value[selectedHelperType.value].push(skillsInput.value);
  skillsInput.value = '';
};
</script>

<template>
  <div class="container mx-auto p-4 flex flex-col items-center justify-center flex-1">
    <span class="text-xl">Fähigkeiten oder Lehrgänge für Helfer</span>
    <span class="text-sm font-extralight mb-4">Wähle einen Helfertyp und füge Fähigkeiten hinzu</span>
    <div class="flex flex-row w-80 m-4">
      <select class="select select-bordered w-full" v-model="selectedHelperType">
        <option disabled value="">Helfertyp auswählen</option>
        <option v-for="type in helperTypes" :key="type" :value="type">{{ type }}</option>
      </select>
    </div>
    <div v-if="selectedHelperType" class="flex flex-row w-80 m-4">
      <input type="text" class="input" placeholder="Fähigkeit oder Lehrgang..." name="New skill input" id="new-skill-input" v-model="skillsInput" @keyup.enter="addSkill">
      <button class="btn btn-primary ml-2" @click="addSkill()">+</button>
    </div>
    <ul class="list flex-grow max-h-90 w-80 text-center mt-4 bg-base-100 rounded-box shadow-md" v-auto-animate>
      <li class="list-row" v-for="(skillList, type) in skills" :key="type">
        <strong>{{ type }}</strong>
        <ul>
          <li v-for="(skill, index) in skillList" :key="index">{{ skill }}</li>
        </ul>
      </li>
    </ul>
    <NuxtLink to="" class="btn btn-soft mt-auto">Überspringen</NuxtLink>
  </div>
</template>