import { z } from "zod";
import { v7 as uuidv7 } from "uuid";

defineRouteMeta({
  openAPI: {
    tags: ["Plan"],
    operationId: "postplan",
    description: "Create a new plan.",
    requestBody: {
      description:
        "If provided, the password will be used to encrypt the plan.",
      required: true,
      content: {
        "application/json": {
          examples: {
            "Plan without password": {
              "value": {
                "name": "Season 25/26 Handball"
              }
            },
            "Plan with password": {
              value: {
                "name": "Season 1999 Volleyball Women Location 5",
                "password": "ABCDEFG12345"
              }
            }
          },
          schema: {
            type: "object",
            required: ["name"],
            properties: {
              name: {
                type: "string",
              },
              password: {
                type: "string",
              },
            },
          },
        },
      },
    },
  },
});

export default defineEventHandler(async (event) => {
  const postPlanRequestSchema = z.object({
    name: z.string().trim().min(3),
    password: z.string().optional()
  });
  try {
    const body = await readValidatedBody(event, postPlanRequestSchema.parse);
  } catch (error) {
    if (error instanceof Error) {
      setResponseStatus(event, 400);
      return error.message;
    }
  }
  const planId = uuidv7();
  setResponseHeader(event, "location", `/api/plan/${planId}`);
  return sendNoContent(event, 201)
});
