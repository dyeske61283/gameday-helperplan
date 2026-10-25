import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toRaw } from "vue";
import legacyPlan from "../../test/fixtures/legacy-plan-v1.json";
import { useDecryption, useEncryption } from "../composables/use-crypto";
import { usePlanStore } from "./plan";

async function encryptLegacy(data: string, keyString: string) {
  const key = await globalThis.crypto.subtle.importKey("jwk", {
    k: keyString,
    alg: "A128GCM",
    ext: true,
    key_ops: ["encrypt"],
    kty: "oct",
  }, { name: "AES-GCM", length: 128 }, false, ["encrypt"]);
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(12) },
    key,
    new TextEncoder().encode(data),
  );
  return btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
}

describe("plan store encrypted payloads", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => vi.unstubAllGlobals());

  it("loads a legacy blob and migrates it on save", async () => {
    const { generateKey } = useEncryption();
    const { decryptBlob } = useDecryption();
    const key = await generateKey();
    let storedBlob = await encryptLegacy(JSON.stringify(legacyPlan), key);
    let revision = 4;
    vi.stubGlobal("$fetch", vi.fn(async (_url: string, options?: { method?: string; body?: { blob: string } }) => {
      if (options?.method === "POST") {
        storedBlob = options.body!.blob;
        return { revision: ++revision };
      }
      return { blob: storedBlob, revision };
    }));

    const store = usePlanStore();
    await store.loadPlan(legacyPlan.id, key);
    expect(store.plan?.id).toBe(legacyPlan.id);
    expect(await store.savePlan()).toBe(true);
    expect(storedBlob.startsWith("v1.")).toBe(true);
    expect(JSON.parse(await decryptBlob(storedBlob, key)).id).toBe(legacyPlan.id);

    await store.loadPlan(legacyPlan.id, key);
    expect(store.plan?.id).toBe(legacyPlan.id);
  });

  it("decrypts a versioned encrypted SSE update", async () => {
    const { generateKey, encryptData } = useEncryption();
    const key = await generateKey();
    let source: { onmessage?: (event: MessageEvent) => Promise<void>; close: () => void } | undefined;
    vi.stubGlobal("EventSource", class {
      constructor() {
        return source = { onmessage: undefined, close() {} };
      }
    });

    const store = usePlanStore();
    store.createNewPlan("f530083d-8c74-4f10-931a-dd877ee7b52c", key);
    store.watchPlan();
    const update = structuredClone(toRaw(store.plan!));
    update.rev++;
    update.club.name = "Remote update";
    const blob = await encryptData(JSON.stringify(update), key);

    await source?.onmessage?.({ data: JSON.stringify({ blob, revision: 1 }) } as MessageEvent);
    expect(store.plan?.club.name).toBe("Remote update");
    store.stopWatching();
  });
});
