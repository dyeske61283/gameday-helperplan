import type {
  Club,
  Config,
  Gameday,
  Location,
  Match,
  Member,
  Role,
  SeasonPlan,
  Skill,
  Slot,
  Team,
} from "../../app/utils/plan-types";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Zod schemas matching the types in app/utils/plan-types.d.ts
// The type annotations (e.g. z.ZodType<Club>) ensure compile-time sync
const ClubSchema: z.ZodType<Club> = z.object({
  id: z.string(),
  name: z.string(),
  contactEmail: z.string(),
  homepage: z.string(),
  lastUpdated: z.number(),
});

const RoleSchema: z.ZodType<Role> = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  scope: z.enum(["gameday", "match"]),
  requiredSkillId: z.string().optional(),
});

const LocationSchema: z.ZodType<Location> = z.object({
  id: z.string(),
  name: z.string(),
  link: z.string().optional(),
});

const ConfigSchema: z.ZodType<Config> = z.object({
  roles: z.array(RoleSchema),
  locations: z.array(LocationSchema),
});

const SlotSchema: z.ZodType<Slot> = z.object({
  id: z.string(),
  roleId: z.string(),
  assignedMemberId: z.string().nullable(),
  customHelperName: z.string().nullable().optional(),
  checkedIn: z.boolean().optional(),
  updatedAt: z.number(),
});

const GamedaySchema: z.ZodType<Gameday> = z.object({
  id: z.string(),
  date: z.string(),
  locationId: z.string(),
  matchIds: z.array(z.string()),
  slots: z.array(SlotSchema),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  notes: z.string().optional(),
  updatedAt: z.number(),
});

const MatchSchema: z.ZodType<Match> = z.object({
  id: z.string(),
  time: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  helperTeamId: z.string().optional(),
  slots: z.array(SlotSchema),
  updatedAt: z.number(),
});

const MemberSchema: z.ZodType<Member> = z.object({
  id: z.string(),
  name: z.string(),
  teamIds: z.array(z.string()),
  skillIds: z.array(z.string()),
  isManual: z.boolean(),
  updatedAt: z.number(),
});

const TeamSchema: z.ZodType<Team> = z.object({
  id: z.string(),
  name: z.string(),
  league: z.string().optional(),
  isManual: z.boolean(),
  updatedAt: z.number(),
});

const SkillSchema: z.ZodType<Skill> = z.object({
  id: z.string(),
  name: z.string(),
  updatedAt: z.number(),
});

const SeasonPlanSchema: z.ZodType<SeasonPlan> = z.object({
  id: z.string(),
  schemaVersion: z.number(),
  rev: z.number(),
  lastUpdated: z.number(),
  club: ClubSchema,
  season: z.string(),
  members: z.record(z.string(), MemberSchema),
  teams: z.record(z.string(), TeamSchema),
  skills: z.record(z.string(), SkillSchema),
  gamedays: z.record(z.string(), GamedaySchema),
  matches: z.record(z.string(), MatchSchema),
  config: ConfigSchema,
});

const FIXTURES_DIR = path.join(import.meta.dirname, "../fixtures");

describe("example plans validation", () => {
  it("should successfully load and validate 2024/2025 plan fixture", () => {
    const planPath = path.join(FIXTURES_DIR, "plan-2024-2025.json");
    expect(fs.existsSync(planPath)).toBe(true);

    const rawPlan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    const plan = SeasonPlanSchema.parse(rawPlan);

    // Specific structural checks
    expect(plan.season).toBe("2024/2025");
    expect(plan.club.name).toBeTruthy();

    // Check that we have actual matches and gamedays
    expect(Object.keys(plan.gamedays).length).toBeGreaterThan(0);
    expect(Object.keys(plan.matches).length).toBeGreaterThan(0);

    // Verify some specific mapped slot fields (e.g. checkedIn is false by default)
    const matchesList = Object.values(plan.matches);
    const hasSlots = matchesList.some(m => m.slots && m.slots.length > 0);
    expect(hasSlots).toBe(true);

    const sampleMatch = matchesList.find(m => m.slots && m.slots.length > 0);
    expect(sampleMatch?.slots[0].checkedIn).toBe(false);
  });

  it("should successfully load and validate 2025/2026 plan fixture", () => {
    const planPath = path.join(FIXTURES_DIR, "plan-2025-2026.json");
    expect(fs.existsSync(planPath)).toBe(true);

    const rawPlan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    const plan = SeasonPlanSchema.parse(rawPlan);

    // Specific structural checks
    expect(plan.season).toBe("2025/2026");
    expect(plan.club.name).toBeTruthy();

    // Check that we have actual matches and gamedays
    expect(Object.keys(plan.gamedays).length).toBeGreaterThan(0);
    expect(Object.keys(plan.matches).length).toBeGreaterThan(0);

    // Verify location resolves
    const gamedaysList = Object.values(plan.gamedays);
    expect(gamedaysList.some(gd => gd.locationId === "emmy-noether-halle")).toBe(true);
  });
});
