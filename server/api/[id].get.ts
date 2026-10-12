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

  async function hydrateChunks(storedPlan: StoredPlan, planId: string) {
    if (!storedPlan.chunkCount)
      return storedPlan;
    const chunkStorage = useStorage<string>(storageName);
    const chunks = await Promise.all(
      Array.from({ length: storedPlan.chunkCount }, (_, index) => chunkStorage.getItem(`${planId}:chunk:${index}`)),
    );
    if (chunks.includes(null))
      throw createError({ statusCode: 500, statusMessage: "Stored plan is incomplete" });
    storedPlan.blob = chunks.join("");
    return storedPlan;
  }

  if (plan)
    plan = await hydrateChunks(plan, id);

  if (!plan) {
    return Response.json({ error: "Plan not found" }, { status: 404 });
  }

  if (getHeader(event, "accept") === "text/event-stream") {
    let unwatch: Awaited<ReturnType<typeof storage.watch>> | undefined;
    let isClosed = false;
    const eventStream = createEventStream(event);
    const denoEvent = event as typeof event & {
      runtime?: { deno?: { info?: { completed?: Promise<unknown> } } };
    };
    denoEvent.runtime?.deno?.info?.completed?.catch(error => console.warn("Deno plan stream request closed", error));

    async function stopWatching() {
      const stop = unwatch;
      unwatch = undefined;
      if (!stop)
        return;
      try {
        await stop();
      }
      catch (error) {
        console.warn("Failed to stop closed plan watcher", error);
      }
    }

    async function closeEventStream() {
      isClosed = true;
      try {
        await eventStream.close();
      }
      catch (error) {
        console.warn("Failed to close plan event stream", error);
      }
      await stopWatching();
    }

    eventStream.onClosed(() => {
      isClosed = true;
      void stopWatching();
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
          await closeEventStream();
          return;
        }

        if (planUpdateEvent === "update") {
          try {
            const latestPlan = await storage.getItem(id);
            if (!latestPlan || isClosed) {
              await closeEventStream();
              return;
            }
            await eventStream.push((await hydrateChunks(latestPlan, id)).blob);
          }
          catch (error) {
            console.error("Failed to push update to event stream", error);
            await closeEventStream();
          }
        }
      });
      if (isClosed)
        await stopWatching();
    }
    catch (error) {
      console.error("Storage watch failed", error);
    }

    return eventStream.send();
  }

  return plan;
});
