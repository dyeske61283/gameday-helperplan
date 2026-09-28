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

The issue is identified but not implemented. Do not describe current encryption as nonce-safe until the client and persisted payload format are updated.
