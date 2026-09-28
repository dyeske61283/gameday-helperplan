# Current User Workflows

These workflows describe the current tracer bullet. Route examples use the
canonical plan-scoped paths from ADR 0006.

## Open A Shared Plan

1. Open `/plans/<planId>#key=<key>`.
2. The client reads the key from the fragment and fetches `/api/<planId>`.
3. The plan is decrypted client-side and displayed at `/plans/<planId>`.
4. A match opens at `/plans/<planId>/matches/<matchId>`.

## Resume A Plan

1. Open `/` and choose `Resume plan` when a local plan reference exists.
2. The app opens the saved plan-scoped link.
3. A missing or invalid key leaves the plan unavailable; the key is never
   treated as authentication.

## Create And Edit A Plan

1. Open `/setup`.
2. Add club information, teams, and members manually.
3. Finalize the plan and save the encrypted blob through `/api/<planId>`.
4. Share the generated `/plans/<planId>#key=<key>` link.

## Claim A Duty

1. Open a plan-scoped schedule or match page.
2. Choose an eligible open duty.
3. Claiming is immediately binding and requires no approval.
4. Capability requirements remain hard eligibility constraints.

## Deferred Or Out Of Scope

- Authentication and identity verification.
- Admin authorization and restricted mutations.
- Swaps, handovers, and replacement requests.
- nuLiga import or synchronization.
- Automated helper assignment.
- Check-in as a completion mechanism.
- Custom role and quota configuration.

Executable workflows live under `test/`; this document is only a concise
behavior reference and must not describe placeholder scenarios as implemented.
