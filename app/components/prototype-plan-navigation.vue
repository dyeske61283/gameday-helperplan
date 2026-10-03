<!-- PROTOTYPE: three plan-navigation variants, switchable via ?prototype=navigation&variant=. -->
<script setup lang="ts">
import type { SeasonPlan } from "~/utils/plan-types";
import { createPlanLink } from "~/utils/plan-links";

const props = defineProps<{
  plan: SeasonPlan;
  planId: string;
  planKey: string | null;
}>();

const route = useRoute();
const router = useRouter();
const variants = ["a", "b", "c", "d"] as const;
const names = {
  a: "Shared shell",
  b: "Manage plan",
  c: "Action board",
  d: "Schedule + edit mode",
};
const variant = computed(() => variants.includes(route.query.variant as typeof variants[number])
  ? route.query.variant as typeof variants[number]
  : "a");
const editMode = ref(false);

function setVariant(next: typeof variants[number]) {
  router.replace({ query: { ...route.query, prototype: "navigation", variant: next } });
}

function cycle(direction: 1 | -1) {
  const index = variants.indexOf(variant.value);
  setVariant(variants[(index + direction + variants.length) % variants.length]!);
}

function link(path = "") {
  const pathname = `/plans/${props.planId}${path}`;
  return props.planKey ? createPlanLink(props.planId, props.planKey, pathname) : pathname;
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  if (target.matches("input, textarea, select, [contenteditable='true']"))
    return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    cycle(-1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    cycle(1);
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  editMode.value = localStorage.getItem(`helperplan-prototype-edit-mode-${props.planId}`) === "on";
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
watch(editMode, (enabled) => {
  if (import.meta.client)
    localStorage.setItem(`helperplan-prototype-edit-mode-${props.planId}`, enabled ? "on" : "off");
});
</script>

<template>
  <div class="min-h-[70vh] bg-neutral-950 px-4 py-6 text-white sm:px-8">
    <div v-if="variant === 'a'" class="mx-auto max-w-5xl space-y-8">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
        <div>
          <p class="text-sm text-cyan-300">
            {{ plan.club.name }} · {{ plan.season }}
          </p>
          <h1 class="text-3xl font-bold">
            Gameday plan
          </h1>
        </div>
        <nav class="flex gap-2" aria-label="Plan navigation">
          <NuxtLink :to="link()" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950">
            Schedule
          </NuxtLink>
          <NuxtLink :to="link('/cockpit')" class="rounded-full px-4 py-2 text-sm text-white/70 hover:bg-white/10">
            My duties
          </NuxtLink>
          <NuxtLink :to="link('/assignments')" class="rounded-full px-4 py-2 text-sm text-white/70 hover:bg-white/10">
            Manage
          </NuxtLink>
        </nav>
      </header>
      <section class="grid gap-4 sm:grid-cols-3">
        <NuxtLink :to="link()" class="rounded-2xl bg-cyan-400 p-6 text-neutral-950 sm:col-span-2">
          <p class="text-sm font-semibold uppercase tracking-widest">
            For everyone
          </p>
          <h2 class="mt-10 text-2xl font-bold">
            View the fixture schedule
          </h2>
          <p class="mt-2 text-sm">
            Find an open duty and claim it from the match page.
          </p>
        </NuxtLink>
        <div class="space-y-4">
          <NuxtLink :to="link('/assignments')" class="block rounded-2xl bg-white/10 p-5 hover:bg-white/15">
            <span class="text-2xl">✦</span><h2 class="mt-5 font-semibold">
              Assignments
            </h2><p class="mt-1 text-sm text-white/60">
              Staff every duty
            </p>
          </NuxtLink>
          <NuxtLink :to="link('/teams')" class="block rounded-2xl bg-white/10 p-5 hover:bg-white/15">
            <span class="text-2xl">♧</span><h2 class="mt-5 font-semibold">
              Teams & members
            </h2><p class="mt-1 text-sm text-white/60">
              Keep the roster current
            </p>
          </NuxtLink>
        </div>
      </section>
    </div>

    <div v-else-if="variant === 'b'" class="mx-auto grid max-w-6xl gap-8 md:grid-cols-[15rem_1fr]">
      <aside class="rounded-3xl bg-white/10 p-5">
        <p class="text-xs font-bold uppercase tracking-widest text-cyan-300">
          {{ plan.club.name }}
        </p>
        <h1 class="mt-2 text-xl font-bold">
          {{ plan.season }}
        </h1>
        <nav class="mt-10 space-y-2" aria-label="Manage plan navigation">
          <NuxtLink :to="link()" class="block rounded-xl px-3 py-2 text-white/60 hover:bg-white/10">
            ← Schedule
          </NuxtLink>
          <NuxtLink :to="link('/assignments')" class="block rounded-xl bg-cyan-400 px-3 py-2 font-semibold text-neutral-950">
            Assignments
          </NuxtLink>
          <NuxtLink :to="link('/teams')" class="block rounded-xl px-3 py-2 text-white/70 hover:bg-white/10">
            Teams & members
          </NuxtLink>
          <NuxtLink :to="link('/setup')" class="block rounded-xl px-3 py-2 text-white/70 hover:bg-white/10">
            Plan setup
          </NuxtLink>
        </nav>
      </aside>
      <main class="space-y-8">
        <header class="flex items-end justify-between gap-4">
          <div>
            <p class="text-sm text-white/50">
              Manage plan
            </p><h2 class="text-4xl font-bold">
              Keep everyone moving
            </h2>
          </div>
          <NuxtLink :to="link('/cockpit')" class="rounded-full border border-white/20 px-4 py-2 text-sm">
            My duties
          </NuxtLink>
        </header>
        <section class="grid gap-4 sm:grid-cols-3">
          <NuxtLink :to="link('/assignments')" class="rounded-2xl border border-cyan-300/40 bg-cyan-300/10 p-5">
            <p class="text-sm text-white/60">
              Staffing
            </p><p class="mt-8 text-xl font-bold">
              Assignments
            </p><p class="mt-1 text-sm text-white/60">
              Review open slots and conflicts.
            </p>
          </NuxtLink>
          <NuxtLink :to="link('/teams')" class="rounded-2xl border border-white/15 p-5">
            <p class="text-sm text-white/60">
              Roster
            </p><p class="mt-8 text-xl font-bold">
              Teams
            </p><p class="mt-1 text-sm text-white/60">
              Members, skills, and teams.
            </p>
          </NuxtLink>
          <NuxtLink :to="link('/setup')" class="rounded-2xl border border-white/15 p-5">
            <p class="text-sm text-white/60">
              Configuration
            </p><p class="mt-8 text-xl font-bold">
              Setup
            </p><p class="mt-1 text-sm text-white/60">
              Season details and duty roles.
            </p>
          </NuxtLink>
        </section>
      </main>
    </div>

    <div v-else-if="variant === 'c'" class="mx-auto max-w-6xl">
      <header class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm text-cyan-300">
            {{ plan.club.name }}
          </p><h1 class="text-3xl font-bold">
            {{ plan.season }} board
          </h1>
        </div>
        <NuxtLink :to="link('/cockpit')" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950">
          My duties
        </NuxtLink>
      </header>
      <div class="mt-10 grid gap-3 sm:grid-cols-2">
        <NuxtLink :to="link()" class="group rounded-3xl bg-cyan-400 p-6 text-neutral-950 sm:row-span-2">
          <p class="text-xs font-bold uppercase tracking-widest">
            Start here
          </p><h2 class="mt-28 text-3xl font-bold">
            See the schedule <span class="transition group-hover:ml-2">→</span>
          </h2><p class="mt-2 max-w-xs text-sm">
            Browse fixtures, open a match, and claim a duty.
          </p>
        </NuxtLink>
        <NuxtLink :to="link('/assignments')" class="rounded-3xl bg-white/10 p-6 hover:bg-white/15">
          <p class="text-xs font-bold uppercase tracking-widest text-white/50">
            For coordinators
          </p><h2 class="mt-12 text-2xl font-bold">
            Staff assignments →
          </h2>
        </NuxtLink>
        <NuxtLink :to="link('/teams')" class="rounded-3xl bg-white/10 p-6 hover:bg-white/15">
          <p class="text-xs font-bold uppercase tracking-widest text-white/50">
            For coordinators
          </p><h2 class="mt-12 text-2xl font-bold">
            Edit the roster →
          </h2>
        </NuxtLink>
      </div>
    </div>

    <div v-else class="mx-auto max-w-6xl">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
        <div>
          <p class="text-sm text-cyan-300">
            {{ plan.club.name }} · {{ plan.season }}
          </p><h1 class="text-3xl font-bold">
            Current schedule
          </h1>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink :to="link('/cockpit')" class="rounded-full px-3 py-2 text-sm text-white/70 hover:bg-white/10">
            My duties
          </NuxtLink>
          <label class="flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-sm">
            <span>Edit mode</span>
            <input v-model="editMode" type="checkbox" class="accent-cyan-400">
          </label>
          <details v-if="editMode" class="relative">
            <summary class="cursor-pointer list-none rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-neutral-950">
              Manage
            </summary>
            <nav class="absolute right-0 top-12 z-10 min-w-48 space-y-1 rounded-2xl border border-white/15 bg-neutral-900 p-2 shadow-xl" aria-label="Edit mode navigation">
              <NuxtLink :to="link('/assignments')" class="block rounded-xl px-3 py-2 hover:bg-white/10">
                Assignments
              </NuxtLink>
              <NuxtLink :to="link('/teams')" class="block rounded-xl px-3 py-2 hover:bg-white/10">
                Teams & members
              </NuxtLink>
              <NuxtLink :to="link('/setup')" class="block rounded-xl px-3 py-2 hover:bg-white/10">
                Plan setup
              </NuxtLink>
            </nav>
          </details>
        </div>
      </header>
      <main class="mt-8 space-y-5">
        <p class="text-white/60">
          The schedule stays the landing page. Turn on Edit mode only when you need to change the plan.
        </p>
        <div v-for="gameday in plan.gamedays" :key="gameday.id" class="rounded-2xl border border-white/15 bg-white/5 p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-xl font-bold">
              {{ gameday.date }}
            </h2><span class="text-sm text-white/50">{{ gameday.matchIds.length }} matches</span>
          </div>
          <p class="mt-2 text-sm text-white/60">
            Open the schedule to browse duties and claim an available slot.
          </p>
        </div>
      </main>
    </div>
  </div>

  <div class="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit items-center gap-3 rounded-full border border-white/20 bg-neutral-900 px-3 py-2 text-sm text-white shadow-2xl" aria-label="Prototype variant switcher">
    <button type="button" class="rounded-full px-2 py-1 hover:bg-white/10" aria-label="Previous variant" @click="cycle(-1)">
      ←
    </button>
    <span class="min-w-36 text-center font-mono">{{ variant.toUpperCase() }} · {{ names[variant] }}</span>
    <button type="button" class="rounded-full px-2 py-1 hover:bg-white/10" aria-label="Next variant" @click="cycle(1)">
      →
    </button>
  </div>
</template>
