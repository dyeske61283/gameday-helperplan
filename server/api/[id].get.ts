import { z } from "zod";
import env from "../../utils/env.ts";
import { retrievedPlansCounter } from "../plugins/otel.ts";

export default eventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string().length(36),
  }).parse);

  const isDenoDeploy = !!env.DENO_DEPLOYMENT_ID;
  let storage = useStorage(isDenoDeploy ? "plans" : "memory");
  let storageName = isDenoDeploy ? "plans" : "memory";

  let plan: string | null = null;
  try {
    plan = await storage.getItem<string>(id);
  }
  catch (error) {
    if (isDenoDeploy) {
      console.error("Deno KV getItem failed, falling back to memory", error);
      storage = useStorage("memory");
      storageName = "memory";
      plan = await storage.getItem<string>(id);
    }
    else {
      console.error("Storage getItem failed on memory", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Internal Server Error",
      });
    }
  }
  if (!plan) {
    return Response.json({ error: "Plan not found" }, { status: 404 });
  }

  retrievedPlansCounter.add(1);

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
      eventStream.push(plan);
    }

    try {
      unwatch = await storage.watch(async (planUpdateEvent, planIdIncludingPrefix) => {
        if (isClosed)
          return;
        // this is a bit stupid, but the prefix is included in the
        // event key, so we need to check for it here
        if (planIdIncludingPrefix !== `${storageName}:${id}`)
          return;
        if (planUpdateEvent === "remove") {
          isClosed = true;
          await eventStream.close();
          return;
        }

        if (planUpdateEvent === "update") {
          try {
            const latestPlan = await storage.getItem<string>(id);
            if (!latestPlan || isClosed) {
              isClosed = true;
              await eventStream.close();
              return;
            }
            await eventStream.push(latestPlan);
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

  return { blob: plan };
});
