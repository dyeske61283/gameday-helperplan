# Link-First Entry and Explicit Slot Lifecycle

**Status:** accepted

The application root is a link-first entry point, not a SaaS landing page. Shared plan links use `/plans/<planId>#key=<key>` and open the general plan view; direct match links use `/plans/<planId>/matches/<matchId>#key=<key>`. The nested match path is the canonical recommendation because a match is a resource within a plan, not a filter or incidental view state. The client still resolves and validates the match only after decrypting the plan; that does not require putting the match ID in the query string. Visitors without a usable link see a minimal empty state and may explicitly resume a locally saved plan, with the plan ID and decryption key persisted together. Helper slots persist an explicit `OPEN`, `ASSIGNED`, `COMPLETED`, or `CANCELLED` lifecycle so assignment is not confused with completion.

We considered `/plans/<planId>?matchId=<matchId>`, but rejected it because it makes match identity look like a schedule filter, weakens the canonical resource hierarchy, and makes accidental fallback rendering easier. A dedicated `/match` route was also rejected because it separates the match from its plan context. The fragment remains the key location because it is not sent in HTTP requests; it is still a bearer secret and must not be treated as authentication.

**Consequences:**

- The root route must distinguish shared-link loading, local resume, and no-plan states.
- Match IDs use nested paths even though the client must decrypt the plan before resolving them; unknown IDs produce a stable not-found state.
- Local resume is user-triggered rather than automatic.
- Existing plans require migration from inferred occupancy to explicit slot status.
- The migration is applied when example, persisted, or real-time plans enter the store; schema version 2 is written on the next save.
