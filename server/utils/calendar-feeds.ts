import type { SeasonPlan } from "../../app/utils/plan-types.ts";
import type { StoredPlan } from "../types/stored-plan.ts";
import z from "zod";
import { parseSeasonPlan } from "../../app/utils/plan-types.ts";
import { STORAGE_PREFIX } from "../types/stored-plan.ts";

const FeedTokenPayloadSchema = z.discriminatedUnion("scope", [
  z.strictObject({
    planId: z.uuid(),
    scope: z.literal("matches"),
    planKey: z.string().min(1).max(100),
    expiresAt: z.number().int().positive(),
  }),
  z.strictObject({
    planId: z.uuid(),
    scope: z.literal("member-duties"),
    memberId: z.string().min(1).max(200),
    planKey: z.string().min(1).max(100),
    expiresAt: z.number().int().positive(),
  }),
]);

export type FeedTokenPayload = z.infer<typeof FeedTokenPayloadSchema>;

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[\w-]+$/.test(value) || value.length % 4 === 1)
    throw new Error("Invalid encoded value");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function importTokenKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32)
    throw new Error("Calendar feed secret is not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealFeedToken(input: unknown, secret: string): Promise<string> {
  const payload = FeedTokenPayloadSchema.parse(input);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importTokenKey(secret);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const bytes = new Uint8Array(iv.length + ciphertext.byteLength);
  bytes.set(iv);
  bytes.set(new Uint8Array(ciphertext), iv.length);
  return toBase64Url(bytes);
}

export async function openFeedToken(token: string, secret: string, now = Date.now()): Promise<FeedTokenPayload | null> {
  try {
    if (token.length > 4096)
      return null;
    const bytes = fromBase64Url(token);
    if (bytes.length < 29)
      return null;
    const key = await importTokenKey(secret);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
    const payload = FeedTokenPayloadSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)));
    return payload.expiresAt <= now ? null : payload;
  }
  catch {
    return null;
  }
}

export async function readStoredPlan(planId: string): Promise<StoredPlan | null> {
  const storage = useStorage<StoredPlan>(STORAGE_PREFIX);
  const storedPlan = await storage.getItem(planId);
  if (!storedPlan)
    return null;
  if (!storedPlan.chunkCount)
    return storedPlan;

  const chunkStorage = useStorage<string>(STORAGE_PREFIX);
  const chunks = await Promise.all(Array.from({ length: storedPlan.chunkCount }, (_, index) => chunkStorage.getItem(`${planId}:chunk:${index}`)));
  if (chunks.includes(null))
    throw new Error("Stored plan is incomplete");
  return { ...storedPlan, blob: (chunks as string[]).join("") };
}

export async function decryptPlan(blob: string, planKey: string): Promise<SeasonPlan> {
  if (!/^[\w-]{22}$/.test(planKey))
    throw new Error("Invalid plan key");
  const versioned = blob.startsWith("v1.");
  const bytes = fromBase64(versioned ? blob.slice(3) : blob);
  const iv = versioned ? bytes.slice(0, 12) : new Uint8Array(12);
  const ciphertext = versioned ? bytes.slice(12) : bytes;
  const key = await crypto.subtle.importKey("jwk", {
    k: planKey,
    alg: "A128GCM",
    ext: true,
    key_ops: ["encrypt", "decrypt"],
    kty: "oct",
  }, { name: "AES-GCM", length: 128 }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return parseSeasonPlan(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext)));
}
