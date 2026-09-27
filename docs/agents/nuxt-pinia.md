# Nuxt and Pinia

These are Helperplan conventions, not a replacement for the [Nuxt](https://nuxt.com/docs/4.x) or [Pinia](https://pinia.vuejs.org/) documentation.

## Nuxt Boundaries

- Use Nuxt 4 directories deliberately: `app/` for browser application code, `server/` for Nitro handlers and server-only code, `shared/` for code used by both, and `test/` for application tests.
- Keep domain algorithms and transformations in plain utilities. Pages and components coordinate presentation; stores coordinate shared state and domain actions.
- Use `useFetch` or `useAsyncData` for SSR-aware reads. Use `$fetch` for event-driven mutations and server actions.
- Treat every server handler as a trust boundary: validate request input with Zod, enforce the intended HTTP method, and keep secrets server-side.
- Resolve hydration warnings. Put browser-only behavior behind `import.meta.client`, `onMounted`, or `ClientOnly` as appropriate.
- Give each page a meaningful title and preserve keyboard, focus, semantic HTML, and screen-reader behavior.

## Pinia State

- Stores own shared state and domain invariants. Components call store actions instead of mutating nested plan data directly.
- Keep getters pure and derived. Keep scheduling, conflict detection, and other reusable calculations in `app/utils/`.
- Keep browser-only resources such as `EventSource` and timers private to the store, and provide explicit start/stop cleanup actions.
- Treat returned store state as potentially SSR-serialized. Do not expose encryption keys, tokens, or other bearer secrets through state that can be rendered into HTML.
- Use `callOnce` when a page initializes store data through an action during SSR or navigation.
- Use `storeToRefs()` when destructuring state or getters from a store; call actions on the store instance.
- Keep `usePlanStore` as one plan aggregate until a separate lifecycle or domain boundary justifies another store.

## Tests

- Create a fresh Pinia instance for each store test.
- Test store actions and domain rules directly. Component tests may use `createTestingPinia()` when actions should be mocked.
- Match the existing test split: fast unit tests, Nuxt runtime tests, API tests, and end-to-end workflow tests.

Before finishing a non-trivial change, run the smallest relevant targeted tests, then `pnpm lint` and `pnpm typecheck` when the change crosses application boundaries.
