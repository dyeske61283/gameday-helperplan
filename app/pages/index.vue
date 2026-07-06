<script lang="ts" setup>
definePageMeta({
  layout: false,
});
</script>

<template>
  <div>
    <nav class="hidden md:flex justify-between items-center w-full px-6 h-16 bg-surface-container-low sticky top-0 z-50">
      <div class="text-xl font-bold">
        {{ $t('common.brand') }}
      </div>
      <div class="flex items-center space-x-8">
        <ULink
          class="text-primary title-md"
          to="/dashboard"
        >
          {{ $t('nav.dashboard') }}
        </ULink>
        <ULink
          class="text-on-surface-variant hover:text-primary transition-colors label-md"
          to="/assignments"
        >
          {{ $t('nav.assignments') }}
        </ULink>
        <ULink
          class="text-on-surface-variant hover:text-primary transition-colors label-md"
          to="/setup"
        >
          {{ $t('nav.setup') }}
        </ULink>
        <ULink
          class="text-on-surface-variant hover:text-primary transition-colors label-md"
          to="/guide"
        >
          {{ $t('nav.guide') }}
        </ULink>
      </div>
      <div class="flex items-center space-x-4">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-share-2"
          class="rounded-full"
          :aria-label="$t('common.share')"
        />
        <LanguageSwitcher />
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
            class="inline-flex items-center px-4 py-2 shadow mt-4 rounded-full bg-surface-container-high text-on-primary-fixed-variant text-sm font-semibold tracking-wide uppercase"
          >
            {{ $t('hero.badge') }}
          </div>
          <h1 class="font-family-body text-6xl display-lg text-on-surface dark:tracking-tight">
            {{ $t('hero.title') }} <br>
            <span class="text-primary font-family-body dark:text-primary-container display-lg text-5xl">{{ $t('hero.subtitle') }}</span>
          </h1>
          <p class="text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed body-md">
            {{ $t('hero.description') }}
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <ULink
              class="kinetic-gradient text-white px-8 py-4 rounded-full font-bold text-lg kinetic-shadow hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 label-md uppercase"
              to="/dashboard"
            >
              {{ $t('hero.cta_dashboard') }}
              <UIcon name="i-lucide-arrow-right" :size="24" />
            </ULink>
            <ULink
              class="bg-surface-container-lowest text-primary px-8 py-4 rounded-full font-bold text-lg hover:bg-surface-container-low transition-all active:scale-95 label-md uppercase"
              to="/setup"
            >
              {{ $t('hero.cta_setup') }}
            </ULink>
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
                {{ $t('features.zero_friction.title') }}
              </h2>
              <p class="text-on-surface-variant text-lg leading-relaxed">
                {{ $t('features.zero_friction.description') }}
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
                {{ $t('features.real_time.title') }}
              </h2>
              <p class="text-surface-container-low dark:text-on-surface-variant body-md">
                {{ $t('features.real_time.description') }}
              </p>
            </div>
            <div class="flex items-center gap-2 mt-8 relative z-10">
              <UIcon name="i-lucide-share" :size="24" class="text-secondary-container dark:text-secondary" />
            </div>
            <!-- Match Glint in Bento -->
            <div class="hidden dark:block absolute -right-20 -top-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
          </div>
          <!-- Small Grid Items -->
          <div
            class="md:col-span-4 bg-surface-container-low dark:bg-surface-container-high p-8 rounded-xl flex flex-col items-center text-center"
          >
            <UIcon name="i-lucide-cloud-off" class="text-primary mb-4 text-4xl" />
            <h2 class="font-bold text-xl mb-2 text-on-surface">
              {{ $t('features.local_priority.title') }}
            </h2>
            <p class="text-on-surface-variant text-sm">
              {{ $t('features.local_priority.description') }}
            </p>
          </div>
          <div
            class="md:col-span-4 bg-surface-container-low dark:bg-surface-container-high p-8 rounded-xl flex flex-col items-center text-center"
          >
            <UIcon name="i-lucide-dna" class="text-secondary mb-4 text-4xl" />
            <h2 class="font-bold text-xl mb-2 text-on-surface">
              {{ $t('features.club_custom.title') }}
            </h2>
            <p class="text-on-surface-variant text-sm">
              {{ $t('features.club_custom.description') }}
            </p>
          </div>
          <div class="md:col-span-4 kinetic-gradient p-8 rounded-xl flex flex-col items-center text-center text-white">
            <UIcon name="i-lucide-printer" class="mb-4 text-4xl" />
            <h2 class="font-bold text-xl mb-2 text-white">
              {{ $t('features.print_ready.title') }}
            </h2>
            <p class="text-white/80 text-sm body-md">
              {{ $t('features.print_ready.description') }}
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
              {{ $t('cta_section.title') }}
            </h2>
            <p class="text-xl text-on-surface-variant max-w-xl mx-auto body-md">
              {{ $t('cta_section.description') }}
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
              <UButton
                class="kinetic-gradient text-white px-10 py-4 rounded-full font-bold text-lg kinetic-shadow hover:opacity-90 transition-all label-md uppercase"
                to="/dashboard"
              >
                {{ $t('cta_section.start_free') }}
              </UButton>
              <UButton
                variant="ghost"
                class="flex items-center gap-2 text-primary font-bold hover:gap-4 transition-all label-md uppercase"
                to="/guide"
              >
                {{ $t('cta_section.read_guide') }}
                <UIcon name="i-lucide-arrow-right" :size="24" />
              </UButton>
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
            {{ $t('common.brand') }}
          </div>
          <p class="text-sm text-on-surface-variant">
            {{ $t('footer.built_for') }}
          </p>
        </div>
        <div class="flex gap-8 text-sm font-medium">
          <ULink
            class="hover:text-primary transition-colors text-on-surface"
            to="/privacy"
          >
            {{ $t('footer.privacy') }}
          </ULink>
          <ULink
            class="hover:text-primary transition-colors text-on-surface"
            to="/imprint"
          >
            {{ $t('footer.imprint') }}
          </ULink>
          <ULink
            class="hover:text-primary transition-colors text-on-surface"
            to="https://github.com/dyeske61283/gameday-helperplan"
            target="_blank"
          >
            {{ $t('footer.github') }}
          </ULink>
          <ULink
            class="hover:text-primary transition-colors text-on-surface"
            to="/support"
          >
            {{ $t('footer.support') }}
          </ULink>
        </div>
        <p class="text-xs text-outline">
          {{ $t('footer.rights') }}
        </p>
      </div>
    </footer>
    <!-- Bottom Navigation Shell (Mobile) -->
    <nav
      class="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-4 pt-2 glass-kinetic z-50 rounded-t-2xl kinetic-shadow"
    >
      <ULink
        class="flex flex-col items-center justify-center bg-surface-container-low text-primary rounded-xl px-3 py-1 scale-90"
        to="/dashboard"
      >
        <UIcon name="i-lucide-layout-dashboard" class="text-primary" :size="24" />
        <span class="text-[10px] font-medium mt-1">{{ $t('nav.dashboard') }}</span>
      </ULink>
      <ULink class="flex flex-col items-center justify-center text-on-surface-variant px-3 py-1 active:bg-surface-container-low" to="/assignments" :aria-label="$t('common.tasks')">
        <UIcon name="i-lucide-id-card-lanyard" />
        <span class="text-[10px] font-medium mt-1">{{ $t('common.tasks') }}</span>
      </ULink>
      <ULink class="flex flex-col items-center justify-center text-on-surface-variant px-3 py-1 active:bg-surface-container-low" to="/setup" :aria-label="$t('nav.setup')">
        <UIcon name="i-lucide-settings" />
        <span class="text-[10px] font-medium mt-1">{{ $t('nav.setup') }}</span>
      </ULink>
      <ULink class="flex flex-col items-center justify-center text-on-surface-variant px-3 py-1 active:bg-surface-container-low" to="/guide" :aria-label="$t('nav.guide')">
        <UIcon name="i-lucide-circle-question-mark" />
        <span class="text-[10px] font-medium mt-1">{{ $t('nav.guide') }}</span>
      </ULink>
    </nav>
  </div>
</template>
