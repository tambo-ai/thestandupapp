# External Integrations

**Analysis Date:** 2026-03-03

## APIs & External Services

**Project Management:**
- Linear - Issue tracking and team management
  - SDK/Client: `@linear/sdk` v76.0.0
  - Auth: Header-based API key via `x-linear-api-key`
  - Routes: `/api/linear/team`, `/api/linear/search`, `/api/linear/cycle`, `/api/linear/risks`, `/api/linear/issues`
  - Key operations: List teams, fetch team members with issue stats, search issues, analyze risk indicators

**Source Control:**
- GitHub - Pull request and user management
  - API: REST v3 (`https://api.github.com`)
  - Auth: Header-based token via `x-github-token`
  - Routes: `/api/github/prs`, `/api/github/find-user`
  - Key operations: Search/list pull requests by repo/org/author, find users by email/name with org-aware matching
  - Org configuration: Optional `x-github-org` header for scoping searches and qualifying repo names

**AI Assistance:**
- Tambo AI - AI-powered assistant and component rendering
  - SDK/Client: `@tambo-ai/react` v1.0.1
  - Auth: API key via `NEXT_PUBLIC_TAMBO_API_KEY` environment variable
  - Features: Tool invocation (Linear, GitHub queries), component registration, streaming content, suggestions, voice input, MCP support

## Data Storage

**Databases:**
- Turso (SQLite-compatible)
  - Connection: `TURSO_DATABASE_URL` environment variable (`libsql://...`)
  - Auth token: `TURSO_AUTH_TOKEN` environment variable
  - Client: `@libsql/kysely-libsql` v0.4.1 (Kysely dialect)
  - ORM: Kysely v0.28.11
  - Usage: Session storage and user data persistence via better-auth

**File Storage:**
- Not detected - Local browser storage only (localStorage for encrypted tokens)

**Caching:**
- HTTP cache headers applied to API responses:
  - `/api/linear/team`: 300s (private, max-age=300)
  - `/api/linear/search`: 60s (private, max-age=60)
  - `/api/github/prs` and `/api/github/find-user`: 120-600s (private, max-age varies)

## Authentication & Identity

**Auth Provider:**
- Better Auth v1.4.19 - Custom authentication framework
  - Implementation: OAuth2 via Google
  - Database backend: Turso (SQLite)
  - Session management: Cookie-based via `better-auth/cookies`
  - Routes: `/api/auth/[...all]` (Next.js dynamic route handler)

**OAuth2:**
- Google
  - Client ID: `GOOGLE_CLIENT_ID` environment variable
  - Client secret: `GOOGLE_CLIENT_SECRET` environment variable
  - Used for account creation and login

**Token Management:**
- Client-side storage: localStorage with per-user encryption
  - GitHub token: `user-github-token::{userId}` (AES-GCM encrypted)
  - Linear API key: `user-linear-api-key::{userId}` (AES-GCM encrypted)
  - GitHub org: `user-github-org::{userId}` (encrypted)
  - Selected team: `user-selected-team::{userId}` (encrypted)
  - Filtered members: `user-filtered-members::{userId}` (encrypted)
  - Encryption key: Derived from userId via PBKDF2 (100,000 iterations, SHA-256)
  - Salt: `"tambo-standup-token-salt"`
  - File: `src/lib/user-tokens.ts`

## Monitoring & Observability

**Error Tracking:**
- Not detected - Console error logging only via `console.error()` in GitHub route handlers

**Logs:**
- Client-side: Console logging
- Server-side: No dedicated logging service configured

## CI/CD & Deployment

**Hosting:**
- Not detected in codebase (deployment target flexible - any Node.js 18+ environment)

**CI Pipeline:**
- Not detected - No GitHub Actions or CI configuration present

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_TAMBO_API_KEY` - Tambo AI API key (public, visible to client)
- `BETTER_AUTH_SECRET` - Authentication signing secret (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` - URL for auth redirects (e.g., `http://localhost:3000` for dev)
- `GOOGLE_CLIENT_ID` - OAuth app client ID
- `GOOGLE_CLIENT_SECRET` - OAuth app secret
- `TURSO_DATABASE_URL` - Turso database connection URL
- `TURSO_AUTH_TOKEN` - Turso authentication token

**Secrets location:**
- `.env.local` (local development, not committed)
- Runtime environment variables for production

## Webhooks & Callbacks

**Incoming:**
- OAuth2 callback: `/api/auth/[...all]` handles Google OAuth redirects via better-auth

**Outgoing:**
- Not detected - Application queries external services on-demand

## Header-Based Authentication

**Client Request Headers:**
- `x-linear-api-key` - Linear API key (passed by client, required for Linear routes)
- `x-github-token` - GitHub personal access token (passed by client, required for GitHub routes)
- `x-github-org` - Optional GitHub organization scope (passed by client or via query param)

**Server Implementation:**
- Middleware: `src/middleware.ts` validates session cookies via `better-auth/cookies`
- Route wrappers:
  - `withLinearClient()` in `src/lib/linear-client.ts` extracts and validates Linear API key
  - `withGitHubToken()` in `src/lib/github-client.ts` extracts and validates GitHub token
  - Both wrappers return 401 if credentials missing, 500 on request failure

---

*Integration audit: 2026-03-03*
