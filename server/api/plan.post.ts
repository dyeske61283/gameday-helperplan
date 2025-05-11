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
              value: {
                name: "Season 25/26 Handball",
              },
            },
            "Plan with password": {
              value: {
                name: "Season 1999 Volleyball Women Location 5",
                password: "ABCDEFG12345",
              },
            },
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
    password: z.string().optional(),
  });
  const body = await readValidatedBody(
    event,
    postPlanRequestSchema.parse
  ).catch((error) => {
    if (error instanceof Error) {
      return undefined;
    }
  });
  if(!body) { 
    setResponseStatus(event, 400);
    return;
  }
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
        name: body.name,
        description: "",
      },
      isEncrypted: false,
      unencryptedBlob: {
        events: [],
        availableHelpers: [],
        neededSkills: [],
      },
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
