import type { ZodType } from "zod";
import z from "zod";

const unixTimestampToDateSchema: ZodType<Date, number> = z.number().int().positive().transform(millis => new Date(millis));
const isoDateTimeStringToDateSchema: ZodType<Date, string> = z.iso.datetime().transform(millis => new Date(millis));

export const ClubSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactEmail: z.email(),
  homepage: z.url(),
  lastUpdated: unixTimestampToDateSchema,
});

export type Club = z.infer<typeof ClubSchema>;

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  scope: z.enum(["gameday", "match"]), // Defines where this role can be assigned
  requiredSkillId: z.string().optional(),
});

export type Role = z.infer<typeof RoleSchema>;

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  link: z.url().optional(), // e.g., Google Maps link
  note: z.string().optional(),
});

export type Location = z.infer<typeof LocationSchema>;

export const ConfigSchema = z.object({
  roles: z.array(RoleSchema),
  locations: z.array(LocationSchema),
});

export type Config = z.infer<typeof ConfigSchema>;

export const SlotSchema = z.object({
  id: z.string(), // Unique ID for the slot itself
  roleId: z.string(),
  assignedMemberId: z.string().nullable(),
  customHelperName: z.string().nullable().optional(), // For roles like "Wiping", where a non-member name can be typed
  checkedIn: z.boolean().optional(), // For "I'm Here" check-in status
  updatedAt: unixTimestampToDateSchema,
});

export type Slot = z.infer<typeof SlotSchema>;

export const GamedaySchema = z.object({
  id: z.string(),
  date: z.iso.date(),
  locationId: z.string(),
  matchIds: z.array(z.string()),
  slots: z.array(SlotSchema), // Gameday-wide slots (e.g., Entrance, Catering)
  openingTime: z.iso.time().optional(),
  closingTime: z.iso.time().optional(),
  notes: z.string().optional(),
  updatedAt: unixTimestampToDateSchema,
});

export type Gameday = z.infer<typeof GamedaySchema>;

export const MatchSchema = z.object({
  id: z.string(),
  time: isoDateTimeStringToDateSchema,
  homeTeamId: z.string(),
  awayTeamName: z.string(),
  helperTeamId: z.string().optional(),
  slots: z.array(SlotSchema), // Match-specific slots (e.g., Timekeeper, Secretary)
  updatedAt: unixTimestampToDateSchema,
});

export type Match = z.infer<typeof MatchSchema>;

export const MemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  teamIds: z.array(z.string()),
  skillIds: z.array(z.string()),
  isManual: z.boolean(),
  updatedAt: unixTimestampToDateSchema,
});

export type Member = z.infer<typeof MemberSchema>;

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  league: z.string().optional(),
  isManual: z.boolean(),
  updatedAt: unixTimestampToDateSchema,
});

export type Team = z.infer<typeof TeamSchema>;

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  updatedAt: unixTimestampToDateSchema,
});

export type Skill = z.infer<typeof SkillSchema>;

export const SeasonPlanSchema = z.object({
  id: z.uuid(),
  schemaVersion: z.number().positive(),
  rev: z.number().positive(),
  lastUpdated: unixTimestampToDateSchema,
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
