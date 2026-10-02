# User-Facing Route Inventory

This records the current route baseline and accepted migration for issue #33.
Authentication is not a route boundary: a usable shared plan link grants the
current prototype's read/write access, and selected-member state is only a
local convenience.

## Shared Loading Rules

The plan-scoped pages call `usePlanInit` on mount. It reads `#key=<key>` and
strips the fragment, then loads in this
order:

1. `planId` plus a fragment key from the URL.
2. A plan already held in the Pinia store for in-session navigation.
3. A matching locally stored plan ID and key.
4. No plan, leaving the page's empty state in place.

Successful loads start the plan's SSE watcher; unmounting stops it. A missing
or invalid key does not authenticate a user and results in an unavailable or
empty view depending on the route.

## Route Inventory

| Route                                                  | Entry and plan loading                                                                                               | Visible capabilities                                                                                                                                                                         | Links and fallback/error state                                                                                                                                                                 | Audience                                    | Disposition           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------- |
| `/`                                                    | Link-first entry. Does not load a plan. Shows `Resume plan` only when a locally stored ID and key exist.             | Resume the locally stored plan. With no resume state, explains that a shared link is required.                                                                                               | Resume links to `/plans/<planId>#key=<key>`. No-plan state is the normal fallback.                                                                                                             | Member entry                                | **retain separately** |
| `/plans/:planId`                                       | Canonical shared-link entry. `usePlanInit` loads the path ID with the fragment key, or resumes matching local state. | Shows club/season and fixture list with open-duty counts. Fixture cards open match pages.                                                                                                    | Loading state; API/decryption error with `Return to start` to `/`; no loaded plan shows `This plan is unavailable.`                                                                            | Member-facing schedule                      | **retain separately** |
| `/plans/:planId/matches/:matchId`                      | Same plan loading as the parent route; match is resolved only after the plan is loaded.                              | Shows one fixture's duties and eligibility-aware claim actions. Missing member selection opens a dialog, persists the choice, and resumes the claim.                                         | `All fixtures` and `Back to fixtures` link to the parent. Unknown match shows `Match not found`; personal duties link to the plan-scoped cockpit.                                              | Member-facing claim flow                    | **retain separately** |
| `/plans/:planId/assignments`                           | Plan-scoped assignment editor using the shared loading rules.                                                        | Search/filter matches, assign or clear members, set helper teams, auto-staff, inspect conflicts, and save. Missing key makes mutation feedback local/read-only rather than server-persisted. | `View Schedule` preserves the plan path and key; invalid plans do not load example data.                                                                                                       | Admin-facing UX boundary, not authorization | **retain separately** |
| `/plans/:planId/teams`                                 | Plan-scoped roster/team editor using the shared loading rules.                                                       | Search teamless/team members; add/edit/delete members and teams; save when a key exists.                                                                                                     | Plan context is part of the route; invalid plans do not load example data.                                                                                                                     | Admin-facing UX boundary, not authorization | **retain separately** |
| `/plans/:planId/cockpit`                               | Plan-scoped personal-duty page using the shared loading rules.                                                       | Shows duties for the locally selected member; match duties link into nested match detail and gameday duties to the canonical plan page.                                                      | Load error links to `/`; no selected member and no-duty states are explicit.                                                                                                                   | Member-facing                               | **retain separately** |
| `/setup`                                               | New-plan creation wizard.                                                                                            | Enter club, season, teams, members, and duty roles, then save and receive the canonical share link.                                                                                          | Resume uses local ID/key. Existing plans are edited at `/plans/:planId/setup`; query parameters do not switch this page into edit mode. No usable resume state leaves the wizard at its start. | Admin-facing UX boundary, not authorization | **retain separately** |
| `/plans/:planId/setup`                                 | Plan-scoped editor. `usePlanInit` loads the path ID with the fragment key or matching local resume state.            | Edit club, season, teams, members, duty roles, and locations; save transactionally, reload, copy the share link, or return to the schedule.                                                  | Loading and unavailable-plan states; save failures leave the live plan unchanged. Links preserve `#key=<key>`.                                                                                 | Admin-facing UX boundary, not authorization | **retain separately** |
| `/dashboard`, `/assignments`, `/team-list`, `/cockpit` | No dedicated page remains; these paths are handled by the catch-all page.                                            | None.                                                                                                                                                                                        | Immediately redirects to `/`, so legacy links do not preserve plan context.                                                                                                                    | Former member/admin prototype               | **redirect**          |
| `/<anything-else>`                                     | Catch-all page.                                                                                                      | None.                                                                                                                                                                                        | Immediately redirects to `/`, including unknown paths.                                                                                                                                         | General entry                               | **redirect**          |

The static informational routes `/guide`, `/support`, `/privacy`, and
`/imprint` are not part of the split plan experience and are unchanged by this
inventory. They use the default shell and link back to `/`.

## Disposition Matrix

| Disposition       | Routes                                                                                     | Intended next state                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Retain separately | `/`, `/plans/:planId`, `/plans/:planId/matches/:matchId`, `/setup`, `/plans/:planId/setup` | Keep root as link-first entry, plan/match pages as canonical member navigation, `/setup` as the creation boundary, and the plan-scoped setup route as the maintenance boundary.            |
| Redirect          | `/dashboard`, `/assignments`, `/team-list`, `/cockpit`, and other unknown paths            | Legacy global pages are removed and currently fall back to `/`. Their useful capabilities are preserved under the plan-scoped routes; compatibility redirects are intentionally not added. |
| Redirect          | `/<anything-else>`                                                                         | Preserve the current catch-all fallback to `/`; later route cleanup may narrow this behavior.                                                                                              |
| Re-wire           | None currently                                                                             | No route has a standalone re-wire disposition in this inventory; re-wiring is an implementation step within the migrations above.                                                          |
| Defer             | None as a route disposition                                                                | Authentication, admin authorization, swaps/replacements, and route removal remain deferred product/implementation work, not current route behavior.                                        |

## Reproducible Seed-Link Baseline

From the repository root, seed the anonymized fixture into a running or
deployed instance:

```sh
SEED_BASE_URL=https://your-deployment.example pnpm seed:plan
```

The command runs `scripts/seed-plan.mjs` with the default fixture
`test/fixtures/plan-2025-2026.json`, whose plan ID is:

```text
f530083d-8c74-4f10-931a-dd877ee7b52c
```

It POSTs the encrypted blob to:

```text
<base-url>/api/f530083d-8c74-4f10-931a-dd877ee7b52c
```

and prints a link with this exact route shape:

```text
<base-url>/plans/f530083d-8c74-4f10-931a-dd877ee7b52c#key=<printed-jwk-key>
```

Open the printed link to verify the plan list, then open the fixture's first
known match at:

```text
/plans/f530083d-8c74-4f10-931a-dd877ee7b52c/matches/match-2025-09-21-maenner-i-0#key=<same-printed-jwk-key>
```

The workflow is reproducible, but the literal link is not byte-for-byte
stable: the script generates a new AES-GCM key on every run and prints it only
after the POST succeeds. The printed URL is a bearer secret. The expected
checks are that the plan loads from the canonical path, the parent lists
fixtures, the known match resolves, and an eligible selected member can claim
an open duty without needing a legacy route.
