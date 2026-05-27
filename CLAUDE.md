# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## This is NOT the Next.js you know

Next.js 16 has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint (v9, flat config)
npx vitest run       # Unit/integration tests
npx vitest run src/components/StatusIndicator.test.tsx  # Single test file
npx vitest run --coverage  # Coverage report
npx playwright test  # E2E tests (requires dev server running)
npx playwright test e2e/dashboard.spec.ts  # Single E2E suite
```

Playwright requires browser install first: `npx playwright install chromium`

## Code style

- Use arrow functions for all TypeScript functions (including React components).
- Prefer `type` over `interface` for type declarations.

## Architecture

GitHub Actions dashboard — a Next.js 16 App Router app (React 19, TypeScript strict, Tailwind CSS v4). Zero server-side storage: the GitHub OAuth token lives in localStorage and all API calls happen client-side from the browser.

### Auth flow

1. Landing page (`/`) redirects to GitHub OAuth
2. `/auth/callback` receives the code, calls `POST /api/auth/token` (the only API route)
3. Server exchanges code for token using client secret, returns token to browser
4. Token stored in localStorage, all subsequent GitHub API calls made directly from browser

### Data fetching & polling

TanStack Query v5 manages all GitHub API state. Smart polling adjusts per-repo:
- **10s** — repos with running/queued workflows
- **30s** — repos with recently completed runs (< 5 min)
- **5 min** — idle repos

ETag caching (`src/lib/etag-cache.ts`) sends `If-None-Match` headers — 304 responses don't count against the GitHub rate limit (5,000 req/hour). Polling pauses when components scroll off-screen via `useVisibility` (IntersectionObserver).

### Key source paths

- `src/app/` — App Router pages and the single API route (`api/auth/token`)
- `src/components/` — React components. `DashboardShell` is the main container
- `src/hooks/` — `useAuth`, `useLatestRun`, `usePinnedRepos`, `useRepositories`, `useUser`, `useVisibility`
- `src/lib/` — `github-client.ts` (fetch wrapper + ETag), `polling.ts` (interval logic), `github-types.ts`
- `src/contexts/` — `RateLimitContext` (tracks X-RateLimit headers from every API response; exposes `useRateLimit`)

### Testing

- **Mandate**: ALL new components, hooks, and logic must have corresponding tests. Follow TDD (Red-Green-Refactor) whenever possible.
- **Unit/integration**: Vitest + React Testing Library + MSW for API mocking. Setup in `test/setup.tsx`, fixtures in `test/fixtures.ts`, custom render in `test/test-utils.tsx`.
- **E2E**: Playwright tests in `e2e/`. Use `seedAuth()` to inject token and `mockGitHubApi()` for route interception. Update E2E tests for every relevant code change.

### Path alias

`@/*` maps to `./src/*` (configured in both tsconfig.json and vitest.config.ts).

### Environment variables

Requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `NEXT_PUBLIC_GITHUB_CLIENT_ID`. See `.env.local.example`.

### Tailwind v4

No `tailwind.config.ts` — design tokens (custom colors for status states) are defined via `@theme` in `src/app/globals.css`. Uses `@tailwindcss/postcss` plugin.
