import { $fetch, fetch, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import { useDecryption, useEncryption } from "../../app/composables/use-crypto";
import { PLAN_BLOB_CHUNK_SIZE } from "../../server/types/stored-plan";
import env from "../../utils/env";

await setup({
  host: env.TEST_HOST,
  dev: true,
});

describe("api endpoints", async () => {
  const validId = globalThis.crypto.randomUUID();
  const invalidId = "too-short";
  const nonExistentId = globalThis.crypto.randomUUID();

  it("post /api/[id] stores a plan", async () => {
    const res = await $fetch(`/api/${validId}`, {
      method: "POST",
      body: { blob: "test-plan-content", expectedRevision: 0 },
    });
    expect(res).toEqual({ blob: "test-plan-content", revision: 1 });
  });

  it("gET /api/[id] should retrieve a stored plan", async () => {
    const res = await $fetch(`/api/${validId}`);
    expect(res).toMatchObject({ blob: "test-plan-content", meta: {}, revision: 1 });
  });

  it.each([
    ["exactly one chunk", PLAN_BLOB_CHUNK_SIZE],
    ["one byte over one chunk", PLAN_BLOB_CHUNK_SIZE + 1],
    ["one byte over two chunks", PLAN_BLOB_CHUNK_SIZE * 2 + 1],
  ])("stores and retrieves blobs %s", async (_label, size) => {
    const planId = globalThis.crypto.randomUUID();
    const blob = "x".repeat(size);
    await $fetch(`/api/${planId}`, { method: "POST", body: { blob, expectedRevision: 0 } });

    const res = await $fetch(`/api/${planId}`);
    expect(res.blob).toBe(blob);
  });

  it("serializes concurrent writes and rejects the stale encrypted blob", async () => {
    const planId = globalThis.crypto.randomUUID();
    const initial = await $fetch<{ revision: number }>(`/api/${planId}`, {
      method: "POST",
      body: { blob: "opaque-initial-ciphertext", expectedRevision: 0 },
    });
    const candidates = ["opaque-encrypted-payload-a", "opaque-encrypted-payload-b"];
    const responses = await Promise.all(candidates.map(blob => fetch(`/api/${planId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blob, expectedRevision: initial.revision }),
    })));

    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    const winnerIndex = responses.findIndex(response => response.ok);
    const stored = await $fetch<{ blob: string; revision: number }>(`/api/${planId}`);
    expect(stored.blob).toBe(candidates[winnerIndex]);
    expect(stored.revision).toBe(initial.revision + 1);
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
        body: { blob: "some-content", expectedRevision: 0 },
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

describe("create-save-edit-save workflow", async () => {
  it("creates a plan, saves it, edits it, and saves the edited version", async () => {
    const planId = globalThis.crypto.randomUUID();

    const initialPlan = { name: "Initial Plan", content: "This is the initial plan." };
    const editedPlan = { name: "Edited Plan", content: "This is the edited plan." };

    const { encryptData, generateKey } = useEncryption();
    const { decryptBlob } = useDecryption();
    const key = await generateKey();

    const encryptedInitialPlan = await encryptData(JSON.stringify(initialPlan), key);

    const res = await $fetch(`/api/${planId}`, {
      method: "POST",
      body: { blob: encryptedInitialPlan, expectedRevision: 0 },
    });
    expect(res).toEqual({ blob: encryptedInitialPlan, revision: 1 });

    const retrievedInitialBlob = await fetch(`/api/${planId}`);
    const plan = await retrievedInitialBlob.json();
    const decryptedInitialPlan = JSON.parse(await decryptBlob(plan.blob, key));

    expect(decryptedInitialPlan).toEqual(initialPlan);

    const encryptedEditedPlan = await encryptData(JSON.stringify(editedPlan), key);

    await $fetch(`/api/${planId}`, {
      method: "POST",
      body: { blob: String(encryptedEditedPlan), expectedRevision: 1 },
    });

    const retrievedEditedBlob = await fetch(`/api/${planId}`);
    const editedPlanData = await retrievedEditedBlob.json();
    const decryptedEditedPlan = JSON.parse(await decryptBlob(editedPlanData.blob, key));

    expect(decryptedEditedPlan).toEqual(editedPlan);
  });
});
