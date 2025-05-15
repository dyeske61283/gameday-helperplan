<template>
  <div class="min-h-screen max-h-screen bg-base-200 flex flex-col">
    <div class="navbar sticky top-0 z-50 bg-base-100">
      <div class="flex-1 p-2">
        <span class="text-xl font-bold">Helferplan</span>
      </div>
      <div class="flex-none">
        <label class="btn btn-soft swap mr-2" v-if="planStore.planId">
          <!-- this hidden checkbox controls the state -->
          <input type="checkbox" />
          <Calendar class="swap-off"></Calendar>
          <Users class="swap-on"></Users>
        </label>
        <div class="dropdown dropdown-bottom dropdown-end">
          <button tabindex="0" class="btn btn-primary btn-soft">
            <Menu></Menu>
          </button>
          <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
            <li>
              <NuxtLink>Neuen Plan erstellen</NuxtLink>
            </li>
            <li>
              <NuxtLink>Anderen Plan auswählen</NuxtLink>
            </li>
            <li>
              <NuxtLink>Beispiel Plan</NuxtLink>
            </li>
            <li>
              <NuxtLink>Wie's funktioniert?</NuxtLink>
            </li>
            <li>
              <NuxtLink>Impressum</NuxtLink>
            </li>
            <li>
              <NuxtLink to="https://github.com/dyeske61283/gameday-helperplan" target="_blank">
                Open Source auf <GitHubIcon class="ml-auto"></GitHubIcon>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="flex-1">
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
import { GitHubIcon } from 'vue3-simple-icons';
import { Calendar, Menu, Users } from 'lucide-vue-next';

const planStore = usePlanStore();
</script>