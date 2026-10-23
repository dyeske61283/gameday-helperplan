# Concurrent Plan Edits and Conflict Resolution

**Status:** proposed

## Context

Plans are saved as whole encrypted blobs with an expected-revision compare-and-set (CAS). The server cannot inspect or merge plan contents. The client receives newer blobs over SSE; while editing, it currently defers them, and a stale save is rejected with HTTP 409.

The first version handles connected clients only. Offline reconciliation, editor identity, and presence/locking are out of scope. Independent concurrent edits should merge automatically. Same-field and delete-versus-edit conflicts must remain visible until a user chooses a value; only conflicts requiring action should notify users.

## Decision

Recommend a client-side, schema-aware three-way merge over a CRDT for the first implementation. The recommendation is proposed pending review of the prototype; it does not authorize production changes in this issue.

The client retains the common base snapshot, local draft, and newest remote snapshot. It merges changed fields recursively, keyed by stable entity IDs. Unchanged-on-one-side values take the other side; equal concurrent values converge. If both sides changed a field differently, retain the local value only as a provisional preview, keep base/local/remote candidates in the conflict, and block saving until the user resolves it. Delete versus edit is a conflict with the deleted and edited alternatives preserved. A clean merge needs no notification.

Collection rules:

- Map collections such as `members`, `teams`, `matches`, and `gamedays` use their entity IDs as identity. Different-ID additions combine; a reused ID is the same entity, not a new list item.
- Slots, roles, and locations also have stable IDs but are represented as arrays. Production merge must match them by ID, never by array index, and define ordering separately.
- Relationship arrays such as `teamIds`, `skillIds`, and `matchIds` need explicit set/add/remove semantics. The prototype treats arrays atomically so it cannot silently guess about a concurrent removal or reorder.
- An entity deletion wins if the other side left that entity unchanged. Deletion concurrent with an edit is an explicit conflict; no tombstone or edit is discarded before resolution.

On a 409, the client keeps its draft, fetches the latest encrypted plan and revision, decrypts it, and merges `(base, local draft, latest remote)`. If clean, it encrypts and retries with the latest `expectedRevision`; if conflicted, it blocks the save until explicit resolution. Another 409 repeats the rebase against the newest server snapshot. The request remains a whole opaque blob; no server merge endpoint or protocol change is needed.

## Alternatives Considered

**CRDT:** CRDTs can converge operations without a shared base and are a better fit if offline edits or richer multi-writer collaboration become requirements. Here they require choosing CRDT types and conflict semantics for every plan field and collection, tracking operation/causal metadata and tombstones, and changing the persisted/wire representation. A last-writer-wins register would silently choose a same-field value, contrary to the required explicit resolution. A conflict-preserving CRDT is possible but adds machinery the connected-client snapshot/CAS flow does not need.

**Schema-aware three-way merge:** Reuses the existing snapshots and CAS boundary, needs no production dependency or protocol change, and makes domain conflicts visible. It costs explicit merge rules as the schema evolves and cannot safely treat every array alike. That is the smaller, reviewable first step while offline edits remain out of scope.

## Consequences

- Plaintext base/draft/remote and merge logic stay on the client; the server continues storing and broadcasting opaque encrypted blobs.
- Expected-revision CAS remains the final guard against a second race; a merge is not permission to write against a stale revision.
- Conflict state must preserve all alternatives and disable save until each conflict is resolved. Notify only when a merge leaves conflicts requiring action; do not notify on a clean automatic merge.
- Before production retries re-encrypt payloads, resolve the encryption-format/nonce-safety issue in proposed ADR 0007. This prototype does not change encryption.
- The prototype is intentionally a JSON-tree slice, not full `SeasonPlan` merge coverage. Production work must add the collection-specific semantics above and validate the merged plan against `SeasonPlanSchema`.
- Do not add CRDT metadata or a production merge dependency unless offline collaboration becomes an agreed requirement.

## Implementation State

The prototype in `test/api/plan-merge.prototype.ts` covers independent field edits, concurrent additions, same-field conflicts/resolution, and delete-versus-edit. Run it with `pnpm exec vitest run test/api/plan-merge.prototype.test.ts --project=api`. The endpoint test exercises the real 409 expected-revision path using opaque payload tokens. No production store, SSE, encryption, or protocol code is changed. Production implementation remains follow-up work after review of this proposal (#28).
