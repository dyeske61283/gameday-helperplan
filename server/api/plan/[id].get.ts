defineRouteMeta({
  openAPI: {
    tags: ["Plan"],
    operationId: "getPlan",
    description: "Retrieves a specific plan by its ID.",
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        description: "The ID of the plan to retrieve.",
        schema: {
          type: "string",
          format: "uuid"
        },
        example: "0196c600-0867-717b-810d-522ff19b9d4e"
      }
    ],
    responses: {
      "200": {
        description: "Plan found and returned successfully",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Plan"
            }
          }
        }
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
      "404": {
        description: "Plan not found",
        content: {
          "text/plain": {
            schema: {
              type: "string",
              example: "Plan not found"
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
  const storage = useStorage<PlanForStorage>("plans");
  const plan = await storage.getItem(planId);
  if (!plan) {
    setResponseStatus(event, 404);
    return "Plan not found";
  }

  return plan;
})
