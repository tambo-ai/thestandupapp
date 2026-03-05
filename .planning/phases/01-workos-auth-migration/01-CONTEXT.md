# Phase 1: WorkOS Auth Migration - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace Better Auth with WorkOS AuthKit for login, sessions, and middleware. Users can sign in and out via WorkOS AuthKit, sessions persist across browser refreshes, and all Better Auth code is removed. This phase also restructures routing to introduce a public landing page at `/` with the protected app at `/app`.

</domain>

<decisions>
## Implementation Decisions

### Login Experience
- Keep the existing custom branded login page design (headline, feature pills, mock dashboard preview)
- Move the branded page from `/login` to `/` as a public landing page
- Button is contextual: "Sign in" for unauthenticated users (triggers WorkOS AuthKit flow), "Go to app" for authenticated users (links to `/app`)
- Auth state on landing page detected server-side via `getUser()` — no loading flicker
- No onboarding screen after first sign-up — users land straight in the app

### Routing Restructure
- `/` — public landing page (always visible, contextual button)
- `/app` — protected app route (server component fetches user, passes to client AppShell)
- `/api/auth/callback` — WorkOS AuthKit callback route (replaces old `/api/auth/[...all]` Better Auth handler)
- Delete `/login` route entirely

### Session Access Pattern
- Use WorkOS `getUser()` server-side in `/app/page.tsx` (server component)
- Pass user data as props to the client-side AppShell component
- No client-side session hook or `/api/me` endpoint — server components handle session
- `page.tsx` splits into: server component (fetches user) + client component (interactive app)

### Token Migration
- Old encrypted localStorage tokens naturally become inaccessible (new WorkOS user IDs won't derive the same encryption keys)
- No explicit migration or cleanup — Phase 3 replaces token storage with WorkOS Pipes anyway
- localStorage left intact on logout (if same user logs back in, their settings persist)

### Database Cleanup
- Drop Better Auth tables (user, session, account, verification) as part of this phase
- Clean break before Phase 2 creates new multi-tenant schema

### Logout Behavior
- Logout button visible in the user header area (UserHeader component)
- Immediate logout on click — no confirmation dialog
- After logout, redirect to `/` landing page
- LocalStorage not cleared on logout

### Claude's Discretion
- Button label text for login button (can be "Sign in" or "Continue with Google" or generic — whatever fits WorkOS AuthKit capabilities)
- Exact WorkOS AuthKit configuration details (providers, session duration)
- Error handling for failed auth flows
- Loading states during auth redirects

</decisions>

<specifics>
## Specific Ideas

- Landing page should feel like a product homepage — the current `/login` design already achieves this with the hero copy, feature pills, and mock dashboard
- The auth flow should be: Landing page (`/`) → click "Sign in" → WorkOS hosted auth → callback → redirect to `/app`
- Authenticated users visiting `/` see the same landing page but with "Go to app" button instead of "Sign in"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/login/page.tsx`: Current branded login page — move to `src/app/page.tsx` with contextual button logic
- `src/components/user-header.tsx`: UserHeader component — add logout button here
- `src/lib/user-tokens.ts`: Token storage — unchanged in this phase but userId derivation will use WorkOS IDs going forward

### Established Patterns
- Middleware pattern (`src/middleware.ts`): Currently checks Better Auth session cookie — replace with WorkOS `authkitMiddleware`
- API route wrapper pattern (`withLinearClient`, `withGitHubToken`): Not affected by auth change — tokens still come via headers
- TamboProvider setup in the app shell: Needs user data passed from server component instead of `useSession()`

### Integration Points
- `src/middleware.ts` — Replace `getSessionCookie` from Better Auth with WorkOS authkit middleware
- `src/app/page.tsx` — Split into server component (getUser) + client component (AppShell)
- `src/app/api/auth/[...all]/route.ts` — Delete and replace with `/api/auth/callback/route.ts`
- `src/lib/auth.ts` and `src/lib/auth-client.ts` — Delete entirely
- `package.json` — Remove `better-auth` dependency, add `@workos-inc/authkit-nextjs`
- `.env` — Remove Google OAuth vars, add WorkOS API key + client ID

### Files to Delete
- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/app/login/page.tsx` (content moves to `src/app/page.tsx`)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-workos-auth-migration*
*Context gathered: 2026-03-03*
