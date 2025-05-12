defineRouteMeta({
  openAPI: {
    tags: ["Plan"],
    operationId: "updatePlan",
    description: "Updates an existing plan with new data.",
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        description: "The ID of the plan to update.",
        schema: {
          type: "string",
          format: "uuid"
        },
        example: "0196c600-0867-717b-810d-522ff19b9d4e"
      }
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Plan"
          }
        }
      }
    },
    responses: {
      "204": {
        description: "Plan updated successfully"
      },
      "400": {
        description: "Invalid request (missing ID or body)",
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

  setResponseStatus(event, 204);
  return "";
});
