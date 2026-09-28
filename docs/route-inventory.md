# User-Facing Route Inventory

This is the current baseline for the split navigation experience. It describes
the routes in the application at the time of issue #33 without changing their
runtime behavior. Authentication is not a route boundary: a usable shared
plan link grants the current prototype's read/write access, and selected-member
state is only a local convenience.

## Shared Loading Rules

The plan-scoped pages and the four legacy plan pages call `usePlanInit` on
mount. It reads `#key=<key>` and strips the fragment, then loads in this
order:

1. `planId` plus a fragment key from the URL.
2. A plan already held in the Pinia store for in-session navigation.
3. A matching locally stored plan ID and key.
4. No plan, leaving the page's empty state in place.

Successful loads start the plan's SSE watcher; unmounting stops it. A missing
or invalid key does not authenticate a user and results in an unavailable or
empty view depending on the route.

## Route Inventory

| Route | Entry and plan loading | Visible capabilities | Links and fallback/error state | Audience | Disposition |
| --- | --- | --- | --- | --- | --- |
| `/` | Link-first entry. Does not load a plan. Shows `Resume plan` only when a locally stored ID and key exist. | Resume the locally stored plan. With no resume state, explains that a shared link is required. | Resume links to `/plans/<planId>#key=<key>`. No-plan state is the normal fallback. | Member entry | **retain separately** |
| `/plans/:planId` | Canonical shared-link entry. `usePlanInit` loads the path ID with the fragment key, or resumes matching local state. | Shows club/season and fixture list with open-duty counts. Fixture cards open match pages. | Loading state; API/decryption error with `Return to start` to `/`; no loaded plan shows `This plan is unavailable.` | Member-facing schedule | **retain separately** |
| `/plans/:planId/matches/:matchId` | Same plan loading as the parent route; match is resolved only after the plan is loaded. | Shows one fixture's duties, selected-member picker, eligibility-aware claim actions, and slot status. Claiming saves immediately when a key is present. | `All fixtures` and `Back to fixtures` link to the parent. Unknown match shows `Match not found`. Includes a legacy `/cockpit` link for personal duties. | Member-facing claim flow | **retain separately** |
| `/dashboard` | Transitional global schedule page. `usePlanInit` accepts a path/query `planId`, in-memory plan, or local resume; without one it renders with no plan data. | Timeline/calendar schedule, search by member/team/date, duty counts, check-in, and iCal export for a matched member. Links to duty management and teams. | Header links are `/assignments` and `/team-list`; no plan-specific IDs are included. Empty data renders `No gamedays found`. | Mixed member/admin prototype | **migrate** |
| `/assignments` | Transitional global assignment editor using the same shared loading rules. | Search/filter matches, assign or clear members, set helper teams, auto-staff, inspect conflicts, and save. Missing key makes mutation feedback local/read-only rather than server-persisted. | `View Schedule` links to `/dashboard`; empty plan data produces an empty editor rather than a canonical plan redirect. | Admin-facing UX boundary, not authorization | **migrate** |
| `/team-list` | Transitional global roster/team editor using the same shared loading rules. | Search teamless/team members; add/edit/delete members and teams; save when a key exists. | No plan-scoped links. With no plan, lists are empty and mutations have no useful loaded target. | Admin-facing UX boundary, not authorization | **migrate** |
| `/cockpit` | Transitional global personal-duty page using the same shared loading rules. | Shows duties for the locally selected member; match duties link into the canonical match page and gameday duties to the canonical plan page. | Load error links to `/`. No selected member says to select one from a match; selected member with no duties gets an empty state. | Member-facing | **migrate** |
| `/setup` | Creation and maintenance entrypoint. New plans are created in the wizard; `?planId=<id>#key=<key>` loads an existing plan and opens the editor. | Create club/team/member data, edit plan JSON, save/reload, display ID/key/share link, and navigate to schedule or duty management. | Existing-plan share links are rewritten to `/plans/<id>#key=<key>`. Wizard resume uses local ID/key. No usable plan/key leaves the wizard at its start. | Admin-facing UX boundary, not authorization | **retain separately** |
| `/<anything-else>` | Catch-all page. | None. | Immediately redirects to `/`, including unknown paths. | General entry | **redirect** |

The static informational routes `/guide`, `/support`, `/privacy`, and
`/imprint` are not part of the split plan experience and are unchanged by this
inventory. They use the default shell and link back to `/`.

## Disposition Matrix

| Disposition | Routes | Intended next state |
| --- | --- | --- |
| Retain separately | `/`, `/plans/:planId`, `/plans/:planId/matches/:matchId`, `/setup` | Keep root as link-first entry, plan/match pages as canonical member navigation, and setup as the creation/maintenance boundary. |
| Migrate | `/dashboard`, `/assignments`, `/team-list`, `/cockpit` | Move useful capabilities and links into the plan-scoped navigation tree before removing the global routes. Do not add these paths to new links. |
| Redirect | `/<anything-else>` | Preserve the current catch-all fallback to `/`; later route cleanup may narrow this behavior. |
| Re-wire | None currently | No route has a standalone re-wire disposition in this inventory; re-wiring is an implementation step within the migrations above. |
| Defer | None as a route disposition | Authentication, admin authorization, swaps/replacements, and route removal remain deferred product/implementation work, not current route behavior. |

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
