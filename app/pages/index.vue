<script lang="ts" setup>
definePageMeta({
  layout: false,
});
</script>

<template>
  <div>
    <nav class="hidden md:flex justify-between items-center w-full px-6 h-16 bg-surface-container-low sticky top-0 z-50">
      <div class="text-xl font-bold text-primary">
        Handball Helper
      </div>
      <div class="flex items-center space-x-8">
        <a class="text-primary title-md" href="#">Dashboard</a>
        <a class="text-on-surface-variant hover:text-primary transition-colors label-md" href="#">Assignments</a>
        <a class="text-on-surface-variant hover:text-primary transition-colors label-md" href="#">Setup</a>
        <a class="text-on-surface-variant hover:text-primary transition-colors label-md" href="#">Guide</a>
      </div>
      <div class="flex items-center space-x-4">
        <UButton
          variant="ghost"
          color="primary"
          icon="i-lucide-share-2"
          class="rounded-full"
          aria-label="Share Dashboard"
        />
        <UColorModeButton />
      </div>
    </nav>
    <main class="relative isolate">
      <!-- Hero Section -->
      <section class="relative min-h-217.5 flex flex-col items-center justify-center px-6 overflow-hidden">
        <!-- Asymmetric Background Elements -->
        <div class="absolute top-[-10%] right-[-5%] w-125 h-125 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -z-10" />
        <div class="absolute bottom-[-10%] left-[-5%] w-100 h-100 bg-secondary/5 dark:bg-secondary/10 rounded-full blur-3xl -z-10" />

        <!-- Dark Mode Match Glints -->
        <div class="hidden dark:block absolute top-[20%] left-[10%] w-75 h-75 bg-secondary/10 rounded-full blur-[100px] -z-10" />
        <div class="hidden dark:block absolute bottom-[20%] right-[10%] w-87.5 h-87.5 bg-primary/10 rounded-full blur-[120px] -z-10" />

        <div class="max-w-4xl w-full text-center space-y-8">
          <div
            class="inline-flex items-center px-4 py-2 mt-2 rounded-full bg-surface-container-high text-on-primary-fixed-variant text-sm font-semibold tracking-wide uppercase"
          >
            Focus on the Game, Not the Admin
          </div>
          <h1 class="display-lg text-on-surface dark:tracking-tight dark:scale-105 transition-transform duration-700">
            Effortless Match-Day <br>
            <span class="text-primary dark:text-primary-container">Volunteer Coordination</span>
          </h1>
          <p class="text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed body-md">
            A streamlined tool for local handball clubs to organize officials, timekeepers, and court assistants. No
            accounts, no hassle—just high-performance management.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              class="kinetic-gradient text-white px-8 py-4 rounded-full font-bold text-lg kinetic-shadow hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 label-md uppercase"
              href="#"
            >
              Go to Dashboard
              <UIcon name="i-lucide-arrow-right" :size="24" />
            </a>
            <a
              class="bg-surface-container-lowest text-primary px-8 py-4 rounded-full font-bold text-lg hover:bg-surface-container-low transition-all active:scale-95 label-md uppercase"
              href="#"
            >
              Admin Setup
            </a>
          </div>
        </div>
        <!-- Kinetic Court Visual Mockup -->
        <div class="mt-20 w-full max-w-6xl relative">
          <div class="rounded-xl overflow-hidden kinetic-shadow">
            <img
              alt="Handball Action" class="w-full h-100 object-cover"
              data-alt="Cinematic wide shot of a handball match in progress, dynamic movement, indoor arena lighting, vibrant team jerseys"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0PI81AoJd8CGYPk48gTBQdATKhLbfpVSHiHHsfxIMESPqqAx4KFBQitDD-u7ZrjsshdZGMFma6ET6XmfttFPLb6k7Tr_bBSpiS7iKMWPCHAbv-wMfIfP3Z4hx_ddNFyzae1FTZ3VLZBKaK0Io0Q1s_NPr-__k2KHv_HK8xb972EbbHchUM3zOWRFVtYMLMjVKLcpNwMBY6LSb7jQKagMxYh_sw5fQIzWrjMqXRJtVuAnFtpvoGtgM9XRCvglXXDsRf5lOVAtGupVY"
            >
            <div class="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
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
              <h2 class="text-3xl font-bold text-on-surface">
                Zero Friction Signup
              </h2>
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
          <div class="md:col-span-5 bg-surface-inverse dark:bg-surface-container-highest p-10 rounded-xl text-white flex flex-col justify-between relative overflow-hidden">
            <div class="relative z-10 space-y-4">
              <h2 class="headline-lg text-white">
                Real-time Sharing
              </h2>
              <p class="text-surface-container-low dark:text-on-surface-variant body-md">
                Generate a unique link to share assignments with your team instantly. Works on any device, anywhere.
              </p>
              <div class="pt-4 dark:block hidden">
                <div class="text-xs uppercase tracking-widest text-secondary mb-2 font-bold">
                  Velocity Tracker
                </div>
                <div class="velocity-tracker w-full opacity-80" />
              </div>
            </div>
            <div class="flex items-center gap-2 mt-8 relative z-10">
              <UIcon name="i-lucide-share" :size="24" class="text-secondary-container dark:text-secondary" />
            </div>
            <!-- Match Glint in Bento -->
            <div class="hidden dark:block absolute -right-20 -top-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
          </div>
          <!-- Small Grid Items -->
          <div
            class="md:col-span-4 bg-surface-container-lowest dark:bg-surface-container-high p-8 rounded-xl flex flex-col items-center text-center"
          >
            <UIcon name="i-lucide-cloud-off" class="text-primary mb-4 text-4xl" />
            <h2 class="font-bold text-xl mb-2 text-on-surface">
              Local Priority
            </h2>
            <p class="text-on-surface-variant text-sm">
              Your data stays in your browser. Private, secure, and fast.
            </p>
          </div>
          <div
            class="md:col-span-4 bg-surface-container-lowest dark:bg-surface-container-high p-8 rounded-xl flex flex-col items-center text-center"
          >
            <UIcon name="i-lucide-dna" class="text-secondary mb-4 text-4xl" />
            <h2 class="font-bold text-xl mb-2 text-on-surface">
              Club Custom
            </h2>
            <p class="text-on-surface-variant text-sm">
              Adapt roles for league matches, youth cups, or friendlies.
            </p>
          </div>
          <div class="md:col-span-4 kinetic-gradient p-8 rounded-xl flex flex-col items-center text-center text-white">
            <UIcon name="i-lucide-printer" class="mb-4 text-4xl" />
            <h2 class="font-bold text-xl mb-2 text-white">
              Print Ready
            </h2>
            <p class="text-white/80 text-sm body-md">
              Export clean PDFs for physical match records and table duties.
            </p>
          </div>
        </div>
      </section>
      <!-- CTA Section -->
      <section class="max-w-7xl mx-auto px-6 py-20">
        <div class="bg-surface-container-low rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
          <div class="absolute inset-0 kinetic-gradient-soft" />
          <div class="relative z-10 space-y-8">
            <h2 class="text-4xl md:text-5xl font-bold font-display text-on-surface">
              Ready to organize your next
              home game?
            </h2>
            <p class="text-xl text-on-surface-variant max-w-xl mx-auto body-md">
              Join over 50 local clubs streamlining their match-day logistics with Handball Helper.
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                class="kinetic-gradient text-white px-10 py-4 rounded-full font-bold text-lg kinetic-shadow hover:opacity-90 transition-all label-md uppercase"
              >
                Start for Free
              </button>
              <button class="flex items-center gap-2 text-primary font-bold hover:gap-4 transition-all label-md uppercase">
                Read the Guide
                <UIcon name="i-lucide-arrow-right" :size="24" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
    <!-- Footer -->
    <footer class="bg-surface-container-low py-12 px-6 relative z-10">
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
      class="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-4 pt-2 glass-kinetic z-50 rounded-t-2xl kinetic-shadow"
    >
      <a
        class="flex flex-col items-center justify-center bg-surface-container-low text-primary rounded-xl px-3 py-1 scale-90"
        href="#"
      >
        <UIcon name="i-lucide-layout-dashboard" class="text-primary" :size="24" />
        <span class="text-[10px] font-medium mt-1">Dashboard</span>
      </a>
      <a class="flex flex-col items-center justify-center text-on-surface-variant px-3 py-1 active:bg-surface-container-low" href="#" aria-label="Tasks">
        <UIcon name="i-lucide-id-card-lanyard" />
        <span class="text-[10px] font-medium mt-1">Tasks</span>
      </a>
      <a class="flex flex-col items-center justify-center text-on-surface-variant px-3 py-1 active:bg-surface-container-low" href="#" aria-label="Setup">
        <UIcon name="i-lucide-settings" />
        <span class="text-[10px] font-medium mt-1">Setup</span>
      </a>
      <a class="flex flex-col items-center justify-center text-on-surface-variant px-3 py-1 active:bg-surface-container-low" href="#" aria-label="Guide">
        <UIcon name="i-lucide-circle-question-mark" />
        <span class="text-[10px] font-medium mt-1">Guide</span>
      </a>
    </nav>
  </div>
</template>
