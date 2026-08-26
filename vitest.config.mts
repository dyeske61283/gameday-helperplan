import type { Plugin } from "vitest/config";
import { defineVitestProject } from "@nuxt/test-utils/config";
import { defineConfig } from "vitest/config";
import env from "./utils/env.ts";

const ignoreBunTest: Plugin = {
  name: "ignore-bun-test",
  enforce: "pre",
  resolveId(id) {
    if (id === "bun:test") {
      return { id: "bun:test", external: true };
    }
  },
};

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
          environmentOptions: {
            happyDOM: {
              settings: {
                fetch: {
                  disableSameOriginPolicy: !!env.TEST_HOST,
                },
              },
            },
          },
        },
      },
      await defineVitestProject({
        test: {
          name: "workflow",
          include: ["test/nuxt/*.{test,spec}.ts"],
          environment: "nuxt",
          testTimeout: 5000,
        },
      }),
      await defineVitestProject({
        plugins: [ignoreBunTest],
        test: {
          name: "e2e",
          include: ["test/e2e/**/*.{test,spec}.ts"],
          environment: "node",
          testTimeout: 30000,
          hookTimeout: 30000,
        },
      }),
    ],
  },
  plugins: [ignoreBunTest],
});
