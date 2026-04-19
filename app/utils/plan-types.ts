export type TeamMember = {
  id: string;
  name: string;
  email?: string;
}

export type Roster = {
  id: string;
  name: string;
  memberIds: string[];
}

export type Game = {
  id: string;
  dateAndTime: string; // ISO string for easy serialization
  locationName: string;
  locationLink?: string;
  homeTeam: string;
  awayTeam: string;
  annotations: string[];
  helpingTeam: string;
  helperAdmission?: string;
  helperSteward?: string;
  helperTimekeeper?: string;
  helperSecretary?: string;
  helperWipe?: string;
}

export type Plan = {
  id: string;
  name: string;
  teamMembers: TeamMember[];
  rosters: Roster[];
  games: Game[];
}
