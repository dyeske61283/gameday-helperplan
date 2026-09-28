# ADR 0005: Chunk Large Encrypted Plan Blobs

**Status:** accepted

## Context

Deno KV has a value-size limit, while plans can contain large rosters and fixture schedules.

## Decision

Encrypted plan payloads larger than `PLAN_BLOB_CHUNK_SIZE` are stored as numbered
chunks in the `plans` storage namespace. The plan record stores an empty `blob`
and `chunkCount`; reads reassemble chunks in order before returning the payload.

Writes replace the plan record only after all chunks have been written. A missing
chunk is an error rather than a partial plan response.

## Consequences

- Chunking keeps the encrypted payload opaque.
- Reads must reject missing chunks instead of returning partial plans.
- The storage format remains one encrypted blob split across numbered records.

## Implementation State

Implemented in the server storage handlers.
