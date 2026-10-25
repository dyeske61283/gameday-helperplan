# Unique Encryption IV Per Save

**Status:** accepted

## Context

AES-GCM must not reuse an initialization vector with the same key. Before this decision was implemented, the client used a fixed zero IV, making repeated saves unsafe.

## Decision

Generate a fresh random 12-byte IV for every encryption operation and store or transmit it with the encrypted blob. New blobs use the `v1.` prefix followed by base64-encoded IV and ciphertext. Decryption reads the IV from the payload. Blobs without the prefix are legacy ciphertexts encrypted with the zero IV.

## Consequences

- Existing fixed-IV plans remain readable and migrate to the new format when next saved.
- Encryption tests must prove that two saves with the same key produce different IVs.
- The IV is not secret; the URL fragment remains the bearer secret.

## Implementation State

Implemented in the client crypto boundary. Shared-link, resume, and SSE loads use the same format-aware decryption; the server continues to store opaque blobs.
