import { defineConfig } from "vitest/config";
import env from "./utils/env";

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
                  disableSameOriginPolicy: !!env.TEST_HOST, // Disable same-origin policy if TEST_HOST is set (indicating tests are running against a deployed URL)
                },
              },
            },
          },
        },
      },
      {
        test: {
          name: "workflow",
          include: ["test/nuxt/*.{test,spec}.ts"],
          environment: "happy-dom",
          testTimeout: 15000,
          environmentOptions: {
            happyDOM: {
              settings: {
                fetch: {
                  disableSameOriginPolicy: !!env.TEST_HOST, // Disable same-origin policy if TEST_HOST is set (indicating tests are running against a deployed URL)
                },
              },
            },
          },
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
