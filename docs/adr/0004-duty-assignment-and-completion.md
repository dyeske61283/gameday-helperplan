# Immediate Duty Assignment and Gameday Completion

**Status:** accepted

Claiming an open eligible duty is immediately binding and requires no approval. The assigned helper team receives prominent self-claim presentation, while eligible club-wide members may also claim; helper-team membership is a preference, not a hard eligibility gate. Because people are not expected to check in or confirm duties, an assigned duty becomes completed after the gameday closing time. Swaps and replacement requests, including approval by the receiving party, are deferred to version 1.1.

**Consequences:**

- Capability requirements remain hard claim constraints.
- Assignment and completion must remain distinct lifecycle states.
- Completion timing can be adjusted after feedback from the first users.
- A full swap history and request model are not required for the current slice.

**Implementation decision:**

- Slots persist `assignmentStatus` as `OPEN`, `ASSIGNED`, `COMPLETED`, or `CANCELLED`; legacy occupancy is migrated to `OPEN` or `ASSIGNED` when plans are loaded.
- Capability eligibility is evaluated from `Role.requiredSkillId` and `Member.skillIds` by the shared domain predicate used by both manual and automatic assignment.
- Completion is a deterministic domain transition after a gameday's closing time. Check-in remains legacy data and is not used to determine completion.
