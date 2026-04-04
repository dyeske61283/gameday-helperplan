import { z } from 'zod'

export default eventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string().length(36)
  }).parse)
  const storage = useStorage("plans")

  const plan = await storage.getItem<string>(id)
  if (!plan) {
    return Response.json({ error: "Plan not found" }, { status: 404 })
  }

  if (getHeader(event, 'accept') === 'text/event-stream') {
    let unwatch: Awaited<ReturnType<typeof storage.watch>> | undefined = undefined
    let isClosed = false;
    const eventStream = createEventStream(event);

    eventStream.onClosed(async () => {
      isClosed = true;
      await eventStream.close();
      if (unwatch) await unwatch();
    });

    eventStream.push(plan);

    unwatch = await storage.watch(async (planUpdateEvent, planIdIncludingPrefix) => {
      if (isClosed) return;
      // this is a bit stupid, but the prefix is included in the 
      // event key, so we need to check for it here
      if (planIdIncludingPrefix !== "plans:" + id) return
      if (planUpdateEvent === 'remove') {
        isClosed = true;
        await eventStream.close()
        return
      }

      if (planUpdateEvent === 'update') {
        try {
          const latestPlan = await storage.getItem<string>(id)
          if (!latestPlan || isClosed) {
            isClosed = true;
            await eventStream.close()
            return
          }
          await eventStream.push(latestPlan)
        }
        catch (error) {
          isClosed = true;
          console.error("Failed to push update to event stream", error);
          await eventStream.close();
          if (unwatch) await unwatch();
        }
      }
    });

    return eventStream.send();
  }

  return plan
})