import { $fetch, fetch, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

await setup({
  build: false,
  host: "http://localhost:3000",
});

describe("api endpoints", async () => {
  const validId = "12345678-1234-1234-1234-123456789012";
  const invalidId = "too-short";
  const nonExistentId = "00000000-0000-0000-0000-000000000001";

  it("post /api/[id] stores a plan", async () => {
    const res = await $fetch(`/api/${validId}`, {
      method: "POST",
      body: { blob: "test-plan-content" },
    });
    expect(res).toEqual({ blob: "test-plan-content" });
  });

  it("gET /api/[id] should retrieve a stored plan", async () => {
    const res = await $fetch(`/api/${validId}`);
    expect(res).toEqual({ blob: "test-plan-content" });
  });

  it("get /api/[id] returns 404 for non-existent plan", async () => {
    try {
      await $fetch(`/api/${nonExistentId}`);
      expect(true, "Should have thrown a 404 error").toBe(false);
    }
    catch (error: any) {
      expect(error.status).toBe(404);
      expect(error.data).toEqual({ error: "Plan not found" });
    }
  });

  it("post /api/[id] returns 400 (or validation error) for invalid ID length", async () => {
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

  it("get /api/[id] returns 400 (or validation error) for invalid ID length", async () => {
    try {
      await $fetch(`/api/${invalidId}`);
      expect(true, "Should have thrown a validation error").toBe(false);
    }
    catch (error: any) {
      expect(error.status).toBeGreaterThanOrEqual(400);
    }
  });

  it("returns 302 to root route for non-existent API endpoints", async () => {
    try {
      const res = await fetch("/api/non/existent/endpoint", {
        redirect: "manual", // Prevent automatic following of redirects
      });
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");
    }
    catch (error: any) {
      expect(error).toBeUndefined();
    }
  });
});
