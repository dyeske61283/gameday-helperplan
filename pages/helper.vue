<template>
    <div class="container mx-auto p-4 flex flex-col flex-1">
        <!-- Add New Helper Form -->
        <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="card-title">Neuer Helfer</h2>
                <div class="divider"></div>
                <form @submit.prevent="addHelper" class="space-y-4">
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Name</span>
                        </label>
                        <input v-model="newHelper.name" type="text" class="input input-bordered" required />
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Lehrgänge</span>
                        </label>
                        <input v-model="newHelper.skillsInput" type="text" class="input input-bordered" />
                    </div>
                    <button type="submit" class="btn btn-primary w-full">Hinzufügen</button>
                </form>
            </div>
        </div>
        <div class="divider"></div>
        <ul class="list bg-base-100 rounded-box shadow-md">
            <li class="list-row" v-for="helper in availableHelpers" :key="helper.id">
                <div class="list-col-grow">
                    <div>{{ helper.name }}</div>
                    <div v-for="skill in helper.skills" :key="skill" class="badge badge-soft badge-primary badge-sm">{{
                        skill }}</div>
                </div>
                <button class="btn btn-square btn-ghost">
                    <Edit :size="18"></Edit>
                </button>
            </li>
        </ul>
    </div>
</template>

<script lang="ts" setup>
import type { Helper, HelperInput } from '~/types/types';
import { Edit } from 'lucide-vue-next';

const availableHelpers = ref<Helper[]>([
    { id: 1, name: 'John Doe', skills: ['Setup', 'Cleanup'] },
    { id: 2, name: 'Jane Smith', skills: ['Registration', 'Coordination'] },
]);

const newHelper = ref<HelperInput>({
    name: '',
    skillsInput: ''
});

const addHelper = () => {
    const helper = {
        id: Date.now(),
        name: newHelper.value.name,
        skills: newHelper.value.skillsInput.split(',').map(skill => skill.trim()).filter(Boolean)
    };
    availableHelpers.value.push(helper);
    newHelper.value.name = '';
    newHelper.value.skillsInput = '';
};
</script>
