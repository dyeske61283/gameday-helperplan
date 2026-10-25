import z from "zod";
import { decryptPlan, readStoredPlan, sealFeedToken } from "../utils/calendar-feeds.ts";

const RequestSchema = z.discriminatedUnion("scope", [
  z.strictObject({ planId: z.uuid(), planKey: z.string().regex(/^[\w-]{22}$/), scope: z.literal("matches") }),
  z.strictObject({
    planId: z.uuid(),
    planKey: z.string().regex(/^[\w-]{22}$/),
    scope: z.literal("member-duties"),
    memberId: z.string().min(1).max(200),
  }),
]);

const TOKEN_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  const input = await readValidatedBody(event, RequestSchema.parse);
  const config = useRuntimeConfig(event);
  if (config.calendarFeedSecret.length < 32) {
    throw createError({ statusCode: 503, statusMessage: "Calendar feeds are unavailable" });
  }
  if (!import.meta.dev && getRequestProtocol(event, { xForwardedProto: true }) !== "https") {
    throw createError({ statusCode: 400, statusMessage: "HTTPS is required" });
  }

  let plan;
  try {
    const storedPlan = await readStoredPlan(input.planId);
    if (!storedPlan)
      throw createError({ statusCode: 404, statusMessage: "Plan not found" });
    plan = await decryptPlan(storedPlan.blob, input.planKey);
    if (plan.id !== input.planId || (input.scope === "member-duties" && !plan.members[input.memberId]))
      throw createError({ statusCode: 400, statusMessage: "Invalid calendar feed request" });
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error)
      throw error;
    throw createError({ statusCode: 400, statusMessage: "Invalid calendar feed request" });
  }

  const expiresAt = Date.now() + TOKEN_LIFETIME_MS;
  const token = await sealFeedToken({ ...input, expiresAt }, config.calendarFeedSecret);
  return { feedUrl: `/api/calendar-feeds/${token}`, expiresAt };
});
