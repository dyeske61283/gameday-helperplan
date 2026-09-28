import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fakerDE as faker } from "@faker-js/faker";
/* eslint-disable no-console, node/no-process-env */

// Seed faker for deterministic generation
faker.seed(12345);

// Setup file paths
const NULIGA_DATA_DIR = process.env.NULIGA_DATA_DIR || process.argv[2];
if (!NULIGA_DATA_DIR) {
  console.error("Error: Please specify the NULIGA_DATA_DIR environment variable or pass the directory path as the first argument.");
  process.exit(1);
}
const FIXTURES_DIR = path.join(import.meta.dirname, "../test/fixtures");

// Ensure fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// Utility to slugify string
function slugify(text) {
  if (!text)
    return "";
  return text.toString().toLowerCase().replace(/[öäüß]/g, (match) => {
    const replacements = { ö: "oe", ä: "ae", ü: "ue", ß: "ss" };
    return replacements[match] || match;
  }).replace(/[^a-z0-9]+/g, "-").replace(/(?:^-|-$)+/g, "");
}

// Map helper plan date "DD.MM.YYYY" to ISO "YYYY-MM-DD"
function formatIsoDate(dateStr) {
  const [day, month, year] = dateStr.split(".");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const nameMap = new Map();

function getAnonymizedName(realName) {
  const trimmed = realName.trim();
  if (!trimmed)
    return "";

  const lower = trimmed.toLowerCase();
  if (["ja", "nein", "zuschauer", "eltern", "spielbericht", "verlegt", "geht nicht", "???", "verkauf", "gast", "club-wide"].includes(lower)) {
    return trimmed;
  }
  if (["männer", "frauen", "mb", "md", "jugend", "minis", "eltern", "e-jugend", "ge-jgd", "wc-jgd", "wd-jgd", "md-jgd", "mb-jgd"].some(t => lower.includes(t))) {
    return trimmed;
  }

  if (nameMap.has(lower)) {
    return nameMap.get(lower);
  }

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const fakeName = `${firstName} ${lastName}`;
  nameMap.set(lower, fakeName);
  return fakeName;
}

const fakeClubName = `${faker.location.city()} HC`;
const fakeClubEmail = faker.internet.email({ provider: `${slugify(fakeClubName)}.de` });
const fakeClubHomepage = `https://www.${slugify(fakeClubName)}.de`;

const teamNameMap = new Map();
function getAnonymizedTeamName(realTeamName) {
  const trimmed = (realTeamName || "").trim();
  if (!trimmed)
    return "";
  const lower = trimmed.toLowerCase();
  if (["gast", "heim"].includes(lower)) {
    return trimmed;
  }
  if (teamNameMap.has(lower)) {
    return teamNameMap.get(lower);
  }
  let fakeName = trimmed;
  if (lower.startsWith("hsg sgs erl/hc niederl")) {
    fakeName = trimmed.replace(/HSG SGS Erl\/HC Niederl/gi, fakeClubName);
  }
  else {
    const city = faker.location.city();
    const prefix = faker.helpers.arrayElement(["TSV", "SV", "TV", "HC", "HSG", "SG"]);
    fakeName = `${prefix} ${city}`;
    if (trimmed.endsWith(" II"))
      fakeName += " II";
    else if (trimmed.endsWith(" III"))
      fakeName += " III";
  }
  teamNameMap.set(lower, fakeName);
  return fakeName;
}

// Map helper plan team name to NuLiga home team name
function mapHomeTeam(helperTeamName) {
  const name = helperTeamName.trim();
  if (name.includes("Männer I") || name === "Männer")
    return "HSG SGS Erl/HC Niederl";
  if (name.includes("Männer II"))
    return "HSG SGS Erl/HC Niederl II";
  if (name.includes("Männer III"))
    return "HSG SGS Erl/HC Niederl III";
  if (name.includes("mB") || name.includes("B-Jugend") || name.includes("mB-Jgd"))
    return "HSG SGS Erl/HC Niederl";
  if (name.includes("mD") || name.includes("D-Jugend") || name.includes("mD-Jgd"))
    return "HSG SGS Erl/HC Niederl";
  if (name.includes("E-Jugend") || name.includes("gE-Jgd") || name.includes("EJgd-") || name.includes("gem. E-Jugend"))
    return "HSG SGS Erl/HC Niederl";
  if (name.includes("Minis"))
    return "HSG SGS Erl/HC Niederl";
  return "HSG SGS Erl/HC Niederl";
}

// Map helper plan team name to our internal Team ID
function getTeamId(helperTeamName) {
  const name = helperTeamName.trim();
  if (name.includes("Männer I") || name === "Männer")
    return "maenner-1";
  if (name.includes("Männer II"))
    return "maenner-2";
  if (name.includes("Männer III"))
    return "maenner-3";
  if (name.includes("mB") || name.includes("B-Jugend") || name.includes("mB-Jgd"))
    return "mb-jgd";
  if (name.includes("mD") || name.includes("D-Jugend") || name.includes("mD-Jgd"))
    return "md-jgd";
  if (name.includes("E-Jugend") || name.includes("gE-Jgd") || name.includes("EJgd-") || name.includes("gem. E-Jugend"))
    return "ge-jgd";
  if (name.includes("Minis"))
    return "minis";
  if (name.includes("Frauen"))
    return "frauen";
  if (name.includes("wC"))
    return "wc-jgd";
  if (name.includes("wD"))
    return "wd-jgd";
  return "club-wide";
}

// Mapped locations based on club_info.json
const LOCATIONS = [
  {
    id: "seebachgrundhalle",
    name: `${faker.location.city()}, Seebach-Arena`,
    link: `https://maps.google.com/?q=${encodeURIComponent(faker.location.streetAddress(true))}`,
  },
  {
    id: "siemens-sporthalle",
    name: `${faker.location.city()}, Siemens-Sportpark`,
    link: `https://maps.google.com/?q=${encodeURIComponent(faker.location.streetAddress(true))}`,
  },
  {
    id: "schulzentrum-spardorf",
    name: `${faker.location.city()}, Sporthalle am Schulzentrum`,
    link: `https://maps.google.com/?q=${encodeURIComponent(faker.location.streetAddress(true))}`,
  },
  {
    id: "emmy-noether-halle",
    name: `${faker.location.city()}, Emmy-Noether-Halle`,
    link: `https://maps.google.com/?q=${encodeURIComponent(faker.location.streetAddress(true))}`,
  },
  {
    id: "europakanal-sporthalle",
    name: `${faker.location.city()}, Sporthalle am Europakanal`,
    link: `https://maps.google.com/?q=${encodeURIComponent(faker.location.streetAddress(true))}`,
  },
];

// Determine location ID based on gameday notes
function resolveLocationId(notes) {
  const noteStr = (notes || "").toLowerCase();
  if (noteStr.includes("euro") || noteStr.includes("emmy-noether")) {
    return "emmy-noether-halle";
  }
  if (noteStr.includes("siemens")) {
    return "siemens-sporthalle";
  }
  if (noteStr.includes("spardorf")) {
    return "schulzentrum-spardorf";
  }
  if (noteStr.includes("europakanal")) {
    return "europakanal-sporthalle";
  }
  return "seebachgrundhalle"; // Default Seebachgrundhalle
}

const clubInfo = {
  id: faker.string.numeric(7),
  name: fakeClubName,
  contactEmail: fakeClubEmail,
  homepage: fakeClubHomepage,
  lastUpdated: Date.now(),
};

// Default roles mapping
const DEFAULT_ROLES = [
  { id: "timekeeper", name: "Zeitnehmer", scope: "match", requiredSkillId: "esb" },
  { id: "secretary", name: "Sekretär", scope: "match", requiredSkillId: "esb" },
  { id: "steward_entrance", name: "Ordner Einlass", scope: "match", requiredSkillId: "steward" },
  { id: "steward_2", name: "Ordner 2", scope: "match" },
  { id: "wiper_1", name: "Wischer 1", scope: "match" },
  { id: "wiper_2", name: "Wischer 2", scope: "match" },
  { id: "referee_1", name: "Schiedsrichter 1", scope: "match", requiredSkillId: "referee" },
  { id: "referee_2", name: "Schiedsrichter 2", scope: "match", requiredSkillId: "referee" },
  { id: "video", name: "Video", scope: "match" },
  { id: "catering", name: "Catering (Verkauf)", scope: "match" },
];

// Default skills mapping
const DEFAULT_SKILLS = {
  esb: { id: "esb", name: "E-Spielbericht (ESB)", updatedAt: Date.now() },
  referee: { id: "referee", name: "Schiedsrichter-Lizenz", updatedAt: Date.now() },
  steward: { id: "steward", name: "Ordner-Schulung", updatedAt: Date.now() },
};

// Define teams
const TEAMS = {
  "maenner-1": { id: "maenner-1", name: "Männer I", isManual: false, updatedAt: Date.now() },
  "maenner-2": { id: "maenner-2", name: "Männer II", isManual: false, updatedAt: Date.now() },
  "maenner-3": { id: "maenner-3", name: "Männer III", isManual: false, updatedAt: Date.now() },
  "mb-jgd": { id: "mb-jgd", name: "mB-Jugend", isManual: false, updatedAt: Date.now() },
  "md-jgd": { id: "md-jgd", name: "mD-Jugend", isManual: false, updatedAt: Date.now() },
  "ge-jgd": { id: "ge-jgd", name: "gem. E-Jugend", isManual: false, updatedAt: Date.now() },
  "minis": { id: "minis", name: "Minis", isManual: false, updatedAt: Date.now() },
  "frauen": { id: "frauen", name: "Frauen", isManual: false, updatedAt: Date.now() },
  "wc-jgd": { id: "wc-jgd", name: "wC-Jugend", isManual: false, updatedAt: Date.now() },
  "wd-jgd": { id: "wd-jgd", name: "wD-Jugend", isManual: false, updatedAt: Date.now() },
};

function addLeagueToTeams(filePath, teams) {
  const teamData = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // find correct team
  for (const key in teams) {
    const team = teamData.find(el => el.teamContestName.trim() === teams[key].name.trim());
    if (!team) {
      console.error(`Could not find team ${teams[key].name} in teamData`);
    }
    else {
      console.log(`Adding ${team.leagueNickname} as league to team ${team.teamContestName.trim()} (${teams[key].name.trim()})`);
      teams[key].league = team.leagueNickname;
    }
  }
}

// Extract all members from rosters_24_25.json and rosters_Q_26_27.json
const membersMap = new Map();

function addRosterToMembers(filePath, _seasonSuffix) {
  if (!fs.existsSync(filePath))
    return;
  const rosterData = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // Roster file contains records for multiple teams in the league
  // We only pull players for our club's teams
  const clubTeamKeys = Object.keys(rosterData).filter(key => key.startsWith("HSG SGS Erl/HC Niederl"));

  clubTeamKeys.forEach((teamKey) => {
    const players = rosterData[teamKey];
    let teamId = "maenner-1";
    if (teamKey.endsWith("II"))
      teamId = "maenner-2";
    if (teamKey.endsWith("III"))
      teamId = "maenner-3";

    players.forEach((p) => {
      const firstname = p.firstname.trim();
      const lastname = p.lastname.trim();
      if (!firstname || !lastname)
        return;

      const memberKey = `${firstname} ${lastname}`.toLowerCase();

      if (membersMap.has(memberKey)) {
        const existing = membersMap.get(memberKey);
        if (!existing.teamIds.includes(teamId)) {
          existing.teamIds.push(teamId);
        }
      }
      else {
        const realName = `${firstname} ${lastname}`;
        const fakeName = getAnonymizedName(realName);
        const [fakeFirst, fakeLast] = fakeName.split(" ");
        const id = `member-${slugify(fakeFirst)}-${slugify(fakeLast)}`;
        // Give some skills for testing
        const skillIds = [];
        if (["patrick", "rolo", "lukas", "tobias", "che", "omar", "thomas", "basti"].includes(firstname.toLowerCase())) {
          skillIds.push("esb");
        }
        if (["manfred", "robin", "marcus", "paul"].includes(firstname.toLowerCase())) {
          skillIds.push("steward");
        }
        if (["arne", "julian", "felix"].includes(firstname.toLowerCase())) {
          skillIds.push("referee");
        }

        membersMap.set(memberKey, {
          id,
          name: fakeName,
          realName,
          teamIds: [teamId],
          skillIds,
          isManual: false,
          updatedAt: Date.now(),
        });
      }
    });
  });
}

addRosterToMembers(path.join(NULIGA_DATA_DIR, "rosters_24_25.json"), "24/25");
addRosterToMembers(path.join(NULIGA_DATA_DIR, "rosters_Q_26_27.json"), "25/26");

// Convert Map to array list for matching
const membersList = Array.from(membersMap.values());

// Fuzzy match name from helper plan to member list
function findMemberByName(helperName) {
  if (!helperName || typeof helperName !== "string")
    return null;
  const name = helperName.trim();
  const lowerName = name.toLowerCase();

  // Ignore known placeholder values or team designations
  if (["ja", "nein", "zuschauer", "eltern", "spielbericht", "verlegt", "geht nicht", "???", ""].includes(lowerName)) {
    return null;
  }

  if (["männer", "frauen", "mb", "md", "jugend", "minis", "eltern", "e-jugend", "ge-jgd", "wc-jgd", "wd-jgd", "md-jgd", "mb-jgd"].some(t => lowerName.includes(t))) {
    return null;
  }

  // Handle compound names or initials (e.g. "Lukas K.", "Tobias S.", "Kevin D.")
  const parts = name.split(/\s+/);
  const first = parts[0].toLowerCase();
  const lastPart = parts[1] ? parts[1].replace(/\./g, "").toLowerCase() : "";

  // Filter members by first name match against realName
  const matches = membersList.filter((m) => {
    // Member name typically "Firstname Lastname"
    const mParts = (m.realName || "").toLowerCase().split(" ");
    const mFirst = mParts[0];
    const mLast = mParts[1] || "";

    if (mFirst !== first)
      return false;
    if (lastPart) {
      return mLast.startsWith(lastPart);
    }
    return true;
  });

  if (matches.length > 0) {
    // If there's an exact or first match, return it
    return matches[0];
  }

  // Create a manual member if we can't find one, to avoid losing their name
  const fakeName = getAnonymizedName(name);
  const manualId = `member-manual-${slugify(fakeName)}`;
  const newMember = {
    id: manualId,
    name: fakeName,
    realName: name,
    teamIds: [],
    skillIds: [],
    isManual: true,
    updatedAt: Date.now(),
  };
  membersList.push(newMember);
  membersMap.set(name.toLowerCase(), newMember);
  return newMember;
}

// Match helper plan match to NuLiga meeting
function findNuLigaMeeting(helperMatch, dateStr, meetingList) {
  if (!meetingList)
    return null;
  const helperKickoff = helperMatch.kickoff; // e.g. "14:00"
  const mappedHome = mapHomeTeam(helperMatch.team);

  return meetingList.find((m) => {
    // Format NuLiga date e.g. "2024-09-22T14:00:00.000+0000"
    if (!m.scheduled.startsWith(dateStr))
      return false;

    // Check kickoff time (converting timezone if needed, but NuLiga times are local formatted or close to it)
    const scheduledTime = m.scheduled.substring(11, 16); // e.g. "14:00"
    if (scheduledTime !== helperKickoff)
      return false;

    // Check home team name matching
    return m.teamHome.teamName === mappedHome;
  });
}

function processSeason(seasonName, helperPlanFilename, matchesFilename, teamsFilename, outputFilename) {
  console.log(`Processing Season ${seasonName}...`);

  const helperPlanPath = path.join(NULIGA_DATA_DIR, helperPlanFilename);
  const matchesPath = path.join(NULIGA_DATA_DIR, matchesFilename);
  const teamsPath = path.join(NULIGA_DATA_DIR, teamsFilename);

  if (!fs.existsSync(helperPlanPath)) {
    console.error(`Helper plan file not found: ${helperPlanPath}`);
    return;
  }

  const helperPlan = JSON.parse(fs.readFileSync(helperPlanPath, "utf8"));
  let meetingList = [];
  if (fs.existsSync(matchesPath)) {
    meetingList = JSON.parse(fs.readFileSync(matchesPath, "utf8")).meetingList || [];
  }

  const matchesRecord = {};
  const gamedaysRecord = {};

  addLeagueToTeams(teamsPath, TEAMS);

  helperPlan.schedule.forEach((gamedayData) => {
    const isoDate = formatIsoDate(gamedayData.date);
    const locationId = resolveLocationId(gamedayData.notes);
    const gamedayId = `gameday-${isoDate}-${locationId}`;

    const matchIds = [];

    gamedayData.matches.forEach((helperMatch, matchIdx) => {
      const meeting = findNuLigaMeeting(helperMatch, isoDate, meetingList);

      let matchId = "";
      let homeTeam = helperMatch.team;
      let awayTeam = "Gast";
      const helperTeamId = getTeamId(helperMatch.team);

      if (meeting) {
        matchId = meeting.meetingUuid;
        homeTeam = meeting.teamHome.teamName;
        awayTeam = meeting.teamGuest.teamName;
      }
      else {
        matchId = `match-${isoDate}-${slugify(helperMatch.team)}-${matchIdx}`;
      }

      matchIds.push(matchId);

      // Construct slots
      const slots = [];
      const rolesToProcess = [
        { field: "timekeeper", roleId: "timekeeper" },
        { field: "secretary", roleId: "secretary" },
        { field: "steward_entrance", roleId: "steward_entrance" },
        { field: "steward_2", roleId: "steward_2" },
        { field: "wiper", roleId: "wiper_1" },
        { field: "wiper_1", roleId: "wiper_1" },
        { field: "wiper_2", roleId: "wiper_2" },
        { field: "referee_1", roleId: "referee_1" },
        { field: "referee_2", roleId: "referee_2" },
        { field: "video", roleId: "video" },
      ];

      rolesToProcess.forEach(({ field, roleId }, slotIndex) => {
        if (helperMatch[field] !== undefined && helperMatch[field] !== null) {
          const val = helperMatch[field].trim();
          if (val) {
            const slotId = `${matchId}-slot-${roleId}-${slotIndex}`;
            const slot = {
              id: slotId,
              roleId,
              assignedMemberId: null,
              assignmentStatus: "OPEN",
              customHelperName: null,
              checkedIn: false,
              updatedAt: Date.now(),
            };

            const matchedMember = findMemberByName(val);
            if (matchedMember) {
              slot.assignedMemberId = matchedMember.id;
            }
            else {
              slot.customHelperName = getAnonymizedName(val);
            }
            slots.push(slot);
          }
        }
      });

      // Add catering slot if specified
      if (helperMatch.catering && helperMatch.catering.toLowerCase() === "ja") {
        slots.push({
          id: `${matchId}-slot-catering`,
          roleId: "catering",
          assignedMemberId: null,
          assignmentStatus: "OPEN",
          customHelperName: "Verkauf",
          checkedIn: false,
          updatedAt: Date.now(),
        });
      }

      matchesRecord[matchId] = {
        id: matchId,
        time: helperMatch.kickoff || "00:00",
        homeTeam: getAnonymizedTeamName(homeTeam),
        awayTeam: getAnonymizedTeamName(awayTeam),
        helperTeamId,
        slots,
        updatedAt: Date.now(),
      };
    });

    gamedaysRecord[gamedayId] = {
      id: gamedayId,
      date: isoDate,
      locationId,
      matchIds,
      slots: [], // Gameday-wide slots
      openingTime: gamedayData.opening_time,
      closingTime: gamedayData.closing_time,
      notes: gamedayData.notes,
      updatedAt: Date.now(),
    };
  });

  // Final SeasonPlan
  const finalPlan = {
    id: crypto.randomUUID(),
    schemaVersion: 2,
    rev: 1,
    lastUpdated: Date.now(),
    club: clubInfo,
    season: seasonName,
    members: {}, // Will populate from the combined members List matching this season
    teams: TEAMS,
    skills: DEFAULT_SKILLS,
    gamedays: gamedaysRecord,
    matches: matchesRecord,
    config: {
      roles: DEFAULT_ROLES,
      locations: LOCATIONS,
    },
  };

  // Populate plan members that are associated with our club's teams or created manually
  membersList.forEach((m) => {
    const memberCopy = { ...m };
    delete memberCopy.realName;
    finalPlan.members[m.id] = memberCopy;
  });

  const outputPath = path.join(FIXTURES_DIR, outputFilename);
  fs.writeFileSync(outputPath, `${JSON.stringify(finalPlan, null, 2)}\n`, "utf8");
  console.log(`Saved plan to ${outputPath}`);
}

// Generate the two plans
processSeason("2024/2025", "2024_2025_HelperPlan.json", "matches_24_25.json", "teams_24_25.json", "plan-2024-2025.json");
processSeason("2025/2026", "2025_2026_HelperPlan.json", "matches_25_26.json", "teams_25_26.json", "plan-2025-2026.json");
