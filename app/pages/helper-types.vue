<template>
  <div class="container mx-auto p-4 flex flex-col items-center justify-center flex-1">
    <span class="text-xl">Welche Arten von Helfern brauchst du?</span>
    <span class="text-sm font-extralight mb-4">Das kannst du später auch noch anpassen</span>
    <div class="flex flex-row w-80 m-4">
      <input type="text" class="input" placeholder="Koch, Ballonflechter, Schiedsrichter, ..." name="New helper type text input" id="new-helper-type-input" v-model="helperTypesInput" @keyup.enter="addHelperType">
      <button class="btn btn-primary ml-2" @click="addHelperType()">+</button>
    </div>
    <ul class="list flew-grow max-h-90 w-80 text-center mt-4 bg-base-100 rounded-box shadow-md" v-auto-animate>
      <li class="list-row" v-for="(item, index) in helperTypes" :key="index">{{item}}</li>
    </ul>
    <NuxtLink to="" class="btn btn-soft mt-auto">Überspringen</NuxtLink>
  </div>
</template>

<script lang="ts" setup>
  const helperTypes = ref<string[]>([]);
  const helperTypesInput = ref<string>('');

  const addHelperType = () => {
    helperTypes.value.push(helperTypesInput.value);
    helperTypesInput.value = '';
  };
</script>

<style>

</style>