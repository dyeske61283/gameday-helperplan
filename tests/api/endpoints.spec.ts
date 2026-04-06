import { describe, expect, it } from "vitest";
import { setup, $fetch } from "@nuxt/test-utils/e2e";

describe("API endpoints", async () => {
  await setup({
     server: true,
     browser: false
  });

  const validId = "12345678-1234-1234-1234-123456789012";
  const invalidId = "too-short";
  const nonExistentId = "00000000-0000-0000-0000-000000000001";

  it("POST /api/[id] should store a plan", async () => {
    const res = await $fetch(`/api/${validId}`, {
      method: "POST",
      body: { blob: "test-plan-content" },
    });
    expect(res).toEqual({ blob: "test-plan-content" });
  });

  it("GET /api/[id] should retrieve a stored plan", async () => {
    const res = await $fetch(`/api/${validId}`);
    expect(res).toBe("test-plan-content");
  });

  it("GET /api/[id] should return 404 for non-existent plan", async () => {
    try {
      await $fetch(`/api/${nonExistentId}`);
      expect(true, "Should have thrown a 404 error").toBe(false);
    }
    catch (error: any) {
      expect(error.status).toBe(404);
      expect(error.data).toEqual({ error: "Plan not found" });
    }
  });

  it("POST /api/[id] should return 400 (or validation error) for invalid ID length", async () => {
    try {
      await $fetch(`/api/${invalidId}`, {
        method: "POST",
        body: { blob: "some-content" },
      });
      expect(true, "Should have thrown a validation error").toBe(false);
    }
    catch (error: any) {
      expect(error.status).toBeGreaterThanOrEqual(400);
    }
  });

  it("GET /api/[id] should return 400 (or validation error) for invalid ID length", async () => {
    try {
      await $fetch(`/api/${invalidId}`);
      expect(true, "Should have thrown a validation error").toBe(false);
    }
    catch (error: any) {
      expect(error.status).toBeGreaterThanOrEqual(400);
    }
  });

  it("Should return 404 for non-existent API endpoints", async () => {
    try {
      await $fetch("/api/non/existent/endpoint");
      expect(true, "Should have thrown a 404 error").toBe(false);
    }
    catch (error: any) {
      expect(error.status).toBe(404);
    }
  });
});
