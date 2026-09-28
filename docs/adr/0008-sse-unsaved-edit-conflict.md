# SSE Updates During Unsaved Edits

**Status:** proposed

## Context

The plan store receives whole-plan updates over SSE. Applying an incoming update while a user is editing can replace unsaved local changes.

## Decision

Do not silently discard unsaved edits when an SSE update arrives. The implementation must either defer the incoming update while the editor is dirty or present an explicit conflict state before replacing local data.

## Consequences

- The store needs a clear dirty/conflict state for editable plan views.
- Tests must cover an incoming newer revision while local edits are unsaved.
- A full collaborative locking protocol is out of scope until concurrent editing needs justify it.

## Implementation State

The risk is identified but not implemented. Current SSE behavior must not be documented as conflict-safe.
