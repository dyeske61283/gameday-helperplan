export default defineEventHandler(async (event) => {
  const planId = event.context.params?.id;
  if (!planId) {
    setResponseStatus(event, 400);
    return "Plan ID is required";
  }
  // TODO: validate the request body
  const body = await readBody(event);
  if (!body) {
    setResponseStatus(event, 400);
    return "";
  }
  const storage = useStorage<PlanForStorage>("plans");
  const plan = await storage.has(planId);
  
  if (!plan) {
    setResponseStatus(event, 404);
    return "Plan not found";
  }

  await storage.setItem(planId, {} as PlanForStorage);

  setResponseStatus(event, 200);
  return "";
});
