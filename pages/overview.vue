<template>
    <div class="container mx-auto p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Event List -->
            <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                    <h2 class="card-title">Available Helpers</h2>
                    <div class="divider"></div>
                    <ul class="menu bg-base-100">
                        <li v-for="helper in availableHelpers" :key="helper.id">
                            <a @click="assignHelper(helper)" class="flex">
                                {{ helper.name }}
                                <span v-for="skill in helper.skills" :key="skill"
                                    class="badge badge-sm badge-primary">{{ skill }}</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Assigned Helpers -->
            <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                    <h2 class="card-title">Assigned Helpers</h2>
                    <div class="divider"></div>
                    <div v-for="event in events" :key="event.id" class="mb-4">
                        <h3 class="font-bold">{{ event.name }}</h3>
                        <ul class="menu bg-base-100">
                            <li v-for="helper in event.helpers" :key="helper.id">
                                <a @click="unassignHelper(helper, event)" class="flex justify-between">
                                    {{ helper.name }}
                                    <button class="btn btn-ghost btn-xs">Remove</button>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Add New Helper Form -->
            <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                    <h2 class="card-title">Add New Helper</h2>
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
                                <span class="label-text">Skills (comma-separated)</span>
                            </label>
                            <input v-model="newHelper.skillsInput" type="text" class="input input-bordered" />
                        </div>
                        <button type="submit" class="btn btn-primary w-full">Add Helper</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Helper, Event, HelperInput } from '~/types/types';

const availableHelpers = ref<Helper[]>([
    { id: 1, name: 'John Doe', skills: ['Setup', 'Cleanup'] },
    { id: 2, name: 'Jane Smith', skills: ['Registration', 'Coordination'] },
]);

const events = ref<Event[]>([
    {
        id: 1,
        name: 'Summer Festival',
        helpers: []
    },
    {
        id: 2,
        name: 'Tech Conference',
        helpers: []
    }
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

const assignHelper = (helper: Helper) => {
    const event = events.value[0]; // For simplicity, assigning to first event
    event.helpers.push(helper);
    availableHelpers.value = availableHelpers.value.filter(h => h.id !== helper.id);
};

const unassignHelper = (helper: Helper, event: Event) => {
    event.helpers = event.helpers.filter(h => h.id !== helper.id);
    availableHelpers.value.push(helper);
};
</script>