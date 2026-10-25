import z from "zod";
import { generateMatchICal, generateMemberICal } from "../../../app/utils/ical-export.ts";
import { decryptPlan, openFeedToken, readStoredPlan } from "../../utils/calendar-feeds.ts";

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    "Cache-Control": "private, no-store",
    "Content-Type": "text/calendar; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  if (!import.meta.dev && getRequestProtocol(event, { xForwardedProto: true }) !== "https") {
    throw createError({ statusCode: 400, statusMessage: "HTTPS is required" });
  }
  const { token } = await getValidatedRouterParams(event, z.object({ token: z.string().min(1).max(4096) }).parse);
  const secret = useRuntimeConfig(event).calendarFeedSecret;
  const payload = await openFeedToken(token, secret);
  if (!payload)
    throw createError({ statusCode: 404, statusMessage: "Calendar feed not found" });

  const storedPlan = await readStoredPlan(payload.planId);
  if (!storedPlan)
    throw createError({ statusCode: 404, statusMessage: "Calendar feed not found" });

  try {
    const plan = await decryptPlan(storedPlan.blob, payload.planKey);
    if (plan.id !== payload.planId)
      throw new Error("Plan ID mismatch");
    const calendar = payload.scope === "matches"
      ? generateMatchICal(plan)
      : generateMemberICal(plan, payload.memberId);
    return calendar;
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: "Calendar feed not found" });
  }
});
