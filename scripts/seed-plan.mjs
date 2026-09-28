import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import fs from "node:fs/promises";
import process from "node:process";
/* eslint-disable no-console, node/no-process-env */

const baseUrl = process.env.SEED_BASE_URL || process.argv[2];
const planPath = process.env.SEED_PLAN_PATH || process.argv[3] || "test/fixtures/plan-2025-2026.json";

if (!baseUrl) {
  console.error("Usage: SEED_BASE_URL=https://example.com pnpm seed:plan");
  process.exit(1);
}

const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
const key = await webcrypto.subtle.generateKey({ name: "AES-GCM", length: 128 }, true, ["encrypt", "decrypt"]);
const jwk = await webcrypto.subtle.exportKey("jwk", key);
const payload = new TextEncoder().encode(JSON.stringify(plan));
const encrypted = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(12) }, key, payload);
const blob = Buffer.from(encrypted).toString("base64");

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/${plan.id}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ blob }),
});

if (!response.ok)
  throw new Error(`Seeding ${plan.id} failed: ${response.status} ${await response.text()}`);

const link = `${baseUrl.replace(/\/$/, "")}/plans/${plan.id}#key=${jwk.k}`;
console.log(`SEED_PLAN_ID=${plan.id}`);
console.log(`SEED_PLAN_URL=${link}`);
