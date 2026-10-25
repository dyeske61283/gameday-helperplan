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

  plan.revision ??= 0;

  if (getHeader(event, "accept") === "text/event-stream") {
    let isClosed = false;
    let isPolling = false;
    let latestRevision = plan.revision ?? 0;
    let pollTimer: ReturnType<typeof setInterval>;
    const eventStream = createEventStream(event);
    const denoEvent = event as typeof event & {
      runtime?: { deno?: { info?: { completed?: Promise<unknown> } } };
    };
    denoEvent.runtime?.deno?.info?.completed?.catch(error => console.warn("Deno plan stream request closed", error));

    async function closeEventStream() {
      isClosed = true;
      clearInterval(pollTimer);
      try {
        await eventStream.close();
      }
      catch (error) {
        console.warn("Failed to close plan event stream", error);
      }
    }

    // ponytail: one storage read per second per stream; use plan-scoped pub/sub if connection volume makes this costly.
    pollTimer = setInterval(() => {
      if (isClosed || isPolling)
        return;
      isPolling = true;
      void (async () => {
        try {
          const latestPlan = await storage.getItem(id);
          if (!latestPlan) {
            await closeEventStream();
            return;
          }
          const revision = latestPlan.revision ?? 0;
          if (revision <= latestRevision)
            return;

          const hydratedPlan = await hydrateChunks(latestPlan, id);
          await eventStream.push(JSON.stringify({ blob: hydratedPlan.blob, revision }));
          latestRevision = revision;
        }
        catch (error) {
          console.error("Failed to poll plan updates", error);
          await closeEventStream();
        }
        finally {
          isPolling = false;
        }
      })();
    }, 1000);

    eventStream.onClosed(() => {
      isClosed = true;
      clearInterval(pollTimer);
    });

    void eventStream.push(JSON.stringify({ blob: plan.blob, revision: latestRevision }));

    return eventStream.send();
  }

  return plan;
});
