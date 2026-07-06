# Gameday Helperplan - AI Context

## Project Overview

**Gameday Helperplan** is a modern Nuxt 4 web application designed to simplify the organization of helper duties for home turf gamedays. It aims to replace cumbersome Excel files with a dynamic, mobile-friendly, and real-time solution.

### Key Technologies

- **Framework:** [Nuxt 4](https://nuxt.com/) (Vue 3)
- **UI & Styling:** [@nuxt/ui v4](https://ui.nuxt.com/), [Tailwind CSS v4](https://tailwindcss.com/), `@formkit/auto-animate`
- **State Management:** [Pinia](https://pinia.vuejs.org/)
- **Validation:** [Zod](https://zod.dev/)
- **Internationalization:** `@nuxtjs/i18n` (Supports German `de` and English `en`)
- **Persistence:** [Deno KV](https://deno.com/kv) (for production storage)
- **Observability:** OpenTelemetry (`@opentelemetry/api`)

### Architecture & Features

- **End-to-End Encryption:** Uses the Web Crypto API for client-side encryption of plans, ensuring that sensitive data is only readable by those with the correct link (inspired by Excalidraw).
- **Real-time Synchronization:** Leverages Nitro's `storage.watch` and Server-Sent Events (SSE) to push updates to clients instantly.
- **Mobile First:** Designed with a "kinetic" aesthetic, featuring smooth animations and a responsive bento-grid layout.
- **Multi-tenant Storage:** Plans are stored in Deno KV (or memory in dev) and retrieved via unique UUIDs.

## Building and Running

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Production & Deployment

```bash
# Standard Nuxt build
pnpm build

# Build specifically for Deno Deploy
pnpm build:deno

# Preview production build locally
pnpm preview
```

### Testing & Quality

```bash
# Run Vitest (API, App, and Workflow tests)
pnpm test

# Run accessibility tests (Playwright)
pnpm test:a11y

# Type checking
pnpm typecheck

# Linting & Formatting
pnpm lint
pnpm lint:fix
```

## Development Conventions

- **Code Style:** Uses `@antfu/eslint-config` for strict linting and formatting.
- **Pre-commit Hooks:** Husky and `lint-staged` run ESLint on every commit.
- **Client-Side Logic:** Heavy use of Nuxt composables (e.g., `useEncryption`, `useDecryption`) for client-only cryptographic operations.
- **Server API:** Located in `server/api/`, utilizing `eventHandler` and `zod` for request validation.
- **Testing Strategy:**
  - **API Tests:** Node environment, testing server endpoints.
  - **App Tests:** `happy-dom` environment, testing components and composables.
  - **Workflow Tests:** Integration tests for full user flows (e.g., create -> save -> edit).
- **i18n:** Localization files are stored in `i18n/i18n/`. The default language is German (`de`).

## Key Files

- `nuxt.config.ts`: Main configuration, including modules, storage drivers, and i18n settings.
- `app/composables/use-crypto.ts`: Core encryption/decryption logic.
- `server/api/[id].get.ts`: Real-time plan retrieval and SSE implementation.
- `deno.json`: Configuration for Deno runtime compatibility.
- `vitest.config.mts`: Multi-project Vitest configuration for different test environments.

## Task Management

Use `/dex` to break down complex work, track progress across sessions, and coordinate multi-step implementations.
