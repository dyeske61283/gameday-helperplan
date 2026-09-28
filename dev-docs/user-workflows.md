# User Workflows

> Each workflow below represents a high-level user interaction scenario designed for
> BDD-style E2E testing (Vitest + Playwright via `@nuxt/test-utils`).
> Steps follow the **Given / When / Then** structure focusing on clear user interactions.

---

## 1 — Open a Shared Link (Get Link)

> _A helper receives a link from the club admin and opens it to view the plan._

**Given** the plan `f530083d-8c74-4f10-931a-dd877ee7b52c` exists in storage

1. **When** the user navigates to `/setup?planId=f530083d-8c74-4f10-931a-dd877ee7b52c#key=tWVZ4hmOA7LFsrNViX1X6w`
2. **Then** the URL fragment is parsed and the crypto key `tWVZ4hmOA7LFsrNViX1X6w` is extracted
3. **Then** the plan is fetched from `/api/f530083d-8c74-4f10-931a-dd877ee7b52c` and decrypted client-side
4. **Then** the plan ID is persisted to `localStorage` under `gameday-plan-id`
5. **Then** the setup view displays the active plan with Plan ID and encryption key indicator

### Error: Missing key fragment in URL

1. **When** navigating to `/setup?planId=f530083d-8c74-4f10-931a-dd877ee7b52c` (no `#key=…`)
2. **When** clicking "Resume Last Plan"
3. **Then** an error toast appears: "Could not resume. Need both a stored Plan ID and a Key in the URL fragment."

---

## 2 — Create a New Plan via Setup Wizard

> _A club admin opens the app for the first time and walks through the setup wizard._

### 2a — Full wizard happy path

**Given** no plan exists in localStorage

1. **When** the user navigates to `/setup`
2. **Then** Step 1 is visible with heading "Set up your Gameday Plan" and a "Start Setup" button
3. **When** clicking "Start Setup"
4. **Then** Step 2 ("Club Information") opens with a disabled "Continue" button
5. **When** typing `TSV Musterstadt` into the "Club Name" input
6. **Then** the "Continue" button becomes enabled
7. **When** clicking "Continue"
8. **Then** Step 3 ("Manual Team Setup") is displayed
9. **When** clicking "Continue to Members"
10. **Then** Step 4 ("Add Members") is displayed with bulk member input area

### 2b — Bulk member import and plan finalization

**Given** the setup wizard is on Step 4

1. **When** pasting `Max Mustermann\nErika Musterfrau\nJohn Doe` into the text area
2. **When** clicking "Add Members & Finish"
3. **Then** a success toast appears ("Added 3 members")
4. **Then** a UUID and encryption key are generated client-side, encrypting the plan and POSTing to `/api/{planId}`
5. **Then** the page transitions to Step 5 (Advanced / Editor mode) showing Live Sync status

---

## 3 — Resume an Existing Plan

> _A returning admin opens the app and resumes their last plan._

**Given** a plan was previously finalized with Plan ID in `localStorage` and encryption key in URL fragment

1. **When** navigating to `/setup`
2. **Then** Step 1 is displayed with a "Resume Last Plan" button
3. **When** clicking "Resume Last Plan"
4. **Then** the plan is retrieved, decrypted, and loaded into the store and editor view

---

## 4 — Edit and Save Plan (Advanced Mode)

> _An admin modifies the plan JSON structure and saves changes back to the server._

**Given** a plan is loaded in advanced mode on `/setup`

1. **When** editing the JSON text in the editor (e.g. changing club name to `"SV HandbaL"`)
2. **When** clicking "Save Plan"
3. **Then** the payload is encrypted with the current key and POSTed to `/api/{planId}`
4. **Then** the plan revision number (`rev`) increments and a success notification is shown

### Invalid JSON handling

1. **When** typing invalid JSON string into the editor and clicking "Save Plan"
2. **Then** an error toast appears ("Invalid JSON") and the local plan state is not corrupted

---

## 5 — Share a Plan Link

> _An admin copies the shareable link to send to helpers._

**Given** a plan is loaded in advanced mode

1. **When** clicking the copy button next to the "Shareable Link" input
2. **Then** the full URL containing `?planId={id}` and `#key={key}` is copied to clipboard
3. **When** opening that copied URL in a secondary browser context
4. **Then** the secondary browser automatically decrypts and displays the identical plan

---

## 6 — Real-Time Live Sync via SSE

> _Two users view the same plan simultaneously; updates from one user push to the other in real-time._

**Given** User A and User B both have the same plan open on `/setup`

1. **When** User A modifies a value and clicks "Save Plan"
2. **Then** User A's updated plan is encrypted and sent to the server
3. **Then** User B's open SSE stream receives the updated encrypted payload
4. **Then** User B's client decrypts the incoming payload and updates their UI view without reloading

---

## 7 — Team & Member Management (Team List Page)

> _An admin manages teams and member licenses on the `/team-list` page._

### 7a — View and search members

1. **When** navigating to `/team-list`
2. **Then** accordion groups display teams and teamless members
3. **When** typing `Nelly` into the member search input
4. **Then** accordions auto-expand to display matching members with license badges

### 7b — Create and edit teams

1. **When** clicking "Create Team", typing `Jugend A` into the modal input, and clicking "Create"
2. **Then** a new team accordion `Jugend A` appears in the list
3. **When** expanding `Jugend A`, clicking "Edit Name", changing it to `Jugend A1`, and saving
4. **Then** the accordion header updates to `Jugend A1`

### 7c — Add and edit member with licenses

1. **When** clicking "Add Member"
2. **When** setting name to `Anna Schmidt`, toggling "Referee License" on, and selecting team `Männer I`
3. **When** clicking "Save Changes"
4. **Then** `Anna Schmidt` appears under `Männer I` with an active `Ref` license badge

---

## 8 — Match & Gameday Duty Slot Assignment

> _An admin assigns helpers and volunteers to match-level or gameday-level duty slots._

### 8a — Assign member to match slot (Timekeeper / ESB)

**Given** a gameday match with unassigned duty slots (e.g. Timekeeper)

1. **When** the user clicks on the "Timekeeper" slot card for Match 1
2. **When** selecting `Anna Schmidt` from the eligible members modal
3. **Then** the slot updates to show `Anna Schmidt` as assigned, showing their active license badge

### 8b — Assign custom non-member helper (Guest / Parent)

**Given** a slot for "Wiping" or "Kiosk Duty"

1. **When** clicking on the "Kiosk Duty" slot
2. **When** entering `"Parent of Max"` in the custom helper name input and confirming
3. **Then** the slot updates to show `"Parent of Max"` as the assigned volunteer without requiring a member account

### 8c — Assign gameday-wide slots (Hall Opening / Catering)

**Given** a gameday with `openingTime: "13:00"`

1. **When** opening the Gameday Overview panel
2. **When** assigning `Erika Musterfrau` to the "Hall Opening & Setup" gameday slot
3. **Then** the slot updates across the gameday banner for all matches on that date

---

## 9 — Duty Shift Swapping & Link Confirmation

> _A helper requests a duty swap and another volunteer accepts via a swap link._

### 9a — Generate shift swap request link

**Given** Helper A is assigned to a Timekeeper slot on 2026-10-15

1. **When** Helper A views their duty card and clicks "Request Swap"
2. **Then** a unique swap request URL is generated and copied to the clipboard

### 9b — Accept shift swap

**Given** Helper B receives and opens the shift swap link

1. **When** Helper B opens the swap link in their browser
2. **Then** a confirmation modal opens showing shift details: "Timekeeper - Match 1 (2026-10-15)"
3. **When** Helper B clicks "Accept Swap Duty"
4. **Then** the slot's assigned member changes to Helper B, and Helper A is released from duty

---

## 10 — Automated Helper Duty Assignment

> _An admin uses auto-assignment to distribute unassigned helper slots fairly across teams and members._

**Given** a gameday with 10 unassigned duty slots and multiple registered members with licenses

1. **When** the admin navigates to the Assignment Generator view and clicks "Auto-Assign Duties"
2. **When** selecting criteria: "Require Licenses" and "Balance Duty Counts"
3. **Then** slots are automatically populated with qualified members
4. **Then** members playing in a match are not assigned to duty slots during their active match time

---

## 11 — Schedule Import & Calendar Export

> _An admin imports an iCal fixture schedule and helpers export their personal duty calendars._

### 11a — Import match schedule via iCal (.ics)

1. **When** the admin navigates to `/setup` and clicks "Import iCal Schedule"
2. **When** uploading a valid `.ics` fixture file containing 12 home matches
3. **Then** 12 `Match` entries and corresponding `Gameday` dates are generated in the plan

### 11b — Export personal duty schedule to iCal

1. **When** a helper selects their member profile on the dashboard and clicks "Export to Calendar"
2. **Then** an `.ics` file is downloaded containing only the specific matches and gameday slots assigned to that helper

---

## 12 — Real-Time On-Site Check-In ("I'm Here")

> _Helpers check in on gameday, providing real-time arrival status to the hall manager._

### 12a — Helper self check-in on mobile

**Given** Helper A has an assigned duty slot for an upcoming match today

1. **When** Helper A opens the plan on their mobile device and taps "Check In ("I'm Here")" on their duty slot
2. **Then** `slot.checkedIn` turns `true` and the button updates to "Checked In"

### 12b — Hall organizer live check-in monitoring

**Given** the hall organizer has the Gameday Dashboard open

1. **When** Helper A checks in on their mobile device
2. **Then** the hall organizer's dashboard updates in real-time via SSE, displaying a green checkmark badge next to Helper A's slot
3. **Then** any un-checked slots for matches starting within 15 minutes highlight with a warning banner

---

## 13 — Skill & Qualification Enforcement

> _The system prevents or warns when assigning unqualified members to licensed slots._

**Given** a slot with role "Referee" requiring a `Referee License`

1. **When** an admin opens the slot assignment picker
2. **Then** members possessing the `Referee License` skill are highlighted at the top of the list
3. **When** an admin selects a member without the required license
4. **Then** a warning alert appears ("Member lacks required Referee license") with options to "Cancel" or "Override & Assign"

---

## 14 — Personal "My Duties" Filter View

> _A member filters the full season helper plan down to their own personal schedule._

1. **When** a user opens the plan dashboard on a mobile screen
2. **When** typing their name into the "My Schedule / Find My Duties" filter box
3. **Then** the view filters out all unassigned or unrelated gamedays
4. **Then** a simplified timeline view lists only the user's assigned duties with dates, times, location links, and swap buttons

---

## 15 — Custom Roles & Location Configuration

> _An admin configures custom duty roles and match venue locations._

1. **When** navigating to Setup / Configuration settings
2. **When** adding a new Location: `Emmy-Noether-Halle` with a Google Maps link
3. **When** adding a new Role: `Catering Lead` scoped to `gameday`
4. **Then** `Emmy-Noether-Halle` becomes available in Gameday location pickers
5. **Then** `Catering Lead` appears in the gameday slot creation options

---

## 16 — Language Switching (i18n)

> _A user switches the application language between German and English._

1. **When** navigating to `/` (default language: `de`)
2. **Then** headers and action buttons display German text
3. **When** selecting `en` from the language dropdown in the header
4. **Then** the hero heading updates to "Effortless Match-Day" and navigation links update to English

---

## 17 — Two-Tier Automated Helper Duty Assignment

> _An admin automatically assigns helper teams to gameday blocks based on play times, then rotates individual team members to specific duty slots._

### 17a — Tier 1: Auto-assign Helper Team to match block

**Given** a gameday match for `männliche C-Jugend` playing at 14:00 requiring helper duties

1. **When** the admin triggers "Auto-Assign Helper Team"
2. **Then** the system analyzes team match schedules and identifies `Damen 1` (playing at 17:00) as the optimal helper team
3. **Then** `Damen 1` is assigned as the responsible team for the `männliche C-Jugend` match slots

### 17b — Tier 2: Rotate team members & respect warm-up/match times

**Given** `Damen 1` is assigned as the helper team for the 14:00 match block

1. **When** the admin or team captain clicks "Auto-Assign Team Members"
2. **Then** individual duty slots (Timekeeper, ESB, Kiosk) are populated from the `Damen 1` roster
3. **Then** duties are distributed based on past duty count rotation, excluding members whose own match or 45-minute warm-up window overlaps

---

## 18 — Match Schedule Shift & Collision Warning

> _When match start times shift, associated duty slot times adjust automatically and collision warning badges highlight affected assigned helpers._

**Given** Helper A is assigned to a Timekeeper slot for a match originally scheduled at 15:00, and Helper A plays in a match at 16:30

1. **When** the admin updates the match start time from 15:00 to 15:30
2. **Then** the Timekeeper duty slot duration automatically updates to match the new kick-off time
3. **Then** the system detects a warm-up time overlap for Helper A and displays a red "Schedule Conflict" warning badge on the duty slot
4. **When** clicking the warning badge, options to "Re-assign Slot" or "Ignore Warning" are displayed

---

## 19 — Personal Duty Calendar Export with Embedded Plan Link

> _A helper exports assigned duties to their calendar, with direct bookmark links back to the encrypted plan._

**Given** Helper A has assigned helper duties on 2026-10-15 and 2026-11-02 in an active plan

1. **When** Helper A clicks "Export My Duties to iCal"
2. **Then** an `.ics` file is generated containing calendar events for each assigned duty shift
3. **Then** each calendar event includes title, start/end times, hall location, and the direct encrypted plan URL (`/setup?planId={id}#key={key}`) in the event description
