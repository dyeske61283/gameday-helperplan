import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const localPlanFixtures = {
  workflow: { id: "f530083d-8c74-4f10-931a-dd877ee7b53a", key: "d29ya2Zsb3ctZml4dC0wMQ" },
  routing: { id: "f530083d-8c74-4f10-931a-dd877ee7b53b", key: "cm91dGluZy1maXh0LTAwMQ" },
  editing: { id: "f530083d-8c74-4f10-931a-dd877ee7b53c", key: "ZWRpdGluZy1maXh0LTAwMQ" },
} as const;

export async function seedLocalPlan(id: string, key: string, testUrl: (path: string) => string) {
  const plan = JSON.parse(fs.readFileSync(path.resolve("test/fixtures/plan-2025-2026.json"), "utf8"));
  plan.id = id;
  const cryptoKey = await webcrypto.subtle.importKey("raw", Buffer.from(key, "base64url"), "AES-GCM", false, ["encrypt"]);
  const encrypted = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(12) },
    cryptoKey,
    new TextEncoder().encode(JSON.stringify(plan)),
  );
  const currentResponse = await fetch(testUrl(`/api/${id}`));
  if (!currentResponse.ok && currentResponse.status !== 404)
    throw new Error(`Could not read seeded plan: ${currentResponse.status}`);
  const expectedRevision = currentResponse.ok ? (await currentResponse.json()).revision ?? 0 : 0;
  const response = await fetch(testUrl(`/api/${id}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blob: Buffer.from(encrypted).toString("base64"), expectedRevision }),
  });
  if (!response.ok)
    throw new Error(`Could not seed plan: ${response.status}`);
}
