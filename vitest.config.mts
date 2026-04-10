import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "api",
          include: ["test/api/*.{test,spec}.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "app",
          include: ["app/**/*.{test,spec}.ts"],
          environment: "happy-dom",
        },
      },
      {
        test: {
          name: "workflow",
          include: ["test/nuxt/*.{test,spec}.ts"],
          environment: "happy-dom",
        },
      },
    ],
  },
  plugins: [
    {
      name: "ignore-bun-test",
      enforce: "pre",
      resolveId(id) {
        if (id === "bun:test") {
          return { id: "bun:test", external: true };
        }
      },
    },
  ],
});
