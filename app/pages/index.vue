<script lang="ts" setup>
definePageMeta({
  layout: false,
});
</script>

<template>
  <UApp>
    <nav class="hidden md:flex justify-between items-center w-full px-6 h-16 bg-slate-50 sticky top-0 z-50">
      <div class="text-xl font-bold text-blue-800">
        Handball Helper
      </div>
      <div class="flex items-center space-x-8">
        <a class="text-blue-700 font-bold border-b-2 border-blue-700 pb-1" href="#">Dashboard</a>
        <a class="text-slate-600 hover:text-blue-600 transition-colors" href="#">Assignments</a>
        <a class="text-slate-600 hover:text-blue-600 transition-colors" href="#">Setup</a>
        <a class="text-slate-600 hover:text-blue-600 transition-colors" href="#">Guide</a>
      </div>
      <div class="flex items-center space-x-4">
        <button class="p-2 hover:bg-slate-200/50 rounded-full transition-colors active:opacity-80 active:scale-95">
          <UIcon name="i-lucide-share-2" size="32" class="text-primary" />
        </button>
      </div>
    </nav>
    <main class="relative isolate">
      <!-- Hero Section -->
      <section class="relative min-h-[870px] flex flex-col items-center justify-center px-6 overflow-hidden">
        <!-- Asymmetric Background Elements -->
        <div class="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div class="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl -z-10" />
        <div class="max-w-4xl w-full text-center space-y-8">
          <div
            class="inline-flex items-center px-4 py-2 mt-2 rounded-full bg-surface-container-high text-on-primary-fixed-variant text-sm font-semibold tracking-wide uppercase"
          >
            Focus on the Game, Not the Admin
          </div>
          <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-on-surface leading-tight">
            Effortless Match-Day <br>
            <span class="text-primary">Volunteer Coordination</span>
          </h1>
          <p class="text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            A streamlined tool for local handball clubs to organize officials, timekeepers, and court assistants. No
            accounts, no hassle—just high-performance management.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              class="kinetic-gradient bg-primary text-inverted px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
              href="#"
            >
              Go to Dashboard
              <UIcon name="i-lucide-arrow-right" :size="24" />
            </a>
            <a
              class="bg-surface-container-lowest text-primary border border-outline-variant/30 px-8 py-4 rounded-full font-bold text-lg hover:bg-surface-container-low transition-all active:scale-95"
              href="#"
            >
              Admin Setup
            </a>
          </div>
        </div>
        <!-- Kinetic Court Visual Mockup -->
        <div class="mt-20 w-full max-w-6xl relative">
          <div class="rounded-xl overflow-hidden shadow-2xl border-4 border-surface-container-highest">
            <img
              alt="Handball Action" class="w-full h-[400px] object-cover"
              data-alt="Cinematic wide shot of a handball match in progress, dynamic movement, indoor arena lighting, vibrant team jerseys"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0PI81AoJd8CGYPk48gTBQdATKhLbfpVSHiHHsfxIMESPqqAx4KFBQitDD-u7ZrjsshdZGMFma6ET6XmfttFPLb6k7Tr_bBSpiS7iKMWPCHAbv-wMfIfP3Z4hx_ddNFyzae1FTZ3VLZBKaK0Io0Q1s_NPr-__k2KHv_HK8xb972EbbHchUM3zOWRFVtYMLMjVKLcpNwMBY6LSb7jQKagMxYh_sw5fQIzWrjMqXRJtVuAnFtpvoGtgM9XRCvglXXDsRf5lOVAtGupVY"
            >
            <div class="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
        </div>
      </section>
      <!-- Bento Grid Features Section -->
      <section class="max-w-7xl mx-auto px-6 py-24">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
          <!-- Main Feature -->
          <div class="md:col-span-7 bg-surface-container-low p-10 rounded-xl relative overflow-hidden group">
            <div class="relative z-10 space-y-4">
              <div class="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-6">
                <UIcon name="i-lucide-user-x" class="text-white" :size="24" />
              </div>
              <h3 class="text-3xl font-bold text-on-surface">
                Zero Friction Signup
              </h3>
              <p class="text-on-surface-variant text-lg leading-relaxed">
                No logins, no passwords, no registration forms. Start managing your match-day immediately with local
                browser storage.
              </p>
            </div>
            <div class="absolute -bottom-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity">
              <UIcon name="i-lucide-gauge" class="text-[200px]" />
            </div>
          </div>
          <!-- Secondary Feature -->
          <div class="md:col-span-5 bg-inverse-surface p-10 rounded-xl text-white flex flex-col justify-between">
            <div class="space-y-4">
              <h3 class="text-3xl font-bold">
                Real-time Sharing
              </h3>
              <p class="text-slate-300">
                Generate a unique link to share assignments with your team instantly. Works on any device, anywhere.
              </p>
            </div>
            <div class="flex items-center gap-2 mt-8">
              <UIcon name="i-lucide-share" :size="24" class="text-secondary-container" />
            </div>
          </div>
          <!-- Small Grid Items -->
          <div
            class="md:col-span-4 bg-surface-container-lowest border border-outline-variant/20 p-8 rounded-xl flex flex-col items-center text-center"
          >
            <UIcon name="i-lucide-cloud-off" class="text-primary mb-4 text-4xl" />
            <h4 class="font-bold text-xl mb-2 text-on-surface">
              Local Priority
            </h4>
            <p class="text-on-surface-variant text-sm">
              Your data stays in your browser. Private, secure, and fast.
            </p>
          </div>
          <div
            class="md:col-span-4 bg-surface-container-lowest border border-outline-variant/20 p-8 rounded-xl flex flex-col items-center text-center"
          >
            <UIcon name="i-lucide-dna" class="text-secondary mb-4 text-4xl" />
            <h4 class="font-bold text-xl mb-2 text-on-surface">
              Club Custom
            </h4>
            <p class="text-on-surface-variant text-sm">
              Adapt roles for league matches, youth cups, or friendlies.
            </p>
          </div>
          <div class="md:col-span-4 bg-primary p-8 rounded-xl flex flex-col items-center text-center text-white">
            <UIcon name="i-lucide-printer" class="mb-4 text-4xl" />
            <h4 class="font-bold text-xl mb-2">
              Print Ready
            </h4>
            <p class="text-primary-fixed-dim text-sm">
              Export clean PDFs for physical match records and table duties.
            </p>
          </div>
        </div>
      </section>
      <!-- CTA Section -->
      <section class="max-w-7xl mx-auto px-6 py-20">
        <div class="bg-surface-container rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
          <div class="absolute inset-0 kinetic-gradient opacity-10" />
          <div class="relative z-10 space-y-8">
            <h2 class="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight">
              Ready to organize your next
              home game?
            </h2>
            <p class="text-xl text-on-surface-variant max-w-xl mx-auto">
              Join over 50 local clubs streamlining their match-day logistics with Handball Helper.
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                class="bg-primary text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-primary-container transition-all"
              >
                Start for Free
              </button>
              <button class="flex items-center gap-2 text-primary font-bold hover:gap-4 transition-all">
                Read the Guide
                <UIcon name="i-lucide-arrow-right" :size="24" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
    <!-- Footer -->
    <footer class="bg-surface py-12 px-6 border-t border-outline-variant/20">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div class="flex flex-col items-center md:items-start gap-2">
          <div class="text-2xl font-black text-primary">
            Handball Helper
          </div>
          <p class="text-sm text-on-surface-variant">
            Built for the handball community.
          </p>
        </div>
        <div class="flex gap-8 text-sm font-medium text-on-surface-variant">
          <a class="hover:text-primary transition-colors" href="#">Privacy</a>
          <a class="hover:text-primary transition-colors" href="#">Open Source</a>
          <a class="hover:text-primary transition-colors" href="#">GitHub</a>
          <a class="hover:text-primary transition-colors" href="#">Support</a>
        </div>
        <p class="text-xs text-outline">
          © 2026 Handball Helper. All Rights Reserved.
        </p>
      </div>
    </footer>
    <!-- Bottom Navigation Shell (Mobile) -->
    <nav
      class="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-4 pt-2 bg-white/80 backdrop-blur-lg border-t border-slate-200/50 z-50 rounded-t-2xl shadow-[0_-4px_12px_rgba(0,82,204,0.05)]"
    >
      <a
        class="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-xl px-3 py-1 scale-90"
        href="#"
      >
        <UIcon name="i-lucide-layout-dashboard" class="text-blue-700" :size="24" />
        <span class="text-[10px] font-medium mt-1">Dashboard</span>
      </a>
      <a class="flex flex-col items-center justify-center text-slate-500 px-3 py-1 active:bg-slate-100" href="#">
        <UIcon name="i-lucide-id-card-lanyard" />
        <span class="text-[10px] font-medium mt-1">Tasks</span>
      </a>
      <a class="flex flex-col items-center justify-center text-slate-500 px-3 py-1 active:bg-slate-100" href="#">
        <UIcon name="i-lucide-settings" />
        <span class="text-[10px] font-medium mt-1">Setup</span>
      </a>
      <a class="flex flex-col items-center justify-center text-slate-500 px-3 py-1 active:bg-slate-100" href="#">
        <UIcon name="i-lucide-circle-question-mark" />
        <span class="text-[10px] font-medium mt-1">Guide</span>
      </a>
    </nav>
  </UApp>
</template>
