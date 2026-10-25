# Concurrent Plan Edits and Conflict Resolution

**Status:** accepted

## Context

The plan store receives whole-plan updates over SSE. Plans are saved as whole encrypted blobs using revision/CAS checks; the server cannot inspect or merge their contents. Applying an incoming update while a user is editing can replace unsaved local changes, while a stale save can be rejected after another client has written a newer revision.

## Decision

The user-facing contract for concurrent edits is:

- The first version handles edits from currently connected clients. Reconciling edits made offline is out of scope.
- Independent concurrent edits should merge automatically.
- Same-field edits and delete-versus-edit conflicts require an explicit user choice. Neither version may be silently discarded before that choice.
- Notify users when a conflict requires resolution; do not show a notification for a clean merge.
- Never silently overwrite local edits or a newer remote revision.

Use a client-side, schema-aware three-way merge rather than a CRDT for the first implementation. Retain the common base snapshot, local draft, and latest remote snapshot; merge independent changes automatically, and preserve all alternatives for same-field and delete-versus-edit conflicts until the user resolves them. Reconciliation remains client-side so the server can continue treating plan payloads as opaque encrypted data.

Merge keyed collections by stable entity IDs, never array position. Production rules must distinguish entity collections, ordered entities, and relationship arrays; the JSON-tree prototype is evidence for the approach, not production merge coverage.

## Alternatives Considered

CRDTs better support offline edits and richer multi-writer collaboration, but require operation metadata and merge semantics for each plan field and collection. The current connected-client flow already has a common base snapshot and revision/CAS boundary, so schema-aware three-way merge is the smaller first step. Last-writer-wins is rejected because it would silently discard one side of a same-field conflict.

## Consequences

- The client needs a clear dirty/conflict state and an accessible resolution flow.
- Merge semantics must account for stable entity IDs, collections, additions, and deletions.
- Tests must cover independent edits, same-field edits, delete-versus-edit, stale CAS writes, and explicit resolution.
- Offline reconciliation, editor identity, and a full collaborative presence/locking protocol are out of scope.
- Production auto-merge retries re-encrypt the plan; they rely on the nonce-safe AES-GCM format implemented by #70.
- The prototype is retained as reference on its `prototype/issue-63-plan-merge` branch; only this decision record is merged to `main`.

## Implementation State

Implemented by #28: the client tracks a saved baseline, merges independent edits by stable entity IDs, and requires an explicit local-or-remote choice for conflicting edits. Relationship arrays merge as membership sets; ordered entity arrays preserve one-sided reorders and surface conflicting reorders. CAS failures refresh the opaque remote blob and use the same merge flow.
