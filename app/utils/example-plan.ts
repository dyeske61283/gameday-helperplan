import type { Plan } from "./plan-types";

export const examplePlan: Plan = {
  id: "example-plan-id-1234",
  name: "Spring Season 2026",
  teamMembers: [
    { id: "m1", name: "Alice Brown", email: "alice@example.com" },
    { id: "m2", name: "Bob Johnson", email: "bob@example.com" },
    { id: "m3", name: "Charlie Davis", email: "charlie@example.com" },
    { id: "m4", name: "Diana Wilson", email: "diana@example.com" },
    { id: "m5", name: "Eve Martinez", email: "eve@example.com" },
  ],
  rosters: [
    {
      id: "r1",
      name: "Main Team",
      memberIds: ["m1", "m2", "m3", "m4", "m5"],
    },
    {
      id: "r2",
      name: "Weekend Crew",
      memberIds: ["m1", "m3", "m5"],
    },
  ],
  games: [
    {
      id: "g1",
      dateAndTime: "2026-02-07T19:00:00Z",
      locationName: "Sports Hall Central",
      locationLink: "https://maps.example.com/sports-hall-central",
      homeTeam: "Team A",
      awayTeam: "Team Z",
      annotations: ["Important match", "Championship qualifier"],
      helpingTeam: "Main Team",
      helperAdmission: "Alice Brown",
      helperSteward: "Bob Johnson",
      helperTimekeeper: "Charlie Davis",
      helperSecretary: "Diana Wilson",
      helperWipe: "Eve Martinez",
    },
    {
      id: "g2",
      dateAndTime: "2026-02-14T18:30:00Z",
      locationName: "East Arena",
      locationLink: "https://maps.example.com/east-arena",
      homeTeam: "Team B",
      awayTeam: "Team Y",
      annotations: ["Friendly match"],
      helpingTeam: "Weekend Crew",
      helperAdmission: "Alice Brown",
      helperSteward: "Charlie Davis",
      helperTimekeeper: "Eve Martinez",
    },
  ],
};
