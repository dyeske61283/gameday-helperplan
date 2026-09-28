# Calendar Feed Delivery

**Status:** accepted

## Context

The application stores each plan as one opaque encrypted blob. The AES key is
currently carried in the URL fragment and is used by the browser to decrypt
the plan locally. The browser already supports generating a member-scoped ICS
download, but native calendar clients need an HTTPS endpoint they can poll to
receive changes to moved or cancelled matches.

Native calendar clients cannot execute the application's JavaScript or use a
fragment key. A live calendar feed therefore requires a deliberately limited
server-side decryption path. The feed must not create a second stored copy of
the plan or a separately synchronized calendar projection.

## Decision

Use a stateless, encrypted feed token and generate each ICS response from the
canonical encrypted plan blob.

The feed lifecycle is:

1. The browser loads and decrypts the plan using the existing fragment key.
2. The user requests a calendar subscription for an explicit scope.
3. The browser sends the plan ID, existing AES key, and requested scope to a
   token-creation endpoint over HTTPS. The key is sent in the request body,
   never in a URL.
4. The server loads and decrypts the canonical plan in memory, validates the
   requested scope, and creates a short-lived encrypted token.
5. The server returns an HTTPS feed URL containing only the opaque token. The
   browser may offer the same URL with a `webcal` scheme where supported.
6. A calendar client polls the feed URL. The server decrypts and validates the
   token, loads the current encrypted plan blob, decrypts it in memory, emits
   only the permitted ICS events, and discards plaintext data before the
   request completes.

The token is self-contained and contains, at minimum:

- plan ID;
- feed scope;
- member ID for a member-duty feed;
- expiration time; and
- the plan AES key wrapped for the server.

The token is authenticated and encrypted with server-held secrets. The server
does not persist the token, plaintext plan, generated ICS response, or a
calendar projection. The only plan copy remains the canonical encrypted blob.

The initial feed scopes are:

- `matches`: every match in the plan timeline, with no member assignments;
- `member-duties`: only duties assigned to the selected member, including
  match-level and gameday-level duties.

Full-plan `.ics` download belongs on the plan schedule and contains all
matches. Member `.ics` download belongs in the cockpit and contains only the
selected member's duties. These downloads remain client-generated and do not
require a feed token.

Feed requests and token creation must use conservative handling:

- no query-string plan keys;
- no logging of tokens, keys, decrypted plans, or generated ICS;
- no analytics middleware on feed routes;
- `Cache-Control: private, no-store` unless a later decision permits caching;
- deliberate redaction in request and error logging; and
- read-only feed behavior.

Tokens are bearer credentials. Stateless tokens can expire and can be rejected
when the plan no longer exists or the server secrets rotate, but individual
revocation is not available without adding token metadata storage. Individual
revocation and user accounts are deferred.

## Calendar Semantics

Match timestamps represent instants and are serialized as UTC in ICS. Calendar
clients are expected to display UTC instants in the viewer's local timezone.
Gameday opening and closing times are currently local-looking values without a
stored timezone and must not be presented as locally correct until timezone
data is added to the relevant location or time value. A global plan timezone
is not introduced.

Events use stable UIDs derived from their domain IDs. A moved event keeps its
UID. A cancelled match remains represented as a cancelled event rather than
silently disappearing, subject to the compatibility behavior of the target
calendar clients. The feed is a published snapshot, not a two-way scheduling
or attendee workflow.

## Consequences

- The server becomes trusted to decrypt plans transiently for calendar
  delivery, although it does not store plaintext plan data.
- A feed poll always reads the latest canonical encrypted blob, so there is no
  projection synchronization or plan-copy divergence.
- The feed token is safer to scope than exposing the full plan key in a query
  parameter, but it remains a bearer secret and can be replayed until expiry.
- Stateless expiry is available; per-feed revocation requires a future stored
  token registry.
- Token issuance and feed generation need focused tests for scope isolation,
  malformed or expired tokens, logging/cache behavior, stable UIDs, updates,
  cancellations, and empty plans.
- The existing encryption implementation's fixed-IV risk remains separate
  security work and must not be treated as a reason to persist plaintext feed
  projections.

## Rejected Alternatives

- **Query key feed:** simplest, but exposes the full plan decryption key in a
  URL retained by calendar clients, proxies, logs, and browser history.
- **Client-side key derivation:** native calendar clients cannot execute the
  derivation, so it cannot be the subscription protocol.
- **Stored calendar projection:** adds synchronization and divergence risk and
  persists plaintext calendar data unnecessarily.
- **Stored random feed tokens:** supports individual revocation but adds token
  metadata storage; it remains a possible later upgrade.
- **Client-only downloads for live updates:** preserves the strongest privacy
  boundary but cannot provide polling subscriptions.

## Implementation State

Accepted design; implementation pending. The related implementation tasks are
tracked in GitHub issue #40.
