
defineRouteMeta({
  openAPI: {
    tags: ["Plan"],
    operationId: "deletePlan",
    description: "Marks a plan for deletion. The plan can be permanently deleted using the confirm-deletion endpoint.",
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        description: "The ID of the plan to delete.",
        schema: {
          type: "string",
          format: "uuid"
        },
        example: "0196c600-0867-717b-810d-522ff19b9d4e",
      },
    ],
    responses: {
      "204": {
        description: "Plan successfully marked for deletion.",
      },
      "400": {
        description: "Plan ID is required",
        content: {
          "text/plain": {
            schema: {
              type: "string",
              example: "Plan ID is required"
            }
          }
        }
      },
      "500": {
        description: "Server error while deleting plan",
        content: {
          "text/plain": {
            schema: {
              type: "string",
              example: "Error deleting plan"
            }
          }
        }
      }
    }
  },
});

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
