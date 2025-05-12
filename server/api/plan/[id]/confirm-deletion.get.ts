import { logger } from "nuxt/kit";

defineRouteMeta({
  openAPI: {
    tags: ["Plan"],
    operationId: "confirmPlanDeletion",
    description: "Permanently deletes a plan that was previously marked for deletion.",
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        description: "The ID of the plan to permanently delete.",
        schema: {
          type: "string",
          format: "uuid"
        },
        example: "0196c600-0867-717b-810d-522ff19b9d4e"
      }
    ],
    responses: {
      "204": {
        description: "Plan permanently deleted successfully"
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
        description: "Plan not found in deleted plans",
        content: {
          "text/plain": {
            schema: {
              type: "string",
              example: "Plan not found in deleted plans"
            }
          }
        }
      }
    }
  }
});

export default defineEventHandler(async (event) => {
  const planId = event.context.params?.id;
  if (!planId) {
    setResponseStatus(event, 400);
    return "Plan ID is required";
  }

  const deletedPlan = await useStorage<PlanForStorage>("deleted_plans").getItem(planId);
  if (!deletedPlan) {
    setResponseStatus(event, 204);
    return "Plan permanently deleted";
  }

  try {
    await useStorage<PlanForStorage>("deleted_plans").removeItem(planId);
    setResponseStatus(event, 204);
    return "Plan permanently deleted";
  } catch (error) {
    setResponseStatus(event, 500);
    return "Error permanently deleting plan";
  }
})
