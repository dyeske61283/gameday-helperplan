import type { ZodType } from "zod";
import z from "zod";

export const CURRENT_SCHEMA_VERSION = 2;
export type SchemaVersion = typeof CURRENT_SCHEMA_VERSION;

const serializedDateToDateSchema: ZodType<Date, number | string> = z.union([
  z.number().int().positive(),
  z.iso.datetime(),
]).transform(value => new Date(value));
const isoDateTimeStringToDateSchema: ZodType<Date, string> = z.iso.datetime().transform(millis => new Date(millis));

export const ClubSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  contactEmail: z.email().or(z.literal("")),
  homepage: z.url().or(z.literal("")),
  lastUpdated: serializedDateToDateSchema,
});

export type Club = z.infer<typeof ClubSchema>;

export const RoleSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  scope: z.enum(["gameday", "match"]), // Defines where this role can be assigned
  requiredSkillId: z.string().optional(),
});

export type Role = z.infer<typeof RoleSchema>;

export const LocationSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  link: z.url().optional(), // e.g., Google Maps link
  note: z.string().optional(),
});

export type Location = z.infer<typeof LocationSchema>;

export const ConfigSchema = z.strictObject({
  roles: z.array(RoleSchema),
  locations: z.array(LocationSchema),
});

export type Config = z.infer<typeof ConfigSchema>;

export const AssignmentStatusSchema = z.enum(["OPEN", "ASSIGNED", "COMPLETED", "CANCELLED"]);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

export const SlotSchema = z.strictObject({
  id: z.string(), // Unique ID for the slot itself
  roleId: z.string(),
  assignedMemberId: z.string().nullable(),
  assignmentStatus: AssignmentStatusSchema,
  customHelperName: z.string().nullable().optional(), // For roles like "Wiping", where a non-member name can be typed
  checkedIn: z.boolean().optional(), // For "I'm Here" check-in status
  updatedAt: serializedDateToDateSchema,
});

export type Slot = z.infer<typeof SlotSchema>;

export const GamedaySchema = z.strictObject({
  id: z.string(),
  date: z.iso.date(),
  locationId: z.string(),
  matchIds: z.array(z.string()),
  slots: z.array(SlotSchema), // Gameday-wide slots (e.g., Entrance, Catering)
  openingTime: z.iso.time().optional(),
  closingTime: z.iso.time().optional(),
  notes: z.string().optional(),
  updatedAt: serializedDateToDateSchema,
});

export type Gameday = z.infer<typeof GamedaySchema>;

export const MatchSchema = z.strictObject({
  id: z.string(),
  time: isoDateTimeStringToDateSchema,
  homeTeamId: z.string(),
  awayTeamName: z.string(),
  helperTeamId: z.string().optional(),
  slots: z.array(SlotSchema), // Match-specific slots (e.g., Timekeeper, Secretary)
  updatedAt: serializedDateToDateSchema,
});

export type Match = z.infer<typeof MatchSchema>;

export const MemberSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  teamIds: z.array(z.string()),
  skillIds: z.array(z.string()),
  isManual: z.boolean(),
  updatedAt: serializedDateToDateSchema,
});

export type Member = z.infer<typeof MemberSchema>;

export const TeamSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  league: z.string().optional(),
  isManual: z.boolean(),
  updatedAt: serializedDateToDateSchema,
});

export type Team = z.infer<typeof TeamSchema>;

export const SkillSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  updatedAt: serializedDateToDateSchema,
});

export type Skill = z.infer<typeof SkillSchema>;

export const SeasonPlanSchema = z.strictObject({
  id: z.uuid(),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  rev: z.number().positive(),
  lastUpdated: serializedDateToDateSchema,
  club: ClubSchema,
  season: z.string(),
  members: z.record(z.string(), MemberSchema),
  teams: z.record(z.string(), TeamSchema),
  skills: z.record(z.string(), SkillSchema),
  gamedays: z.record(z.string(), GamedaySchema),
  matches: z.record(z.string(), MatchSchema),
  config: ConfigSchema,
});

export type SeasonPlan = z.infer<typeof SeasonPlanSchema>;

const PlanVersionSchema = z.object({ schemaVersion: z.number().int() }).passthrough();

type PlanRecord = Record<string, unknown>;

/**
 * v0/v1 -> v2: add explicit duty status from legacy occupancy and default
 * missing match/gameday slot arrays to empty arrays.
 */
function migratePreV2ToV2(input: PlanRecord): PlanRecord {
  const plan = structuredClone(input);

  for (const collection of [plan.matches, plan.gamedays]) {
    if (!collection || typeof collection !== "object" || Array.isArray(collection))
      continue;

    for (const entity of Object.values(collection)) {
      if (!entity || typeof entity !== "object" || Array.isArray(entity))
        continue;

      const record = entity as PlanRecord;
      if (!Object.hasOwn(record, "slots"))
        record.slots = [];
      if (!Array.isArray(record.slots))
        continue;
      for (const slot of record.slots) {
        if (!slot || typeof slot !== "object" || Array.isArray(slot))
          continue;
        const duty = slot as PlanRecord;
        if (duty.assignmentStatus === undefined)
          duty.assignmentStatus = duty.assignedMemberId || duty.customHelperName ? "ASSIGNED" : "OPEN";
      }
    }
  }

  plan.schemaVersion = CURRENT_SCHEMA_VERSION;
  return plan;
}

/** Migrate and validate decrypted plan JSON before it enters active state. */
export function parseSeasonPlan(input: unknown): SeasonPlan {
  const { schemaVersion } = PlanVersionSchema.parse(input);
  let candidate = input;

  if (schemaVersion === 0 || schemaVersion === 1)
    candidate = migratePreV2ToV2(input as PlanRecord);
  else if (schemaVersion !== CURRENT_SCHEMA_VERSION)
    throw new Error(`Unsupported plan schema version: ${schemaVersion}`);

  return SeasonPlanSchema.parse(candidate);
}

export const NewPlanMetadataSchema = z.object({
  clubName: z.string().trim().min(1, "ui.clubNameRequired"),
  season: z.string().trim().min(1, "ui.seasonRequired"),
});

export type NewPlanMetadata = z.infer<typeof NewPlanMetadataSchema>;
