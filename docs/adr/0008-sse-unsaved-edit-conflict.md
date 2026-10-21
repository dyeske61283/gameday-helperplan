# Concurrent Plan Edits and Conflict Resolution

**Status:** proposed

## Context

The plan store receives whole-plan updates over SSE. Plans are saved as whole encrypted blobs using revision/CAS checks; the server cannot inspect or merge their contents. Applying an incoming update while a user is editing can replace unsaved local changes, while a stale save can be rejected after another client has written a newer revision.

## Decision

The user-facing contract for concurrent edits is:

- The first version handles edits from currently connected clients. Reconciling edits made offline is out of scope.
- Independent concurrent edits should merge automatically.
- Same-field edits and delete-versus-edit conflicts require an explicit user choice. Neither version may be silently discarded before that choice.
- Notify users when a conflict requires resolution; do not show a notification for a clean merge.
- Never silently overwrite local edits or a newer remote revision.

The merge mechanism is not yet decided. A design/prototype will compare a CRDT approach with schema-aware three-way merge. Reconciliation remains client-side so the server can continue treating plan payloads as opaque encrypted data.

## Consequences

- The client needs a clear dirty/conflict state and an accessible resolution flow.
- Merge semantics must account for stable entity IDs, collections, additions, and deletions.
- Tests must cover independent edits, same-field edits, delete-versus-edit, stale CAS writes, and explicit resolution.
- Offline reconciliation, editor identity, and a full collaborative presence/locking protocol are out of scope.
- The merge strategy and its tradeoffs should be recorded after the prototype before production implementation.

## Implementation State

The client currently defers newer SSE plans while an editor is active, but does not merge concurrent edits or provide user-facing conflict resolution. The design/prototype is tracked in #63; implementation is blocked on that result in #28.
