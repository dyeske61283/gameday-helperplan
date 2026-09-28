# Helperplan Context

Helperplan coordinates club fixtures and helper duties. Members see assignments and their status; allocation fairness remains an internal scheduling concern.

## Vocabulary

**Duty**: A helper responsibility attached to a fixture, such as timekeeping, secretary work, ticketing, catering, wiping, or hall supervision.

**Duty progress**: A member-facing count of completed duties against an expected duty count. It is a count of duties, not a score, balance, or currency.

**Blocking time**: The internal calendar capacity consumed by a duty, including preparation or buffer time when configured. It is not currently persisted.

**Allocation score**: An internal scheduling signal used to distribute duties fairly. It is not a member balance, reward, ranking, or leaderboard.

**Helper team**: The team initially responsible for staffing a fixture's duties. It influences presentation and allocation preference; it does not prevent an eligible club member from claiming an open duty.

**Member**: A person represented in the club plan. A member may belong to zero or more teams. Authentication identity is a separate, future concern.

**Selected member**: The locally remembered member ID a person chooses for the prototype cockpit. This is a convenience selection, not proof of identity.

## Settled Product Rules

- A valid shared link grants access to the full plan and, for now, editing permissions. There are no user accounts or true identities.
- Sensitive administrative mutations and an exceptional admin-mode activation are future work, not current access controls.
- A person may freely change the selected member at any time; selection has no identity or authorization consequence.
- Claiming an open eligible duty is immediately binding and needs no approval.
- A replacement or swap will require approval by the receiving party, but swaps are deferred to version 1.1.
- An assigned duty becomes completed after the gameday closing time. Users are not expected to check in or confirm completion.
- Helper-team members receive prominent self-claim presentation. Club-wide eligible members may also claim; helper-team membership is not a hard eligibility gate.
- Capability requirements are hard eligibility constraints.
- Allocation scores are calculated internally and need not be persisted. Blocking time is not currently persisted.
- Member-facing progress counts completed duties only and must not use points, rewards, balances, or rankings.

## Deliberate Deferrals

- Authentication and identity verification.
- Admin mode and permission restrictions for sensitive mutations.
- Swap, handover, and public replacement request workflows.
- Assignment history required for swap auditing.
- Final member-category vocabulary and cancellation semantics.
- Final role configuration and quota rules.
