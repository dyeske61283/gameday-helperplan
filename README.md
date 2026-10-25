# Gameday Helperplan - your helper to organize your helpers

a small web app to organize a helper plan for home turf gamedays

## Why? What? Huh?

We are organizing the helpers for our home game days always in a crappy excel
file, that is then distributed in a very unoptimal way. I hate every single
thing about that excel file...

- You cannot really see - especially on mobile devices - when and what your duty
  is on a given game day.
- People swap or are sick all the time and these changes are not distributed
  again properly with newer file versions
- Event dates change also all the time - same problems as above
- The excel file is also not always done for the whole season at once, so there
  may be additional days, where you have duties, but you need to look into a
  newer file to know

All of this is pain.

The current prototype keeps the flow deliberately smaller:

1. Open or resume a shared plan link.
2. Create a plan manually when using `/setup`.
3. Add teams, members, fixtures, and duties.
4. Claim eligible open duties immediately.
5. Share the plan using `/plans/<planId>#key=<key>`.

Authentication, admin authorization, swaps, nuLiga import, and automated assignment are deferred. See `CONTEXT.md` and `docs/adr/` for the current rules.

Look at the
[Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to
learn more.

## Setup

Make sure to install dependencies:

```bash
pnpm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm run dev
```

## Production

Build the application for production:

```bash
pnpm run build
```

Locally preview production build:

```bash
pnpm run preview
```

### Seed A Demo Plan

Seed the anonymized example plan into any deployed instance and print a fresh
link:

```bash
SEED_BASE_URL=https://your-deployment.example pnpm seed:plan
```

The encryption key is generated locally and only appears in the printed link.
Treat that link as a bearer secret. GitHub Actions runs the same command for
E2E deployments and publishes the link in the workflow summary.

### Run a Decrypted Plan Command

The internal runner reads one JSON request from stdin or a file. Its `plan`
must be decrypted `SeasonPlan` JSON; mutation requests require an explicit ISO
`now` so results are deterministic. For example:

```json
{
  "command": "claim-duty",
  "plan": { "...": "decrypted SeasonPlan" },
  "matchId": "match-1",
  "slotId": "slot-1",
  "memberId": "member-1",
  "now": "2026-10-25T12:00:00.000Z"
}
```

Run a request from a file or pipe it on stdin:

```bash
deno run --unstable-sloppy-imports --allow-read scripts/plan-runner.ts request.json
cat request.json | deno run --unstable-sloppy-imports --allow-read scripts/plan-runner.ts
```

Supported commands are `validate`, `claim-duty`, `auto-assign`, and
`complete-assignments`. Auto-assignment takes `matchId`, `now`, and optional
`balanceDutyCounts` / `excludeConflicts` booleans. Successful output is one
compact JSON object containing a mutation summary and the resulting plan;
errors go to stderr and exit nonzero.

## Toolchain

This project uses ESLint for linting and formatting.

### Linting & Formatting

To check for linting issues:

```bash
pnpm lint
```

To automatically fix linting and formatting issues:

```bash
pnpm lint:fix
```

### Pre-commit Hooks

Husky and lint-staged are configured to run ESLint on staged files before each commit. This ensures that only lint-free code is committed to the repository.

Check out the
[deployment documentation](https://nuxt.com/docs/getting-started/deployment) for
more information.
