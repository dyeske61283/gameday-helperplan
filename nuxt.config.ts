import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  plugins: [],
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    experimental: {
      openAPI: true
    },
    openAPI: {
      production: false,
      meta: {
        title: 'Gameday Helperplan',
        description: 'A little tool to create, manage and distribute helper plans for sports teams.',
        version: '0.1'
      },
      route: "/_docs/openapi.json",
      ui: {
        scalar: {
          route: "/_docs/scalar",
        },
        swagger: {
          route: "/_docs/swagger",
        },
      },
    },
  },
});
