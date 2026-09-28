# Single Plan-Scoped Navigation

**Status:** accepted

## Context

The application is moving from global prototype pages to one plan-scoped navigation tree.

## Decision

`/plans/:planId` is the canonical user-facing plan entrypoint. Match pages use `/plans/:planId/matches/:matchId`, and the encryption key stays in the URL fragment. `/setup` remains the creation and maintenance entrypoint; links generated for an existing plan use `/plans/:planId#key=<key>`.

The existing global pages `/dashboard`, `/assignments`, `/team-list`, and `/cockpit` are transitional legacy routes. They are not canonical and must not be added to new links. Their useful behavior will be migrated before the routes are removed.

## Consequences

- New documentation, tests, and links use plan-scoped routes.
- Legacy routes may remain reachable during migration, but their transitional status must be explicit.
- Regular member navigation remains read/claim-focused; admin navigation is a UX boundary, not authorization.
- Route removal is a follow-up implementation task, not an already completed fact.

## Implementation State

Partial. Plan-scoped pages exist, while legacy pages and some legacy links remain
until their behavior is migrated.
