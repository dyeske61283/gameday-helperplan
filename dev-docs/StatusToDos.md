Here is a complete status scan of your codebase and a structured, bite-sized TODO roadmap organized into small, high-momentum wins following your requested 4-part framework.
  ──────
  ### Codebase Status Overview

   Area                                     | Status                          | Notes
  ------------------------------------------|---------------------------------|----------------------------------------------------------------------------------------------------------
   Landing & Nav                            | ✅ Working                      | Hero, bento grid, language switcher (index.vue, default.vue)
   Team & Member Management                 | ✅ Working                      | Accordions, member search, license toggles, team CRUD (team-list.vue)
   Setup Wizard & E2E Crypto                | 🟡 Functional with Minor Glitch | Setup wizard, bulk member paste, encryption/decryption (setup.vue, use-crypto.ts). Note:
                                            |                                 | server/api/[id].get.ts expects an iv in route params, failing API tests.
   Dashboard (Gameday Schedule & My Duties) | 🔴 Stub                         | Empty placeholder with hero text only (dashboard.vue)
   Assignments (Helper Duty Allocation)     | 🔴 Stub                         | Empty placeholder with hero text only (assignments.vue)
   Assignment Algorithms                    | 🔴 Stub                         | Empty files (helper-assignment.ts, helper-team-proposals.ts)
  ──────
  ## Step 1: Fix Schema & Interface Contracts (Quick Fix)

  Before building new UI slices, fix the broken API endpoint contract so your tests pass and data flow is reliable.

  [ ] Task 1.1: Clean Route Param Validation in Server GET
      • File: server/api/[id].get.ts file:///Users/kevindyes/Projects/mima/server/api/[id].get.ts#L6-L9
      • Goal: Remove iv: z.string() from getValidatedRouterParams since the route parameter is only id.
      • Win: Run pnpm test:api — GET /api/[id] should return 200 (or 404 for missing IDs) without validation 400 errors.
  [ ] Task 1.2: Verify Fixtures & Store Types
      • File: plan-types.ts
      • Goal: Verify that MatchSchema includes slots: z.array(SlotSchema) and helperTeamId: z.string().optional().
      • Win: Run pnpm vitest run test/api/plans.spec.ts and ensure both 24/25 and 25/26 fixtures validate cleanly against SeasonPlanSchema.

  ──────
  ## Step 2: Define V0 (Walking Skeleton)

  Connect the basic UI layout to example store data so all pages show actual content.

  [ ] Task 2.1: Store Fallback Hook in Dashboard & Assignments
      • Files: dashboard.vue, assignments.vue
      • Goal: Add onMounted(() => planStore.ensurePlanLoaded()) in <script setup> on both pages.
      • Win: Opening /dashboard or /assignments loads the fixture plan into Pinia state automatically if no plan is currently active.
  [ ] Task 2.2: Dashboard Skeleton Layout
      • File: dashboard.vue
      • Goal: Render a simple chronological list of gamedays using planStore.gamedays with date, location name, and match count.
      • Win: Navigating to /dashboard renders the list of season gameday dates.
  [ ] Task 2.3: Assignments Skeleton Layout
      • File: assignments.vue
      • Goal: Render match cards grouped by gameday showing Home Team vs. Away Team, Kick-off Time, and assigned helperTeamId (or "Unassigned").
      • Win: Navigating to /assignments displays all upcoming match fixtures.

  ──────
  ## Step 3: Incremental Feature Slices
  Build each feature progressively: Static UI & Mock -> Store-Wired State -> Error & Edge Handling.
  ──────
  ### Slice A: Match Duty Assignments Page (/assignments)
  #### A1. Static UI & Helper Team Selection

  [ ] Task A1.1: Match Card Slot Grid
      • File: assignments.vue
      • Goal: In each match card, render slot badges for the match's required roles (e.g. Timekeeper, Scorekeeper, Floor Manager).
      • Win: Each match card visually displays its required duty slots.
  [ ] Task A1.2: Helper Team Dropdown Selector
      • File: assignments.vue
      • Goal: Add a <USelect> for each match containing all club teams.
      • Win: Changing the dropdown calls planStore.assignHelperTeam(matchId, selectedTeamId) and updates the store immediately.


  #### A2. Slot Member Assignment Modal

  [ ] Task A2.1: Slot Click Interaction & Member Picker Modal
      • File: assignments.vue
      • Goal: Clicking an unassigned slot opens a <UModal> listing members of the assigned helper team (or all club members as fallback).
      • Win: Clicking any slot displays the member picker modal.
  [ ] Task A2.2: Assign Member to Slot & Custom Helper Input
      • File: plan.ts & assignments.vue
      • Goal: Add assignMemberToSlot(matchId, slotId, memberId, customName?) to usePlanStore. Hook it to the modal "Confirm" button.
      • Win: Selecting a member assigns them to the slot; the slot badge turns green with the member's name.


  #### A3. License Enforcement & Auto-Save

  [ ] Task A3.1: License Highlighting in Modal
      • File: assignments.vue
      • Goal: For slots requiring a skill (e.g. Referee or Timekeeper/ESB), badge members who hold the required skill at the top of the picker list.
      • Win: Licensed members are highlighted and badged.
  [ ] Task A3.2: Floating "Save Changes" Bar
      • File: assignments.vue
      • Goal: Add a floating footer button to call planStore.savePlan() with toast feedback.
      • Win: Saving changes persists the updated plan to /api/{id}.

  ──────
  ### Slice B: Public Dashboard & Personal Schedule (/dashboard)

  #### B1. Gameday Schedule View

  [ ] Task B1.1: Gameday Event Card Component
      • File: app/components/gameday-card.vue
      • Goal: Create a component rendering one Gameday block: Hall Location link, Opening Time, Match Timeline, and Duty Staffing summary badge.
      • Win: /dashboard renders clean, accessible cards for all gamedays.
  [ ] Task B1.2: Match Row Duty Badges
      • File: app/components/gameday-card.vue
      • Goal: Inside each match row, display who is assigned to Timekeeper, Scorekeeper, etc.
      • Win: Helpers can see who is working which match at a glance.


  #### B2. "My Duties" Filter

  [ ] Task B2.1: Member Filter Search Bar
      • File: dashboard.vue
      • Goal: Add a top search input ("Filter by your name or team...").
      • Win: Typing a name filters the list to only show gamedays/matches where that person or team has duties.
  [ ] Task B2.2: Mobile "Check In" / "I'm Here" Toggle
      • File: plan.ts & dashboard.vue
      • Goal: Add toggleCheckIn(matchId, slotId) to the store. Add a button on assigned slots allowing volunteers to mark themselves as arrived.
      • Win: Tapping "I'm Here" sets slot.checkedIn = true and updates the badge to green with a checkmark.

  ──────
  ### Slice C: Calendar Export (iCal)

  [ ] Task C1: Generate Personal .ics File
      • File: app/utils/ical-export.ts
      • Goal: Write a pure helper function generateMemberIcal(plan, memberId) returning an .ics string with event start/end, location, and duty title.
      • Win: Unit test in app/utils/ical-export.test.ts verifying that event blocks match the member's assigned matches.
  [ ] Task C2: "Export My Calendar" Button in Dashboard
      • File: dashboard.vue
      • Goal: When a member is filtered in the dashboard, show an "Export My Duties (.ics)" download button.
      • Win: Clicking the button triggers a browser download of the .ics calendar file.

  ──────
  ## Step 4: Hard Scope Boundary (Cut for V1)

  Keep the following features out of scope for your initial release so you can launch cleanly:

   Cut from V1                                                            | Rationale
  ------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------
   ❌ Direct nuLiga Web Scraping API                                      | Complex external dependencies and session cookies. Fixture and manual entry are sufficient.
   ❌ Automated Genetic Multi-tier Solver                                 | Manual "One Team per Match" + simple member picker achieves 90% of the value with 10% of the code.
   ❌ Shift Swap Link Negotiation Tokens                                  | Direct assignment and mobile check-in solve the immediate gameday coordination problem.
   ❌ Custom Venue / Role Configuration Wizard                            | Hardcoded standard config in store (timekeeper, scorekeeper, floor_manager) covers standard club operations.
  ──────
  ### Suggested First Tiny Task to Start With

  Start with Task 1.1 (server/api/[id].get.ts file:///Users/kevindyes/Projects/mima/server/api/[id].get.ts#L6-L9) and Task 2.1 to get a working green test suite and the walking skeleton
  live on /dashboard.
