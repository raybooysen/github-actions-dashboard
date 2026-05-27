# Actions Dashboard

Monitor all your GitHub Actions workflow runs in a single view. Connect your GitHub account and see every build status, across every repository, updating in real time.

Inspired by TeamCity's build overview — failed builds surface to the top, running builds show live elapsed time, and smart polling keeps everything current without hammering the API.

## Features

- **Single pane of glass** — all repos, all workflow runs, one screen
- **Smart polling** — 10s for active builds, 30s for recently completed, 5m for idle repos
- **Zero storage** — no database, no sessions. Your OAuth token stays in your browser
- **Filter and search** — find repos by name, filter by status (running, failed, passed, queued)
- **Automatic sorting** — failed repos surface first, then running, then by recent activity
- **Accessibility** — skip-to-content, aria-live status updates, keyboard-navigable filters

## Quick Start (Local Development)

### 1. Create a GitHub OAuth App

Go to [GitHub Developer Settings](https://github.com/settings/developers) and create a **New OAuth App**:

| Field | Value |
|-------|-------|
| Application name | Actions Dashboard (dev) |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/auth/callback` |

Click **Register application**, then generate a **Client Secret**.

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your OAuth App credentials:

```
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_client_id_here
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Connect with GitHub**.

## Deploy to Production

### Vercel (recommended)

1. Push this repo to GitHub
2. Import it in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel Dashboard > Settings > Environment Variables:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `NEXT_PUBLIC_GITHUB_CLIENT_ID`
4. Create a **separate** GitHub OAuth App for production with the callback URL set to your Vercel domain:
   ```
   https://your-app.vercel.app/auth/callback
   ```
5. Deploy

Users just visit your site, click "Connect with GitHub", and authorize. No setup required on their end.

### Other platforms

Any platform that supports Next.js (Netlify, Railway, Render, self-hosted) works. Set the three environment variables and ensure the OAuth callback URL matches your domain.

## Architecture

```
Browser                          Next.js Server              GitHub
  |                                   |                        |
  |-- Click "Connect" -------------->|                        |
  |   redirect to github.com/login/oauth/authorize           |
  |                                   |                        |
  |<---- GitHub redirects with ?code=XXX -------------------- |
  |                                   |                        |
  |-- POST /api/auth/token {code} -->|                        |
  |                                  |-- exchange code ------>|
  |                                  |<-- access_token -------|
  |<-- { access_token } -------------|                        |
  |                                   |                        |
  |-- GET /user ------------------------------------------>  |
  |-- GET /user/repos ------------------------------------>  |
  |-- GET /repos/:owner/:repo/actions/runs --------------->  |
  |   (smart polling: 10s/30s/5m)                             |
```

- **One API route** (`/api/auth/token`) — exchanges OAuth code for token. This is the entire "backend".
- **Zero storage** — no database, no sessions. Token lives in `localStorage`.
- **Client-side data fetching** — TanStack Query with per-repo smart polling intervals.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Data | TanStack Query v5 |
| Auth | GitHub OAuth (browser + 1 API route) |
| Testing | Vitest, React Testing Library, MSW 2, Playwright |
| Fonts | Inter + JetBrains Mono |

## Testing

```bash
# Unit and integration tests
npx vitest run

# E2E tests (requires Playwright browsers)
npx playwright install chromium
npx playwright test

# Coverage report
npx vitest run --coverage
```

## Rate Limits

GitHub allows 5,000 API requests per hour for authenticated users. The smart polling strategy keeps usage well within this limit:

| Tier | When | Poll Interval | Example: 50 repos |
|------|------|--------------|-------------------|
| Active | Repo has running/queued builds | 10 seconds | 5 active repos = 30 req/min |
| Recent | Build finished < 5 min ago | 30 seconds | 10 recent repos = 20 req/min |
| Idle | Everything else | 5 minutes | 35 idle repos = 7 req/min |

**Worst case with 50 repos:** ~57 req/min = 3,420 req/hour (well under 5,000 limit).

## Scope and Permissions

The app requires the `repo` OAuth scope to read workflow runs from private repositories. This is a GitHub platform limitation — no fine-grained `actions:read` scope exists for OAuth Apps.

The scope grants broader access than strictly needed. This is disclosed to users on the login page. No write operations are performed — the app is read-only.

## License

MIT
