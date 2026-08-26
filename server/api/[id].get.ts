import type { StoredPlan } from "../types/stored-plan.ts";
import { z } from "zod";
import env from "../../utils/env.ts";

export default eventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.uuid(),
  }).parse);

  const storageName = "plans";
  const storage = useStorage<StoredPlan>(storageName);
  let plan: StoredPlan | null = null;

  try {
    plan = await storage.getItem(id);
  }
  catch (error) {
    if (env.DENO_DEPLOYMENT_ID) {
      console.error("Deno KV getItem failed, falling back to memory", error);
      const fallBackInMemoryStorage = useStorage<StoredPlan>();
      plan = await fallBackInMemoryStorage.getItem(id);
    }
    else {
      console.error("Storage getItem failed on memory", error);
      throw createError({ statusCode: 500, statusMessage: "Internal Server Error" });
    }
  }

  if (!plan) {
    return Response.json({ error: "Plan not found" }, { status: 404 });
  }

  if (getHeader(event, "accept") === "text/event-stream") {
    let unwatch: Awaited<ReturnType<typeof storage.watch>> | undefined;
    let isClosed = false;
    const eventStream = createEventStream(event);

    eventStream.onClosed(async () => {
      isClosed = true;
      await eventStream.close();
      if (unwatch)
        await unwatch();
    });

    if (plan) {
      eventStream.push(plan.blob);
    }

    try {
      unwatch = await storage.watch(async (planUpdateEvent, planIdIncludingPrefix) => {
        if (isClosed)
          return;
        if (planIdIncludingPrefix !== `${storageName}:${id}`)
          return;
        if (planUpdateEvent === "remove") {
          isClosed = true;
          await eventStream.close();
          return;
        }

        if (planUpdateEvent === "update") {
          try {
            const latestPlan = await storage.getItem(id);
            if (!latestPlan || isClosed) {
              isClosed = true;
              await eventStream.close();
              return;
            }
            await eventStream.push(latestPlan.blob);
          }
          catch (error) {
            isClosed = true;
            console.error("Failed to push update to event stream", error);
            await eventStream.close();
            if (unwatch)
              await unwatch();
          }
        }
      });
    }
    catch (error) {
      console.error("Storage watch failed", error);
    }

    return eventStream.send();
  }

  return plan;
});
