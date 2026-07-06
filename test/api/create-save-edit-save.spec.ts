import { $fetch, fetch, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import { useDecryption, useEncryption } from "../../app/composables/use-crypto";
import env from "../../utils/env";

await setup({
  build: false,
  host: env.TEST_HOST || "http://localhost:3000",
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
      body: { blob: encryptedInitialPlan },
    });
    expect(res).toEqual({ blob: encryptedInitialPlan });

    const retrievedInitialBlob = await fetch(`/api/${planId}`);
    const plan = await retrievedInitialBlob.json();
    const decryptedInitialPlan = JSON.parse(await decryptBlob(plan.blob, key));

    expect(decryptedInitialPlan).toEqual(initialPlan);

    const encryptedEditedPlan = await encryptData(JSON.stringify(editedPlan), key);

    await $fetch(`/api/${planId}`, {
      method: "POST",
      body: { blob: String(encryptedEditedPlan) },
    });

    const retrievedEditedBlob = await fetch(`/api/${planId}`);
    const editedPlanData = await retrievedEditedBlob.json();
    const decryptedEditedPlan = JSON.parse(await decryptBlob(editedPlanData.blob, key));

    expect(decryptedEditedPlan).toEqual(editedPlan);
  });
});
