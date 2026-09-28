# Single Plan-Scoped Navigation

**Status:** accepted

The link-first plan route is the one user-facing application entrypoint: `/plans/:planId` opens the schedule with a timeline/calendar toggle, and plan-dependent surfaces remain under that plan path. Global legacy routes such as `/dashboard`, `/assignments`, `/team-list`, and `/cockpit` are removed rather than redirected because the application has no users yet; useful behavior is migrated into plan-scoped pages before removal. Setup keeps explicit `/setup` and `/plans/:planId/setup` route slots, with the base route providing a reachable path to `/setup` even while plan creation is unavailable. Regular member navigation stays read/claim-focused, while admin navigation remains a UX boundary without authorization.
