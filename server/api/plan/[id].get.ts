export default defineEventHandler(async (event) => {
  const planId = event.context.params?.id;
  if (!planId) {
    setResponseStatus(event, 400);
    return "Plan ID is required";
  }
  const storage = useStorage<PlanForStorage>("plans");
  const plan = await storage.getItem(planId);
  if (!plan) {
    setResponseStatus(event, 404);
    return "Plan not found";
  }

  return plan;
})
