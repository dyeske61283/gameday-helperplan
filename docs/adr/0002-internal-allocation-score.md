# Keep Allocation Scoring Internal

**Status:** accepted

The helper allocator may use an internal allocation score to balance duties. The score can give more weight to duties with greater blocking time and must limit repeated assignments, but the product will expose only duties, required-duty counts, and assignment status. We keep the score out of the member UI because a visible points system adds cognitive load without a current real-world consequence and would invite users to optimize the metric rather than duty coverage.

**Consequences:**

- Allocation scores are calculated internally and do not need to be persisted.
- Blocking time is not currently persisted as a member-facing value.
- The member cockpit and helper board must not show points, bonuses, balances, rankings, or reward language.
- Required seasonal duties remain visible as a plain duty count.
