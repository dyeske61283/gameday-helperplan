# ADR 0005: Chunk Large Encrypted Plan Blobs

## Decision

Encrypted plan payloads larger than `PLAN_BLOB_CHUNK_SIZE` are stored as numbered
chunks in the `plans` storage namespace. The plan record stores an empty `blob`
and `chunkCount`; reads reassemble chunks in order before returning the payload.

Writes replace the plan record only after all chunks have been written. A missing
chunk is an error rather than a partial plan response.

## Rationale

Deno KV has a value-size limit. Chunking keeps the encrypted payload opaque while
allowing plans with large rosters and fixture schedules to be persisted without
adding a second serialization format.
