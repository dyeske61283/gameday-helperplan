# Unique Encryption IV Per Save

**Status:** proposed

## Context

AES-GCM must not reuse an initialization vector with the same key. The current client encryption implementation uses a fixed zero IV, which makes repeated saves unsafe.

## Decision

Generate a fresh random 12-byte IV for every encryption operation and store or transmit it with the encrypted blob. Decryption must read the IV from the stored payload rather than recreate it.

## Consequences

- Existing fixed-IV plans need an explicit migration or compatibility decision before changing the format.
- Encryption tests must prove that two saves with the same key produce different IVs.
- The IV is not secret; the URL fragment remains the bearer secret.

## Implementation State

Implementation is deferred. The client still uses a fixed zero IV, so current encryption is not nonce-safe. Closing the broad backlog issue retires that tracking item only; it does not implement this proposal. Re-scope the migration before work resumes, including compatibility with existing encrypted plans.
