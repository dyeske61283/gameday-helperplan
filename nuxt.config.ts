// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/ui",
    "@formkit/auto-animate",
    "@nuxt/eslint",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
  ],
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2025-07-15",
  eslint: {
    config: {
      standalone: false,
    },
  },
  routeRules: {
    "/": { prerender: true },
  },
  nitro: {
    storage: {
      plans: {
        driver: "deno-kv",
      },
    },
    devStorage: {
      plans: {
        driver: "memory",
      },
    },
  },
  ui: {
    theme: {
      colors: [
        "primary",
        "secondary",
        "tertiary",
        "info",
        "success",
        "warning",
        "error",
        "neutral",
      ],
    },
  },
  i18n: {
    locales: [
      { code: "de", name: "Deutsch", file: "de.json" },
      { code: "en", name: "English", file: "en.json" },
    ],
    langDir: "i18n",
    defaultLocale: "de",
    strategy: "no_prefix",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      alwaysRedirect: true,
      redirectOn: "root",
      fallbackLocale: "de",
    },
  },
});
