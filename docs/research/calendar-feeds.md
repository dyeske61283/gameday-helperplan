# Calendar Feed Design Research

This note supports ADR 0009. It records the standards and repository facts
used to choose the calendar feed design.

## Current Repository Boundary

The server stores an opaque `StoredPlan` blob. The browser reads the blob,
uses the AES key from the URL fragment, and decrypts it locally. No server-side
iCalendar route exists today. The current member export is generated in the
browser.

The current encryption implementation uses AES-GCM with a fixed zero IV. ADR
0007 records that unique IVs are future work. This is an existing security
issue, not a recommendation for new feed cryptography.

## Access Options

| Design | Main property | Main cost |
| --- | --- | --- |
| Query key endpoint | No additional storage; server decrypts per request | Full plan key appears in a URL and can leak through URL retention and logs |
| Derived key | Can produce a different credential | Native calendar clients cannot run application derivation; a KDF is not access control |
| Stored random token | Individual revocation and inspection | Requires token metadata storage and cleanup |
| Stateless encrypted token | No per-feed storage; scoped expiry; canonical plan remains the only plan copy | Individual revocation is unavailable before expiry |
| Client-only download | Server never sees plaintext calendar data | No polling or automatic updates |
| Stored calendar projection | Easy native polling | Plaintext projection must be synchronized and can diverge |

The selected design is the stateless encrypted token. The token carries scope,
member ID where needed, expiry, and the plan key wrapped for the server. Each
request reads the one canonical encrypted plan blob, decrypts it in memory,
generates scoped ICS, and discards plaintext data.

## iCalendar Facts

- RFC 5545 defines the `VCALENDAR` object and `text/calendar` media type.
- Event UIDs must remain stable so clients can correlate updates.
- UTC date-times use a trailing `Z`; local times require deliberate timezone
  handling.
- `webcal` is a client-facing subscription convention. The interoperable
  transport is an HTTPS GET returning `text/calendar`.
- A feed is a published snapshot, not automatically a two-way meeting or
  attendee workflow.
- Stable UIDs and cancellation/update behavior need client compatibility tests;
  simply omitting an event is not a universal deletion guarantee.

Sources:

- [RFC 5545: iCalendar](https://www.rfc-editor.org/rfc/rfc5545)
- [RFC 5546: iTIP](https://www.rfc-editor.org/rfc/rfc5546)
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111)
- [W3C Referrer Policy](https://www.w3.org/TR/referrer-policy/)
- [Apple: Subscribe to calendars](https://support.apple.com/guide/calendar/subscribe-to-calendars-icl1022/mac)
- [Apple: Refresh calendars](https://support.apple.com/guide/calendar/refresh-calendars-icl1024/mac)
- [Google Calendar: Subscribe by URL](https://support.google.com/calendar/answer/37100)

## Repository Date Facts

Match timestamps are parsed into JavaScript `Date` values. They represent
instants and the original textual offset is not retained. The current exporter
serializes them as UTC.

Gameday dates are date-only values, while opening and closing times have no
timezone field. The current exporter appends `Z`, which treats those local-
looking values as UTC. Venue/location timezone data is needed before those
times can be promised as locally correct.

## Remaining Implementation Constraints

- Full-plan download contains every match and no member assignments.
- Cockpit download contains only the selected member's assigned duties.
- Full-plan download belongs on the schedule; member download belongs in the
  cockpit.
- The feed endpoint is read-only and must redact tokens, keys, plaintext plans,
  and ICS responses from logs.
- Initial release targets Apple Calendar and Google Calendar.
- Calendar clients control their polling interval. The application may provide
  freshness headers, but cannot guarantee a client refresh deadline.
