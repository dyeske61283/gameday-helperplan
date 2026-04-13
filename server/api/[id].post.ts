import z from "zod";
import { createdPlansCounter } from "../plugins/otel";

export default defineEventHandler(async (event) => {
  const { id: planId } = await getValidatedRouterParams(event, z.object({
    id: z.string().length(36),
  }).parse);
  const plan = await readValidatedBody(event, z.object({
    blob: z.string(),
  }).parse);

  let storage = useStorage("plans");
  try {
    await storage.setItem(planId, plan.blob);
  }
  catch (error) {
    console.error("Storage setItem failed, falling back to memory", error);
    storage = useStorage("memory");
    await storage.setItem(planId, plan.blob);
  }

  createdPlansCounter.add(1);

  return plan;
});
