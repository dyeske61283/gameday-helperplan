# Schedule-First Navigation with Optional Edit Mode

**Status:** accepted

## Context

The shared plan link's primary purpose is to let members look up the current
schedule. Management tasks are less frequent and should not compete with that
daily workflow, while different people may occasionally need to make edits.

## Decision

Plan links open directly on the schedule. The schedule remains the landing page
regardless of whether the person last used management features. An optional,
toggleable **Edit mode** exposes management navigation for assignments, teams &
members, and editing plan setup data. Edit mode may be visible to anyone, is
remembered for convenience, and can be turned off. It is a UX mode, not an
authorization boundary. Initial plan creation remains a separate setup flow;
editing existing setup data belongs to Edit mode.

On mobile, management navigation uses a top dropdown rather than a persistent
sidebar. Management pages may use a separate coordinator shell once entered,
but the schedule-first entry point remains stable.

## Consequences

- The member path is one predictable step: shared link → current schedule.
- Management can be implemented as vertical slices without redesigning the
  schedule entry point.
- Edit mode persistence must be easy to disable and must not be mistaken for
  permission enforcement when real authorization is introduced.

## Implementation State

Accepted design; the schedule-plus-edit-mode interaction is prototyped on
branch `prototype/plan-navigation-variants` as variant `d`.
