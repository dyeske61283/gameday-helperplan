export type SeasonPlan = {
  id: string; // UUID
  schemaVersion: number; // 1
  rev: number; // Monotonic revision number for conflict detection
  lastUpdated: number; // timestamp (ms)

  club: Club;
  season: string; // e.g., "2025/2026"

  // Normalized Data
  members: Record<string, Member>;
  teams: Record<string, Team>;
  skills: Record<string, Skill>;
  gamedays: Record<string, Gameday>;
  matches: Record<string, Match>;

  config: Config;
};

type Club = {
  id: string;
  name: string;
  contactEmail: string;
  homepage: string;
  lastUpdated: number;
};

export type Config = {
  roles: Role[];
  locations: Location[];
};

export type Role = {
  id: string;
  name: string;
  icon?: string;
  scope: "gameday" | "match"; // Defines where this role can be assigned
  requiredSkillId?: string;
};

export type Location = {
  id: string;
  name: string;
  link?: string; // e.g., Google Maps link
};

export type Gameday = {
  id: string;
  date: string; // ISO 8601 (YYYY-MM-DD)
  locationId: string;
  matchIds: string[];
  slots: Slot[]; // Gameday-wide slots (e.g., Entrance, Catering)
  updatedAt: number;
};

export type Match = {
  id: string;
  time: string; // ISO 8601 or "HH:mm"
  homeTeam: string;
  awayTeam: string;
  helperTeamId?: string;
  slots: Slot[]; // Match-specific slots (e.g., Timekeeper, Secretary)
  updatedAt: number;
};

export type Slot = {
  id: string; // Unique ID for the slot itself
  roleId: string;
  assignedMemberId: string | null;
  updatedAt: number;
};

export type Member = {
  id: string;
  name: string;
  teamIds: string[];
  skillIds: string[];
  isManual: boolean;
  updatedAt: number;
};

export type Team = {
  id: string;
  name: string;
  isManual: boolean;
  updatedAt: number;
};

export type Skill = {
  id: string;
  name: string;
  updatedAt: number;
};
