import { z } from "zod";
import { v7 as uuidv7 } from "uuid";

defineRouteMeta({
  openAPI: {
    tags: ["Plan"],
    operationId: "createPlan",
    description: "Creates a new plan with encrypted data for zero-knowledge storage.",
    requestBody: {
      required: false,
      description: "The plan data should be encrypted by the client to guarantee zero-knowledge. All fields are optional and can be added later.",
      content: {
        "application/json": {
          examples: {
            "Plan with name": {
              value: {
                name: "Season 25/26 Handball"
              }
            },
            "Plan with name and description": {
              value: {
                name: "Season 1999 Volleyball Women Location 5",
                description: "A plan for the volleyball season 1999"
              }
            },
            "Plan with name, description and content": {
              value: {
                name: "Season 1999 Volleyball Women Location 5",
                description: "A plan for the volleyball season 1999",
                planData: "SWYgeW91IGZpbmQgb3V0IGFib3V0IHRoaXMgZWFzdGVyIGVnZywgdGhlbiB5b3UgYXJlIGEgZ29vZCBwZXJzb24gd2l0aCBhIGxvdmVseSBjdXJpb3NpdHkuIEkgaG9wZSBldmVyeXRoaW5nIGdvZXMgeW91ciB3YXkuIDop"
              }
            }
          },
          schema: {
            type: "object",
            properties: {
              name: {
                type: "string",
              },
              description: {
                type: "string",
              },
              planData: {
                type: "string",
              },
            },
          },
        },
      },
    },
    responses: {
      "201": {
        description: "Plan created successfully",
        headers: {
          Location: {
            description: "URL of the newly created plan",
            schema: {
              type: "string",
              format: "uri",
              example: "/api/plan/0196c600-0867-717b-810d-522ff19b9d4e"
            }
          }
        }
      },
      "409": {
        description: "Plan with the generated ID already exists. Try again.",
        content: {
          "text/plain": {
            schema: {
              type: "string",
              example: "Plan already exists"
            }
          }
        }
      },
      "422": {
        description: "Validation error in request body",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  example: "Validation error"
                },
                errors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: {
                        type: "string"
                      },
                      message: {
                        type: "string"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "500": {
        description: "Server error while creating plan"
      }
    }
  },
});

export default defineEventHandler(async (event) => {
  const postPlanRequestSchema = z.optional(z.object({
    name: z.optional(z.string().trim().min(3)),
    description: z.optional(z.string().trim().min(3)),
    planData: z.optional(z.string()),
  }));
  const body = await readValidatedBody(
    event,
    postPlanRequestSchema.parse
  ).catch((error) => {
    if (error instanceof Error) {
      return undefined;
    }
  });
  const planId = uuidv7();
  const storage = useStorage<PlanForStorage>("plans");
  const planAlreadyExists = await storage.has(planId).catch((e: unknown) => {
    if (e instanceof Error) {
      setResponseStatus(event, 500);
    }
    return true;
  });
  if (planAlreadyExists) {
    setResponseStatus(event, 409);
    return "Plan already exists";
  }
  try {
    storage.set(planId, {
      id: planId,
      metaData: {
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
        name: body?.name,
        description: body?.description,
      },
      nonce: '',
      isEncrypted: true,
      encryptedBlob: body?.planData ?? "",
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      setResponseStatus(event, 500);
      return;
    }
  }
  setResponseHeader(event, "location", `/api/plan/${planId}`);
  return sendNoContent(event, 201);
});
