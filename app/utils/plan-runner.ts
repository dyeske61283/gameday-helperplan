import type { SeasonPlan } from "./plan-types";
import { z } from "zod";
import { autoAssignMatchDuties, claimDuty, completeClosedAssignments } from "./helper-assignment";
import { parseSeasonPlan } from "./plan-types";

const requestSchemas = {
  "validate": z.strictObject({ command: z.literal("validate"), plan: z.unknown() }),
  "claim-duty": z.strictObject({
    command: z.literal("claim-duty"),
    plan: z.unknown(),
    matchId: z.string().min(1),
    slotId: z.string().min(1),
    memberId: z.string().min(1),
    now: z.iso.datetime(),
  }),
  "auto-assign": z.strictObject({
    command: z.literal("auto-assign"),
    plan: z.unknown(),
    matchId: z.string().min(1),
    now: z.iso.datetime(),
    balanceDutyCounts: z.boolean().optional(),
    excludeConflicts: z.boolean().optional(),
  }),
  "complete-assignments": z.strictObject({
    command: z.literal("complete-assignments"),
    plan: z.unknown(),
    now: z.iso.datetime(),
  }),
};

type Command = keyof typeof requestSchemas;

export function runPlanCommand(input: unknown): { command: Command; summary: Record<string, unknown>; plan: SeasonPlan } {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Request must be a JSON object");

  const command = (input as { command?: unknown }).command;
  if (typeof command !== "string" || !Object.hasOwn(requestSchemas, command))
    throw new Error(`Unknown command: ${String(command)}`);

  const request = requestSchemas[command as Command].safeParse(input);
  if (!request.success) {
    const details = request.error.issues.map(issue => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; ");
    throw new Error(`Invalid request: ${details}`);
  }

  const data = request.data;
  const plan = parseSeasonPlan(data.plan);
  if (data.command === "validate")
    return { command: data.command, summary: { valid: true }, plan };

  const now = new Date(data.now);
  if (data.command === "claim-duty") {
    claimDuty(plan, data.matchId, data.slotId, data.memberId, now);
    return { command: data.command, summary: { matchId: data.matchId, slotId: data.slotId, assignedMemberId: data.memberId }, plan };
  }
  if (data.command === "auto-assign") {
    if (!plan.matches[data.matchId])
      throw new Error("Match not found");
    const result = autoAssignMatchDuties(plan, data.matchId, {
      balanceDutyCounts: data.balanceDutyCounts,
      excludeConflicts: data.excludeConflicts,
      now,
    });
    return { command: data.command, summary: result, plan };
  }

  const completedCount = completeClosedAssignments(plan, now);
  return { command: data.command, summary: { completedCount }, plan };
}
