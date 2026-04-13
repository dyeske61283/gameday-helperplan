import z from "zod";
import env from "~~/utils/env";
import { createdPlansCounter } from "../plugins/otel";

export default defineEventHandler(async (event) => {
  const { id: planId } = await getValidatedRouterParams(event, z.object({
    id: z.string().length(36),
  }).parse);
  const plan = await readValidatedBody(event, z.object({
    blob: z.string(),
  }).parse);

  const isDenoDeploy = !!env.DENO_DEPLOYMENT_ID;
  const storage = useStorage(isDenoDeploy ? "plans" : "memory");
  try {
    await storage.setItem(planId, plan.blob);
  }
  catch (error) {
    console.error(`Storage setItem failed on ${isDenoDeploy ? "Deno KV" : "memory"}`, error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }

  createdPlansCounter.add(1);

  return plan;
});
