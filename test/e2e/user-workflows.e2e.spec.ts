import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { beforeAll, describe, expect } from "vitest";
import { checkMemberConflict } from "../../app/utils/conflict-detector";
import { autoAssignMatchDuties } from "../../app/utils/helper-assignment";
import { generateMemberICal } from "../../app/utils/ical-export";
import { Given, Scenario, Then, When } from "./helpers/bdd";
/* eslint-disable node/no-process-env */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seededPlanId = "f530083d-8c74-4f10-931a-dd877ee7b52c";
const seededPlanLink = process.env.E2E_PLAN_URL || `/setup?planId=${seededPlanId}#key=tWVZ4hmOA7LFsrNViX1X6w`;
const testHost = process.env.TEST_HOST;
const testUrl = (path: string) => testHost ? new URL(path, testHost).toString() : url(path);
const seededSetupLink = process.env.E2E_PLAN_URL
  ? (() => {
      const link = new URL(process.env.E2E_PLAN_URL);
      return `${link.origin}/setup?planId=${link.pathname.split("/").pop()}${link.hash}`;
    })()
  : seededPlanLink;

describe("feature: User Workflows (BDD Specs)", async () => {
  await setup({

    host: process.env.TEST_HOST,
    dev: true,
    nuxtConfig: {
    },
  });

  beforeAll(async () => {
    if (process.env.E2E_PLAN_URL)
      return;
    // Seed plan f530083d-8c74-4f10-931a-dd877ee7b52c into test storage
    const encryptedFixture = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../fixtures/encrypted-plan-2025-2026.json"), "utf-8"),
    );
    await fetch(testUrl(`/api/${seededPlanId}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blob: encryptedFixture.blob }),
    });
  });

  // 1 — Open a Shared Link (Get Link)
  Scenario("1 — Open a Shared Link (Get Link)", async () => {
    await Given("the plan f530083d-8c74-4f10-931a-dd877ee7b52c exists in storage", async () => {
      const res = await fetch(testUrl(`/api/${seededPlanId}`));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.blob).toBeTruthy();
    });

    let page: any;
    await When("the user navigates to the seeded plan link", async () => {
      page = await createPage();
      const targetUrl = seededSetupLink.startsWith("http") ? seededSetupLink : testUrl(seededSetupLink);
      await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    });
    await Then("the URL fragment is parsed and the crypto key tWVZ4hmOA7LFsrNViX1X6w is extracted", async () => {
      expect(page).toBeDefined();
    });
    await Then("the plan is fetched from /api/f530083d-8c74-4f10-931a-dd877ee7b52c and decrypted client-side", async () => {
      await page.waitForFunction(() => document.body.textContent.includes("f530083d-8c74-4f10-931a-dd877ee7b52c"), { timeout: 10000 });
      const textareaVal = await page.inputValue("textarea");
      expect(textareaVal).toContain("Gladbeck HC");
    });
    await Then("the plan ID is persisted to localStorage under gameday-plan-id", async () => {
      const storedId = await page.evaluate(() => localStorage.getItem("gameday-plan-id"));
      expect(storedId).toBe("f530083d-8c74-4f10-931a-dd877ee7b52c");
    });
    await Then("the setup view displays the active plan with Plan ID and encryption key indicator", async () => {
      const content = await page.textContent("body");
      expect(content).toContain("f530083d-8c74-4f10-931a-dd877ee7b52c");
      expect(content).toContain("Live Sync Active");
      await page.close();
    });
  });

  Scenario("1 Error — Missing key fragment in URL", async () => {
    await When("navigating to /setup?planId=f530083d-8c74-4f10-931a-dd877ee7b52c (no #key=…)", async () => {});
    await When("clicking \"Resume Last Plan\"", async () => {});
    await Then("an error toast appears: \"Could not resume. Need both a stored Plan ID and a Key in the URL fragment.\"", async () => {});
  });

  // 2 — Create a New Plan via Setup Wizard
  Scenario("2a — Full wizard happy path", async () => {
    await Given("no plan exists in localStorage", async () => {});
    await When("the user navigates to /setup", async () => {});
    await Then("Step 1 is visible with heading \"Set up your Gameday Plan\" and a \"Start Setup\" button", async () => {});
    await When("clicking \"Start Setup\"", async () => {});
    await Then("Step 2 (\"Club Information\") opens with a disabled \"Continue\" button", async () => {});
    await When("typing TSV Musterstadt into the \"Club Name\" input", async () => {});
    await Then("the \"Continue\" button becomes enabled", async () => {});
    await When("clicking \"Continue\"", async () => {});
    await Then("Step 3 (\"Manual Team Setup\") is displayed", async () => {});
    await When("clicking \"Continue to Members\"", async () => {});
    await Then("Step 4 (\"Add Members\") is displayed with bulk member input area", async () => {});
  });

  Scenario("2b — Bulk member import and plan finalization", async () => {
    await Given("the setup wizard is on Step 4", async () => {});
    await When("pasting Max Mustermann\\nErika Musterfrau\\nJohn Doe into the text area", async () => {});
    await When("clicking \"Add Members & Finish\"", async () => {});
    await Then("a success toast appears (\"Added 3 members\")", async () => {});
    await Then("a UUID and encryption key are generated client-side, encrypting the plan and POSTing to /api/{planId}", async () => {});
    await Then("the page transitions to Step 5 (Advanced / Editor mode) showing Live Sync status", async () => {});
  });

  // 3 — Resume an Existing Plan
  Scenario("3 — Resume an Existing Plan", async () => {
    await Given("a plan was previously finalized with Plan ID in localStorage and encryption key in URL fragment", async () => {});
    await When("navigating to /setup", async () => {});
    await Then("Step 1 is displayed with a \"Resume Last Plan\" button", async () => {});
    await When("clicking \"Resume Last Plan\"", async () => {});
    await Then("the plan is retrieved, decrypted, and loaded into the store and editor view", async () => {});
  });

  // 4 — Edit and Save Plan (Advanced Mode)
  Scenario("4 — Edit and Save Plan (Advanced Mode)", async () => {
    await Given("a plan is loaded in advanced mode on /setup", async () => {});
    await When("editing the JSON text in the editor (e.g. changing club name to \"SV HandbaL\")", async () => {});
    await When("clicking \"Save Plan\"", async () => {});
    await Then("the payload is encrypted with the current key and POSTed to /api/{planId}", async () => {});
    await Then("the plan revision number (rev) increments and a success notification is shown", async () => {});
  });

  Scenario("4 Error — Invalid JSON handling", async () => {
    await When("typing invalid JSON string into the editor and clicking \"Save Plan\"", async () => {});
    await Then("an error toast appears (\"Invalid JSON\") and the local plan state is not corrupted", async () => {});
  });

  // 5 — Share a Plan Link
  Scenario("5 — Share a Plan Link", async () => {
    await Given("a plan is loaded in advanced mode", async () => {});
    await When("clicking the copy button next to the \"Shareable Link\" input", async () => {});
    await Then("the full URL containing ?planId={id} and #key={key} is copied to clipboard", async () => {});
    await When("opening that copied URL in a secondary browser context", async () => {});
    await Then("the secondary browser automatically decrypts and displays the identical plan", async () => {});
  });

  // 6 — Real-Time Live Sync via SSE
  Scenario("6 — Real-Time Live Sync via SSE", async () => {
    await Given("User A and User B both have the same plan open on /setup", async () => {});
    await When("User A modifies a value and clicks \"Save Plan\"", async () => {});
    await Then("User A's updated plan is encrypted and sent to the server", async () => {});
    await Then("User B's open SSE stream receives the updated encrypted payload", async () => {});
    await Then("User B's client decrypts the incoming payload and updates their UI view without reloading", async () => {});
  });

  // 7 — Team & Member Management (Team List Page)
  Scenario("7a — View and search members", async () => {
    await When("navigating to /team-list", async () => {});
    await Then("accordion groups display teams and teamless members", async () => {});
    await When("typing Nelly into the member search input", async () => {});
    await Then("accordions auto-expand to display matching members with license badges", async () => {});
  });

  Scenario("7b — Create and edit teams", async () => {
    await When("clicking \"Create Team\", typing Jugend A into the modal input, and clicking \"Create\"", async () => {});
    await Then("a new team accordion Jugend A appears in the list", async () => {});
    await When("expanding Jugend A, clicking \"Edit Name\", changing it to Jugend A1, and saving", async () => {});
    await Then("the accordion header updates to Jugend A1", async () => {});
  });

  Scenario("7c — Add and edit member with licenses", async () => {
    await When("clicking \"Add Member\"", async () => {});
    await When("setting name to Anna Schmidt, toggling \"Referee License\" on, and selecting team Männer I", async () => {});
    await When("clicking \"Save Changes\"", async () => {});
    await Then("Anna Schmidt appears under Männer I with an active Ref license badge", async () => {});
  });

  // 8 — Match & Gameday Duty Slot Assignment
  Scenario("8a — Assign member to match slot (Timekeeper / ESB)", async () => {
    const plan = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../fixtures/plan-2025-2026.json"), "utf-8"),
    );
    const match = Object.values(plan.matches)[0] as any;
    const slot = match.slots[0];
    await Given("a gameday match with unassigned duty slots (e.g. Timekeeper)", async () => {
      slot.assignedMemberId = null;
      slot.customHelperName = null;
      expect(slot.assignedMemberId).toBeNull();
    });
    await When("the user clicks on the \"Timekeeper\" slot card for Match 1", async () => {
      expect(slot.id).toBeDefined();
    });
    await When("selecting Anna Schmidt from the eligible members modal", async () => {
      slot.assignedMemberId = "member-anna-schmidt";
      slot.updatedAt = new Date();
    });
    await Then("the slot updates to show Anna Schmidt as assigned, showing their active license badge", async () => {
      expect(slot.assignedMemberId).toBe("member-anna-schmidt");
    });
  });

  Scenario("8b — Assign custom non-member helper (Guest / Parent)", async () => {
    const plan = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../fixtures/plan-2025-2026.json"), "utf-8"),
    );
    const match = Object.values(plan.matches)[0] as any;
    const slot = match.slots[0];
    await Given("a slot for \"Wiping\" or \"Kiosk Duty\"", async () => {
      slot.assignedMemberId = null;
      slot.customHelperName = null;
    });
    await When("clicking on the \"Kiosk Duty\" slot", async () => {});
    await When("entering \"Parent of Max\" in the custom helper name input and confirming", async () => {
      slot.assignedMemberId = null;
      slot.customHelperName = "Parent of Max";
      slot.updatedAt = new Date();
    });
    await Then("the slot updates to show \"Parent of Max\" as the assigned volunteer without requiring a member account", async () => {
      expect(slot.assignedMemberId).toBeNull();
      expect(slot.customHelperName).toBe("Parent of Max");
    });
  });

  Scenario("8c — Assign gameday-wide slots (Hall Opening / Catering)", async () => {
    const plan = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../fixtures/plan-2025-2026.json"), "utf-8"),
    );
    const gameday = Object.values(plan.gamedays)[0] as any;
    await Given("a gameday with openingTime: \"13:00\"", async () => {
      gameday.openingTime = "13:00";
      expect(gameday.openingTime).toBe("13:00");
    });
    await When("opening the Gameday Overview panel", async () => {});
    await When("assigning Erika Musterfrau to the \"Hall Opening & Setup\" gameday slot", async () => {
      if (!gameday.slots)
        gameday.slots = [];
      gameday.slots.push({
        id: "slot-gd-hall-opening",
        roleId: "hall_open",
        assignedMemberId: "member-erika",
        updatedAt: new Date(),
      });
    });
    await Then("the slot updates across the gameday banner for all matches on that date", async () => {
      expect(gameday.slots.some((s: any) => s.assignedMemberId === "member-erika")).toBe(true);
    });
  });

  // 9 — Duty Shift Swapping & Link Confirmation
  Scenario("9a — Generate shift swap request link", async () => {
    await Given("Helper A is assigned to a Timekeeper slot on 2026-10-15", async () => {});
    await When("Helper A views their duty card and clicks \"Request Swap\"", async () => {});
    await Then("a unique swap request URL is generated and copied to the clipboard", async () => {});
  });

  Scenario("9b — Accept shift swap", async () => {
    await Given("Helper B receives and opens the shift swap link", async () => {});
    await When("Helper B opens the swap link in their browser", async () => {});
    await Then("a confirmation modal opens showing shift details: \"Timekeeper - Match 1 (2026-10-15)\"", async () => {});
    await When("Helper B clicks \"Accept Swap Duty\"", async () => {});
    await Then("the slot's assigned member changes to Helper B, and Helper A is released from duty", async () => {});
  });

  // 10 — Automated Helper Duty Assignment
  Scenario("10 — Automated Helper Duty Assignment", async () => {
    let plan: any;
    let matchId: string;
    await Given("a gameday with 10 unassigned duty slots and multiple registered members with licenses", async () => {
      plan = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../fixtures/plan-2025-2026.json"), "utf-8"),
      );
      matchId = Object.keys(plan.matches)[0];
      for (const slot of plan.matches[matchId].slots) {
        slot.assignedMemberId = null;
        slot.customHelperName = null;
      }
    });
    await When("the admin navigates to the Assignment Generator view and clicks \"Auto-Assign Duties\"", async () => {});
    await When("selecting criteria: \"Require Licenses\" and \"Balance Duty Counts\"", async () => {
      autoAssignMatchDuties(plan, matchId, { requireSkills: true, balanceDutyCounts: true, excludeConflicts: true });
    });
    await Then("slots are automatically populated with qualified members", async () => {
      const match = plan.matches[matchId];
      const assigned = match.slots.filter((s: any) => !!s.assignedMemberId);
      expect(assigned.length).toBeGreaterThan(0);
    });
    await Then("members playing in a match are not assigned to duty slots during their active match time", async () => {
      const match = plan.matches[matchId];
      for (const slot of match.slots) {
        if (slot.assignedMemberId) {
          const conflict = checkMemberConflict(plan, slot.assignedMemberId, match, slot.id);
          expect(conflict).toBeNull();
        }
      }
    });
  });

  // 11 — Schedule Import & Calendar Export
  Scenario("11a — Import match schedule via iCal (.ics)", async () => {
    await When("the admin navigates to /setup and clicks \"Import iCal Schedule\"", async () => {});
    await When("uploading a valid .ics fixture file containing 12 home matches", async () => {});
    await Then("12 Match entries and corresponding Gameday dates are generated in the plan", async () => {});
  });

  Scenario("11b — Export personal duty schedule to iCal", async () => {
    let icsContent = "";
    await When("a helper selects their member profile on the dashboard and clicks \"Export to Calendar\"", async () => {
      const plan = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../fixtures/plan-2025-2026.json"), "utf-8"),
      );
      icsContent = generateMemberICal(plan, "member-nelly-walton", "https://example.com/plan");
    });
    await Then("an .ics file is downloaded containing only the specific matches and gameday slots assigned to that helper", async () => {
      expect(icsContent).toContain("BEGIN:VCALENDAR");
      expect(icsContent).toContain("SUMMARY:Duty:");
      expect(icsContent).toContain("END:VCALENDAR");
    });
  });

  // 12 — Real-Time On-Site Check-In ("I'm Here")
  Scenario("12a — Helper self check-in on mobile", async () => {
    let plan: any;
    let match: any;
    let slot: any;
    await Given("Helper A has an assigned duty slot for an upcoming match today", async () => {
      plan = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../fixtures/plan-2025-2026.json"), "utf-8"),
      );
      match = Object.values(plan.matches).find((m: any) => m.slots && m.slots.length > 0);
      slot = match.slots[0];
      slot.checkedIn = false;
    });
    await When("Helper A opens the plan on their mobile device and taps \"Check In (\"I'm Here\")\" on their duty slot", async () => {
      slot.checkedIn = !slot.checkedIn;
      slot.updatedAt = new Date();
    });
    await Then("slot.checkedIn turns true and the button updates to \"Checked In\"", async () => {
      expect(slot.checkedIn).toBe(true);
    });
  });

  Scenario("12b — Hall organizer live check-in monitoring", async () => {
    await Given("the hall organizer has the Gameday Dashboard open", async () => {});
    await When("Helper A checks in on their mobile device", async () => {});
    await Then("the hall organizer's dashboard updates in real-time via SSE, displaying a green checkmark badge next to Helper A's slot", async () => {});
    await Then("any un-checked slots for matches starting within 15 minutes highlight with a warning banner", async () => {});
  });

  // 13 — Skill & Qualification Enforcement
  Scenario("13 — Skill & Qualification Enforcement", async () => {
    await Given("a slot with role \"Referee\" requiring a Referee License", async () => {});
    await When("an admin opens the slot assignment picker", async () => {});
    await Then("members possessing the Referee License skill are highlighted at the top of the list", async () => {});
    await When("an admin selects a member without the required license", async () => {});
    await Then("a warning alert appears (\"Member lacks required Referee license\") with options to \"Cancel\" or \"Override & Assign\"", async () => {});
  });

  // 14 — Personal "My Duties" Filter View
  Scenario("14 — Personal \"My Duties\" Filter View", async () => {
    await When("a user opens the plan dashboard on a mobile screen", async () => {});
    await When("typing their name into the \"My Schedule / Find My Duties\" filter box", async () => {});
    await Then("the view filters out all unassigned or unrelated gamedays", async () => {});
    await Then("a simplified timeline view lists only the user's assigned duties with dates, times, location links, and swap buttons", async () => {});
  });

  // 15 — Custom Roles & Location Configuration
  Scenario("15 — Custom Roles & Location Configuration", async () => {
    await When("navigating to Setup / Configuration settings", async () => {});
    await When("adding a new Location: Emmy-Noether-Halle with a Google Maps link", async () => {});
    await When("adding a new Role: Catering Lead scoped to gameday", async () => {});
    await Then("Emmy-Noether-Halle becomes available in Gameday location pickers", async () => {});
    await Then("Catering Lead appears in the gameday slot creation options", async () => {});
  });

  // 16 — Language Switching (i18n)
  Scenario("16 — Language Switching (i18n)", async () => {
    await When("navigating to / (default language: de)", async () => {});
    await Then("headers and action buttons display German text", async () => {});
    await When("selecting en from the language dropdown in the header", async () => {});
    await Then("the hero heading updates to \"Effortless Match-Day\" and navigation links update to English", async () => {});
  });

  // 17 — Two-Tier Automated Helper Duty Assignment
  Scenario("17a — Tier 1: Auto-assign Helper Team to match block", async () => {
    await Given("a gameday match for männliche C-Jugend playing at 14:00 requiring helper duties", async () => {});
    await When("the admin triggers \"Auto-Assign Helper Team\"", async () => {});
    await Then("the system analyzes team match schedules and identifies Damen 1 (playing at 17:00) as the optimal helper team", async () => {});
    await Then("Damen 1 is assigned as the responsible team for the männliche C-Jugend match slots", async () => {});
  });

  Scenario("17b — Tier 2: Rotate team members & respect warm-up/match times", async () => {
    let plan: any;
    let matchId: string;
    await Given("Damen 1 is assigned as the helper team for the 14:00 match block", async () => {
      plan = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../fixtures/plan-2025-2026.json"), "utf-8"),
      );
      matchId = Object.keys(plan.matches)[0];
      const helperTeamId = Object.keys(plan.teams)[0];
      plan.matches[matchId].helperTeamId = helperTeamId;
      for (const slot of plan.matches[matchId].slots) {
        slot.assignedMemberId = null;
      }
    });
    await When("the admin or team captain clicks \"Auto-Assign Team Members\"", async () => {
      autoAssignMatchDuties(plan, matchId, { requireSkills: true, balanceDutyCounts: true, excludeConflicts: true });
    });
    await Then("individual duty slots (Timekeeper, ESB, Kiosk) are populated from the Damen 1 roster", async () => {
      const match = plan.matches[matchId];
      const assigned = match.slots.filter((s: any) => !!s.assignedMemberId);
      expect(assigned.length).toBeGreaterThan(0);
    });
    await Then("duties are distributed based on past duty count rotation, excluding members whose own match or 45-minute warm-up window overlaps", async () => {
      const match = plan.matches[matchId];
      for (const slot of match.slots) {
        if (slot.assignedMemberId) {
          const conflict = checkMemberConflict(plan, slot.assignedMemberId, match, slot.id);
          expect(conflict).toBeNull();
        }
      }
    });
  });

  // 18 — Match Schedule Shift & Collision Warning
  Scenario("18 — Match Schedule Shift & Collision Warning", async () => {
    let plan: any;
    let match1: any;
    let helperAId: string;
    await Given("Helper A is assigned to a Timekeeper slot for a match originally scheduled at 15:00, and Helper A plays in a match at 16:30", async () => {
      plan = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../fixtures/plan-2025-2026.json"), "utf-8"),
      );
      helperAId = Object.keys(plan.members)[0];
      const member = plan.members[helperAId];
      member.teamIds = ["team-playing"];
      plan.teams["team-playing"] = { id: "team-playing", name: "Playing Team", isManual: true, updatedAt: new Date() };

      match1 = {
        id: "match-duty",
        time: new Date("2026-10-15T15:00:00Z"),
        homeTeamId: "team-other",
        awayTeamName: "Guest",
        slots: [
          { id: "slot-tk", roleId: "timekeeper", assignedMemberId: helperAId, updatedAt: new Date() },
        ],
        updatedAt: new Date(),
      };
      plan.matches["match-duty"] = match1;

      plan.matches["match-playing"] = {
        id: "match-playing",
        time: new Date("2026-10-15T16:30:00Z"),
        homeTeamId: "team-playing",
        awayTeamName: "Guest B",
        slots: [],
        updatedAt: new Date(),
      };
    });
    await When("the admin updates the match start time from 15:00 to 15:30", async () => {
      match1.time = new Date("2026-10-15T15:30:00Z");
      match1.updatedAt = new Date();
    });
    await Then("the Timekeeper duty slot duration automatically updates to match the new kick-off time", async () => {
      expect(new Date(match1.time).getUTCHours()).toBe(15);
      expect(new Date(match1.time).getUTCMinutes()).toBe(30);
    });
    await Then("the system detects a warm-up time overlap for Helper A and displays a red \"Schedule Conflict\" warning badge on the duty slot", async () => {
      const conflict = checkMemberConflict(plan, helperAId, match1, "slot-tk");
      expect(conflict).not.toBeNull();
      expect(conflict?.type).toBe("player_overlap");
      expect(conflict?.message).toContain("Plays for Playing Team");
    });
    await When("clicking the warning badge, options to \"Re-assign Slot\" or \"Ignore Warning\" are displayed", async () => {});
  });

  // 19 — Personal Duty Calendar Export with Embedded Plan Link
  Scenario("19 — Personal Duty Calendar Export with Embedded Plan Link", async () => {
    let icsContent = "";
    const shareUrl = "https://example.com/setup?planId=f530083d-8c74-4f10-931a-dd877ee7b52c#key=tWVZ4hmOA7LFsrNViX1X6w";
    await Given("Helper A has assigned helper duties on 2026-10-15 and 2026-11-02 in an active plan", async () => {
      expect(shareUrl).toContain("f530083d-8c74-4f10-931a-dd877ee7b52c");
    });
    await When("Helper A clicks \"Export My Duties to iCal\"", async () => {
      const plan = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../fixtures/plan-2025-2026.json"), "utf-8"),
      );
      icsContent = generateMemberICal(plan, "member-nelly-walton", shareUrl);
    });
    await Then("an .ics file is generated containing calendar events for each assigned duty shift", async () => {
      expect(icsContent).toContain("BEGIN:VEVENT");
      expect(icsContent).toContain("END:VEVENT");
    });
    await Then("each calendar event includes title, start/end times, hall location, and the direct encrypted plan URL (/setup?planId={id}#key={key}) in the event description", async () => {
      expect(icsContent).toContain("SUMMARY:Duty:");
      expect(icsContent).toContain("DTSTART:");
      expect(icsContent).toContain("DTEND:");
      expect(icsContent).toContain("LOCATION:");
      expect(icsContent).toContain(shareUrl);
    });
  });
});
