# Prototype Link Access and Selected Member

**Status:** accepted

There are no user accounts, real identities, authentication, or authorization in the product roadmap. A valid shared plan link is the access boundary and grants full plan read/write access. A person selects a member ID for the cockpit; that selection is persisted locally for convenience, can be changed freely, and is never treated as authentication or authorization. Any admin mode is a navigation and UX boundary only, not a security boundary.

## Consequences

- Shared links must be treated as bearer secrets.
- Local member selection must never be used as an authorization check.
- Sensitive administrative restrictions remain future work.

## Implementation State

Accepted and reflected in the current prototype.
