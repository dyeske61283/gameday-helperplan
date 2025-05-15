import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  future: {
    compatibilityVersion: 4,
  },
  experimental: {
    viewTransition: true,
  },
  devtools: { enabled: true },
  plugins: [],
  modules: ["@formkit/auto-animate/nuxt", "@vueuse/nuxt", "@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    // Production
    experimental: {
      openAPI: true,
    },
    devStorage: {
      "plans": {
        driver: 'fs',
        base: "storage/plans"
      }
    },
    openAPI: {
      production: false,
      meta: {
        title: "Gameday Helperplan",
        description:
          "A little tool to create, manage and distribute helper plans for sports teams.",
        version: "0.1",
      },
      route: "/_docs/openapi.json",
      ui: {
        scalar: {
          route: "/_docs/scalar",
          theme: "alternate",
        },
        swagger: {
          route: "/_docs/swagger",
        },
      },
    },
  },
});