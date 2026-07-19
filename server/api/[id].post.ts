import { metrics } from "@opentelemetry/api";
import z from "zod";
import env from "../../utils/env.ts";

const createdPlansCounter = metrics
  .getMeter("helperplan.plans", "1.0.0")
  .createCounter("helperplan.plans.created", {
    description: "The amount of created plans through the POST endpoint",
    unit: "1",
  });

export default defineEventHandler(async (event) => {
  const { id: planId } = await getValidatedRouterParams(event, z.object({
    id: z.string().length(36),
  }).parse);
  const plan = await readValidatedBody(event, z.object({
    blob: z.string(),
  }).parse);

  let storage = useStorage(env.DENO_DEPLOYMENT_ID ? "plans" : "memory");
  try {
    await storage.setItem(planId, plan.blob);
  }
  catch (error) {
    if (env.DENO_DEPLOYMENT_ID) {
      console.error("Deno KV setItem failed, falling back to memory", error);
      storage = useStorage("memory");
      await storage.setItem(planId, plan.blob);
    }
    else {
      console.error("Storage setItem failed on memory", error);
      throw createError({ statusCode: 500, statusMessage: "Internal Server Error" });
    }
  }

  createdPlansCounter.add(1);

  return plan;
});
