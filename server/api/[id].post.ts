import type { StoredPlan } from "../types/stored-plan.ts";
import z from "zod";
import env from "../../utils/env.ts";
import { PLAN_BLOB_CHUNK_SIZE, STORAGE_PREFIX } from "../types/stored-plan.ts";

const writeLocks = new Map<string, Promise<void>>();

export default defineEventHandler(async (event) => {
  const { id: planId } = await getValidatedRouterParams(event, z.object({
    id: z.uuid(),
  }).parse);
  const plan = await readValidatedBody(event, z.object({
    blob: z.string(),
    expectedRevision: z.number().int().nonnegative().optional(),
    revision: z.number().int().nonnegative().optional(),
  }).parse);

  const storage = useStorage<StoredPlan>(STORAGE_PREFIX);

  const chunks = plan.blob.match(new RegExp(`.{1,${PLAN_BLOB_CHUNK_SIZE}}`, "g")) || [""];
  const storedPlan: StoredPlan = {
    blob: chunks.length > 1 ? "" : plan.blob,
    modifiedAt: Date.now(),
    meta: {},
    revision: plan.revision,
    ...(chunks.length > 1 ? { chunkCount: chunks.length } : {}),
  };

  // Nitro storage has no compare-and-set primitive; serialize writes per plan.
  const previousWrite = writeLocks.get(planId) ?? Promise.resolve();
  let release!: () => void;
  const currentWrite = new Promise<void>(resolve => release = resolve);
  const write = previousWrite.then(() => currentWrite);
  writeLocks.set(planId, write);
  await previousWrite;
  try {
    const current = await storage.getItem(planId);
    if (current?.revision !== undefined && plan.expectedRevision !== current.revision) {
      throw createError({ statusCode: 409, statusMessage: "Plan changed; reload before saving" });
    }
    if (chunks.length > 1) {
      const chunkStorage = useStorage<string>(STORAGE_PREFIX);
      await Promise.all(chunks.map((chunk, index) => chunkStorage.setItem(`${planId}:chunk:${index}`, chunk)));
    }
    await storage.setItem(planId, storedPlan);
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 409)
      throw error;
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
  finally {
    release();
    if (writeLocks.get(planId) === write)
      writeLocks.delete(planId);
  }

  return plan;
});
