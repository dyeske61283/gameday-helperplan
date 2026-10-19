import type { StoredPlan } from "../types/stored-plan.ts";
import z from "zod";
import env from "../../utils/env.ts";
import { PLAN_BLOB_CHUNK_SIZE, STORAGE_PREFIX } from "../types/stored-plan.ts";

// ponytail: process-local CAS; use storage-native atomic compare-and-set for multi-instance deployments.
const planWriteLocks = new Map<string, Promise<void>>();

async function withPlanWriteLock<T>(planId: string, write: () => Promise<T>): Promise<T> {
  const previous = planWriteLocks.get(planId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  planWriteLocks.set(planId, current);
  await previous;
  try {
    return await write();
  }
  finally {
    release();
    if (planWriteLocks.get(planId) === current)
      planWriteLocks.delete(planId);
  }
}

export default defineEventHandler(async (event) => {
  const { id: planId } = await getValidatedRouterParams(event, z.object({
    id: z.uuid(),
  }).parse);
  const plan = await readValidatedBody(event, z.object({
    blob: z.string(),
    expectedRevision: z.number().int().nonnegative(),
  }).parse);

  const storage = useStorage<StoredPlan>(STORAGE_PREFIX);

  return withPlanWriteLock(planId, async () => {
    const current = await storage.getItem(planId);
    const currentRevision = current?.revision ?? 0;
    if (plan.expectedRevision !== currentRevision) {
      throw createError({
        statusCode: 409,
        statusMessage: "Conflict",
        data: { expectedRevision: plan.expectedRevision, currentRevision },
      });
    }

    const chunks = plan.blob.match(new RegExp(`.{1,${PLAN_BLOB_CHUNK_SIZE}}`, "g")) || [""];
    const storedPlan: StoredPlan = {
      blob: chunks.length > 1 ? "" : plan.blob,
      modifiedAt: Date.now(),
      meta: {},
      revision: currentRevision + 1,
      ...(chunks.length > 1 ? { chunkCount: chunks.length } : {}),
    };

    try {
      if (chunks.length > 1) {
        const chunkStorage = useStorage<string>(STORAGE_PREFIX);
        await Promise.all(chunks.map((chunk, index) => chunkStorage.setItem(`${planId}:chunk:${index}`, chunk)));
      }
      await storage.setItem(planId, storedPlan);
    }
    catch (error) {
      if (env.DENO_DEPLOYMENT_ID) {
        console.error("Deno KV setItem failed, falling back to in-memory", error);
        const fallBackInMemoryStorage = useStorage<StoredPlan>();
        await fallBackInMemoryStorage.setItem(planId, storedPlan);
      }
      else {
        console.error("Storage setItem failed on memory", error);
        throw createError({ statusCode: 500, statusMessage: "Internal Server Error" });
      }
    }

    return { blob: plan.blob, revision: storedPlan.revision };
  });
});
