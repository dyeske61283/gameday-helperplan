import type { StoredPlan } from "../types/stored-plan.ts";
import z from "zod";
import env from "../../utils/env.ts";
import { STORAGE_PREFIX } from "../types/stored-plan.ts";

export default defineEventHandler(async (event) => {
  const { id: planId } = await getValidatedRouterParams(event, z.object({
    id: z.uuid(),
  }).parse);
  const plan = await readValidatedBody(event, z.object({
    blob: z.string(),
  }).parse);

  const chunkSize = 48 * 1024;
  const chunks = plan.blob.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [""];
  const storedPlan: StoredPlan = {
    blob: chunks.length > 1 ? "" : plan.blob,
    modifiedAt: Date.now(),
    meta: {},
    ...(chunks.length > 1 ? { chunkCount: chunks.length } : {}),
  };

  const storage = useStorage<StoredPlan>(STORAGE_PREFIX);
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

  return plan;
});
