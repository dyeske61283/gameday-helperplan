# Product Open Questions

These questions were intentionally left open during the first domain grilling round. Revisit them before expanding the product beyond the current tracer bullet.

## Q15: Member Categories

Which first-class categories are needed to distinguish coaches from players while supporting parents, staff, and general helpers with no team membership?

Candidate set: `PLAYER`, `COACH`, `STAFF`, `PARENT`, `HELPER`.

Recommendation: use descriptive member categories independently of optional team membership; do not use them as access-control roles.

## Q16: Helper-Team Discoverability

Who sees the prominent self-claim action when a helper team is assigned? The current direction is to separate eligibility from presentation: helper-team members get prominent presentation, while other eligible club members can still discover and claim the duty.

## Q17: Automatic Completion Mechanics

Should completion after gameday closing time be persisted when the plan is next read or saved, or remain time-derived in the UI until an administrative action exists?

## Q18: Cancellation Semantics

When a match or gameday is cancelled, should existing assignments be cleared, preserved as cancelled assignments, or left unchanged? The current recommendation is to stop new claims, preserve history, and exclude the duty from completed progress.

## Q19: Role Configuration

Are roles and slot counts configurable by the plan owner, with defaults applying only to newly created fixtures? Existing fixtures should not be mutated when defaults change.

## Q20: Future Editing Authority

Which mutations should eventually require the exceptional admin-mode activation? Candidates include member/category changes, capability changes, team/helper-team changes, fixture changes or cancellation, role definitions, and duty quotas. Current policy: shared-link editing remains unrestricted until this future boundary is designed.
