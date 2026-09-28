# Plan: Flesh Out User Paths & nuLiga Integration

This plan outlines the implementation of the core user paths for Gameday Helperplan, transitioning from a PoC to a functional application.

## Objective

Implement a guided setup wizard, a real-time assignment system based on the "One Team per Match" model, and a data-driven dashboard.

## Key Files & Context

- `app/stores/plan.ts`: Central state management for the plan.
- `app/utils/plan-types.d.ts`: Data schema for the season plan.
- `app/pages/setup.vue`: The multi-step onboarding wizard.
- `app/pages/assignments.vue`: The view for managing helper duties.
- `app/pages/dashboard.vue`: The public-facing match list.
- `app/utils/nuliga-api.ts`: nuLiga integration client.

## Proposed Solution

### 1. Schema & Store Updates

- Update `SeasonPlan` and `Match` types to explicitly support `helperTeamId`.
- Add `isManual` flag to `Member` and `Team` for hybrid roster management.
- Extend `usePlanStore` with methods for:
  - nuLiga import (Clubs, Teams, Matches).
  - Assignment logic (Randomize, Clear, Manual Override).
  - Wizard navigation state.

### 2. Multi-Step Setup Wizard (`/setup`)

Replace the JSON editor with a UI-driven flow:

- **Step 1: Club & Season**
  - Fields: Club Name, Contact Email, Season Selection.
- **Step 2: Roles & Skills**
  - UI to manage the `config.roles` array.
  - Default roles (Timekeeper, Secretary, etc.) pre-populated.
- **Step 3: Teams & Roster (Hybrid)**
  - Option A: Search and import from nuLiga.
  - Option B: Manual creation.
  - Support for adding "Parents & Friends" or guest members.
- **Step 4: Matches & Gamedays**
  - Import matches from nuLiga for the selected club.
  - Group matches into gamedays (based on date/location).

### 3. Assignment System (`/assignments`)

- **Match List:** Show all matches with their assignment status (staffed/unstaffed).
- **Match Detail View:**
  - Dropdown to select the `helperTeam`.
  - Grid of slots based on the match's roles.
  - "Randomize" button that pulls from the assigned team's roster.
  - "Add Individual" button to override/supplement with any club member.

### 4. Public Dashboard (`/dashboard`)

- Replace mock data in `dashboard.vue` with real data from `usePlanStore`.
- Implement filtering by "My Team".
- Use `gameday-event-card.vue` to display matches.

### 5. Maintenance & Advanced Mode

- Move the raw JSON editor to `/setup/advanced`.
- Implement a "Sync from nuLiga" button to refresh match dates/times without losing assignments.

## Implementation Steps

### Phase 1: Store & Schema Refinement

1. [ ] Update `app/utils/plan-types.d.ts` with `helperTeamId` and `isManual` flags.
2. [ ] Add `importTeams` and `importMatches` helpers to `app/stores/plan.ts`.
3. [ ] Create a migration in `migrateIfNeeded` to handle existing plans.

### Phase 2: Setup Wizard Implementation

1. [ ] Create Step 1-4 components/views within `setup.vue`.
2. [ ] Integrate `nuligaApi` into Step 3 and 4 for search and import.
3. [ ] Implement "Bulk Add" for manual members.

### Phase 3: Assignment & Dashboard

1. [ ] Implement the Assignment Detail UI.
2. [ ] Add randomization logic based on roles and skills.
3. [ ] Connect `dashboard.vue` to the store and add filters.

## Verification & Testing

- **Manual Verification:**
  - Complete a full setup flow from "Create New" to "Save".
  - Import a club from nuLiga and verify teams/matches appear.
  - Assign a team to a match and randomize members.
  - Verify real-time sync across two browser windows.
- **Automated Testing:**
  - Update `test/nuxt/create-save-edit-save.spec.ts` to reflect the new wizard flow.
  - Add unit tests for the nuLiga import mapping logic.
