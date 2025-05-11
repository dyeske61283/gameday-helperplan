export default defineEventHandler(async (event) => {
  const planId = event.context.params?.id;
  if (!planId) {
    setResponseStatus(event, 400);
    return "Plan ID is required";
  }
  const plan = await useStorage<PlanForStorage>("plans").getItem(planId);

  if (!plan) {
    setResponseStatus(event, 204);
    return;
  }

  plan.metaData.deletedAt = new Date();
  plan.metaData.active = false;
  try {
    await useStorage<PlanForStorage>("deleted_plans").setItem(planId, plan);
    await useStorage<PlanForStorage>("plans").removeItem(planId);
    setResponseStatus(event, 204);
  }
  catch (error) {
    setResponseStatus(event, 500);
    return "Error deleting plan";
  }
})
