# Phase 1: WorkOS Auth Migration - Research

**Researched:** 2026-03-03
**Domain:** Authentication migration (Better Auth -> WorkOS AuthKit)
**Confidence:** HIGH

## Summary

This phase replaces Better Auth (Google OAuth) with WorkOS AuthKit for user authentication in a Next.js 15 App Router application. The `@workos-inc/authkit-nextjs` library (v2.15.0, released Feb 25, 2026) provides a mature, well-documented SDK specifically designed for Next.js App Router with server components, middleware-based session management, and edge runtime support. The library handles session cookies, token refresh, and sign-out entirely -- no custom session logic is needed.

The migration touches 6 source files directly (middleware, auth libs, login page, app page, user header, API auth route), plus `package.json` and env configuration. The key architectural shift is moving from client-side session checks (`authClient.useSession()`) to server-side session access via `withAuth()` or `getUser()`, which aligns with the CONTEXT.md decision to pass user data as server component props rather than using client hooks.

**Primary recommendation:** Use `authkitMiddleware()` with `middlewareAuth.enabled: true` and explicit `unauthenticatedPaths` for the landing page. Use `withAuth({ ensureSignedIn: true })` in the `/app` server component to fetch user data and pass it as props to the client-side AppShell.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep the existing custom branded login page design (headline, feature pills, mock dashboard preview)
- Move the branded page from `/login` to `/` as a public landing page
- Button is contextual: "Sign in" for unauthenticated users (triggers WorkOS AuthKit flow), "Go to app" for authenticated users (links to `/app`)
- Auth state on landing page detected server-side via `getUser()` -- no loading flicker
- No onboarding screen after first sign-up -- users land straight in the app
- `/` -- public landing page (always visible, contextual button)
- `/app` -- protected app route (server component fetches user, passes to client AppShell)
- `/api/auth/callback` -- WorkOS AuthKit callback route (replaces old `/api/auth/[...all]` Better Auth handler)
- Delete `/login` route entirely
- Use WorkOS `getUser()` server-side in `/app/page.tsx` (server component)
- Pass user data as props to the client-side AppShell component
- No client-side session hook or `/api/me` endpoint -- server components handle session
- `page.tsx` splits into: server component (fetches user) + client component (interactive app)
- Old encrypted localStorage tokens naturally become inaccessible (new WorkOS user IDs)
- No explicit migration or cleanup -- Phase 3 replaces token storage with WorkOS Pipes anyway
- localStorage left intact on logout
- Drop Better Auth tables (user, session, account, verification) as part of this phase
- Logout button visible in the user header area (UserHeader component)
- Immediate logout on click -- no confirmation dialog
- After logout, redirect to `/` landing page
- LocalStorage not cleared on logout

### Claude's Discretion
- Button label text for login button (can be "Sign in" or "Continue with Google" or generic)
- Exact WorkOS AuthKit configuration details (providers, session duration)
- Error handling for failed auth flows
- Loading states during auth redirects

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up and sign in via WorkOS AuthKit | `authkitMiddleware()` handles redirect to WorkOS hosted UI; `handleAuth()` processes callback; `getSignInUrl()` generates sign-in URL for button |
| AUTH-02 | User session persists across browser refreshes | Session stored in encrypted HTTP-only cookie (`wos-session`); `WORKOS_COOKIE_MAX_AGE` defaults to 400 days; automatic token refresh via middleware |
| AUTH-03 | User can log out from any page | `signOut()` server action clears cookie + redirects to WorkOS logout endpoint; supports `returnTo` for custom redirect to `/` |
| AUTH-04 | User is redirected to intended destination after login | Middleware captures pre-auth URL; `handleAuth({ returnPathname })` controls post-login redirect; composable middleware stores intended path |
| AUTH-05 | Better Auth is fully removed from the codebase | Complete list of files to delete/modify documented in Architecture Patterns section below |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@workos-inc/authkit-nextjs` | ^2.15.0 | Authentication, session management, middleware | Official WorkOS SDK for Next.js App Router; handles cookie encryption, token refresh, server component integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@workos-inc/node` | ^8.x | WorkOS Node SDK (peer dependency) | Automatically installed as dependency of authkit-nextjs; provides User type definitions |

### Removed
| Library | Reason |
|---------|--------|
| `better-auth` | Replaced entirely by WorkOS AuthKit |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `authkitMiddleware` with `middlewareAuth` | Per-page `getUser({ ensureSignedIn: true })` | Middleware approach is more secure (centralized, no forgotten pages); per-page gives more granular control. Use middleware for this project since most routes are protected. |
| `withAuth()` | `getUser()` | Both return same data. `withAuth()` can wrap a component directly; `getUser()` is called standalone. For this project, `withAuth()` in `/app/page.tsx` server component is cleaner. |

**Installation:**
```bash
npm install @workos-inc/authkit-nextjs
npm uninstall better-auth
```

## Architecture Patterns

### Recommended Project Structure After Migration
```
src/
  app/
    page.tsx                          # Public landing page (server component, uses withAuth)
    app/
      page.tsx                        # Protected app route (server component, uses withAuth)
      app-shell.tsx                   # Client component (receives user as props, "use client")
    api/
      auth/
        callback/
          route.ts                    # WorkOS callback handler (handleAuth)
      github/                         # Unchanged
      linear/                         # Unchanged
    layout.tsx                        # Root layout with AuthKitProvider
    globals.css                       # Unchanged
  components/
    user-header.tsx                   # Updated: signOut via server action
    ...                               # Other components unchanged
  lib/
    auth-actions.ts                   # NEW: Server actions (signOut wrapper)
    tambo.ts                          # Unchanged
    user-tokens.ts                    # Unchanged (Phase 3 removes this)
    thread-hooks.ts                   # Unchanged
    utils.ts                          # Unchanged
  middleware.ts                       # WorkOS authkitMiddleware
```

### Files to Delete
- `src/lib/auth.ts` (Better Auth server config)
- `src/lib/auth-client.ts` (Better Auth client)
- `src/app/api/auth/[...all]/route.ts` (Better Auth catch-all route)
- `src/app/login/` directory (content moves to `src/app/page.tsx`)

### Files to Create
- `src/app/api/auth/callback/route.ts` (WorkOS callback handler)
- `src/app/app/page.tsx` (protected server component for `/app`)
- `src/app/app/app-shell.tsx` (client component, extracted from current `page.tsx`)
- `src/lib/auth-actions.ts` (server actions for signOut)

### Files to Modify
- `src/middleware.ts` (replace Better Auth with WorkOS authkitMiddleware)
- `src/app/page.tsx` (convert to server component landing page)
- `src/app/layout.tsx` (add AuthKitProvider wrapper)
- `src/components/user-header.tsx` (replace authClient.useSession/signOut with props + server action)
- `package.json` (swap dependencies)
- `example.env.local` (replace Better Auth vars with WorkOS vars)

### Pattern 1: Middleware with Protected Routes
**What:** Use `authkitMiddleware` with `middlewareAuth.enabled: true` to protect all routes by default, with explicit public paths.
**When to use:** When most of the app is protected and only a few routes are public.
**Example:**
```typescript
// src/middleware.ts
// Source: https://github.com/workos/authkit-nextjs README
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/api/auth/callback'],
  },
});

export const config = {
  matcher: [
    '/',
    '/app/:path*',
    '/api/auth/callback',
  ],
};
```

### Pattern 2: Server Component with User Data
**What:** Use `withAuth()` in server components to get the authenticated user, then pass data as props to client components.
**When to use:** For the `/app` protected route and the `/` landing page.
**Example:**
```typescript
// src/app/app/page.tsx (protected route)
// Source: https://github.com/workos/next-authkit-example
import { withAuth } from '@workos-inc/authkit-nextjs';
import { AppShell } from './app-shell';

export default async function AppPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <AppShell
      userId={user.id}
      userName={`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
      userEmail={user.email}
      userImage={user.profilePictureUrl ?? undefined}
    />
  );
}
```

### Pattern 3: Landing Page with Conditional Auth Button
**What:** Server component that checks auth state and renders contextual button.
**When to use:** For the `/` public landing page.
**Example:**
```typescript
// src/app/page.tsx (public landing)
import { withAuth, getSignInUrl } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';

export default async function LandingPage() {
  const { user } = await withAuth();
  const signInUrl = user ? null : await getSignInUrl();

  return (
    <div>
      {/* ... existing branded landing page content ... */}
      {user ? (
        <Link href="/app">Go to app</Link>
      ) : (
        <a href={signInUrl!}>Sign in</a>
      )}
    </div>
  );
}
```

### Pattern 4: Sign Out via Server Action
**What:** Create a server action file to wrap `signOut()`, importable from client components.
**When to use:** For the UserHeader logout button.
**Example:**
```typescript
// src/lib/auth-actions.ts
"use server";

import { signOut } from "@workos-inc/authkit-nextjs";

export async function logout() {
  await signOut({ returnTo: "/" });
}
```

```typescript
// In client component (user-header.tsx)
"use client";

import { logout } from "@/lib/auth-actions";

// Use in a form:
<form action={logout}>
  <button type="submit">Sign out</button>
</form>
```

### Pattern 5: AuthKitProvider in Layout
**What:** Wrap the root layout with `AuthKitProvider` for client-side auth edge cases.
**When to use:** Always -- provides protections for auth edge cases.
**Example:**
```typescript
// src/app/layout.tsx
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthKitProvider>{children}</AuthKitProvider>
      </body>
    </html>
  );
}
```

### Pattern 6: Callback Route Handler
**What:** Simple route that handles the OAuth callback from WorkOS.
**When to use:** Required -- processes the authorization code after WorkOS login.
**Example:**
```typescript
// src/app/api/auth/callback/route.ts
import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth({ returnPathname: '/app' });
```

### Anti-Patterns to Avoid
- **Using `authClient.useSession()` for auth checks:** WorkOS authkit-nextjs is server-first. Do not create client-side session polling. Use `withAuth()` in server components or `useAuth()` from `AuthKitProvider` only when absolutely needed.
- **Catch-all middleware matcher:** Never use `/((?!_next/static|...).)` as the matcher -- it intercepts static assets and breaks Tailwind CSS v4 styling. Use explicit matchers.
- **Importing `signOut` directly in client components:** `signOut()` is a server action marked `'use server'`. Import it via a server action file, or use it in a form action with inline `'use server'` directive.
- **Forgetting `handleAuthkitHeaders` in composable middleware:** If using `authkit()` composable pattern instead of `authkitMiddleware()`, you must always call `handleAuthkitHeaders()` to forward auth headers and prevent session leakage.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie encryption | Custom cookie encryption/signing | `authkitMiddleware` + `WORKOS_COOKIE_PASSWORD` | Handles encryption, rotation, and HTTP-only secure cookies |
| Token refresh | Manual JWT refresh logic | `authkitMiddleware` automatic refresh | Middleware refreshes expired tokens transparently on every request |
| OAuth callback handling | Custom authorization code exchange | `handleAuth()` route handler | Handles code exchange, session creation, redirect, error handling |
| Sign-in URL generation | Manual URL construction with PKCE | `getSignInUrl()` / `getSignUpUrl()` | Handles PKCE, state parameter, redirect URI |
| Sign-out flow | Cookie deletion + redirect | `signOut({ returnTo })` | Handles cookie cleanup, WorkOS session revocation, redirect |
| Protected route checks | Custom middleware auth checks | `middlewareAuth.enabled: true` | Centralized, tested, handles edge cases |

**Key insight:** WorkOS AuthKit is a complete auth solution. The entire auth surface area (login, callback, session, refresh, logout, middleware) is handled by 5 library functions. Custom logic is only needed for app-specific concerns like "which page to redirect to."

## Common Pitfalls

### Pitfall 1: Catch-All Middleware Matcher Breaks Tailwind v4
**What goes wrong:** Using a broad matcher like `/((?!_next/static|_next/image|favicon.ico).*)` intercepts static asset requests, which breaks Tailwind CSS v4 (which uses `/app.css` route).
**Why it happens:** Tailwind v4 serves CSS through Next.js routes that get caught by overly broad matchers.
**How to avoid:** Use explicit route matchers: `['/', '/app/:path*', '/api/auth/callback']`. Only match routes that actually need auth processing.
**Warning signs:** Styles disappear after adding middleware; 303/307 redirects on CSS requests.

### Pitfall 2: Client-Side Session State After Migration
**What goes wrong:** Existing `authClient.useSession()` calls return undefined/null after removing Better Auth, causing blank screens or hydration errors.
**Why it happens:** The old session hook (`better-auth/react`) is removed but not all references are updated.
**How to avoid:** Grep for ALL references: `authClient`, `useSession`, `better-auth`, `getSessionCookie`, `auth-client`. The full list of affected files is documented in this research. Pass user data from server components as props instead.
**Warning signs:** `Module not found: better-auth` build errors; blank AppShell on load.

### Pitfall 3: signOut Not Working from Client Component
**What goes wrong:** Calling `signOut()` directly in a "use client" component fails because it's a server action.
**Why it happens:** `signOut` from `@workos-inc/authkit-nextjs` is marked `'use server'` and cannot be imported into client component modules directly (it can only be used in a server action context).
**How to avoid:** Create a separate server action file (`src/lib/auth-actions.ts`) with `"use server"` at the top that exports a `logout` function wrapping `signOut()`. Import and use this in client components via form actions.
**Warning signs:** Runtime error about server actions; logout button does nothing.

### Pitfall 4: Forgetting to Configure WorkOS Dashboard Redirects
**What goes wrong:** Auth callback fails with redirect_uri mismatch; signOut redirects to WorkOS default page instead of app.
**Why it happens:** WorkOS requires explicit redirect URI configuration in the dashboard. `NEXT_PUBLIC_WORKOS_REDIRECT_URI` must match what's configured in the WorkOS dashboard. Sign-out redirect must also be configured.
**How to avoid:** Configure in WorkOS dashboard: (1) Add `http://localhost:3000/api/auth/callback` as redirect URI, (2) Set default logout URI to `http://localhost:3000/`.
**Warning signs:** 400 errors from WorkOS; redirect to unexpected URLs after login/logout.

### Pitfall 5: TamboProvider userToken After Auth Migration
**What goes wrong:** TamboProvider currently receives `session.session.token` from Better Auth. After migration, this token source no longer exists.
**Why it happens:** Better Auth provided a session token; WorkOS uses a different session mechanism.
**How to avoid:** The `userToken` prop for TamboProvider may need to be the WorkOS access token from `withAuth()` result, or a user identifier. Check what TamboProvider actually requires -- it may accept a user ID or any unique identifier rather than a specific auth token format. The `accessToken` from the `UserInfo` type could serve this purpose.
**Warning signs:** Tambo API calls fail; "unauthorized" errors in conversation.

### Pitfall 6: UserHeader Receiving User Data
**What goes wrong:** UserHeader currently gets user data from `authClient.useSession()`. After migration, there is no client-side session hook equivalent being used (per CONTEXT.md: "No client-side session hook").
**Why it happens:** The decision is to pass user data from server components via props.
**How to avoid:** Refactor UserHeader to accept user data as props (name, email, image) from the parent server component. Or use `useAuth()` hook from `AuthKitProvider` if needed for client-side access -- but the CONTEXT.md decision prefers the props approach.
**Warning signs:** UserHeader shows "Loading..." or "?" avatar permanently.

## Code Examples

### Complete Middleware Configuration
```typescript
// src/middleware.ts
// Source: https://github.com/workos/authkit-nextjs README
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/api/auth/callback'],
  },
});

export const config = {
  matcher: [
    '/',
    '/app/:path*',
    '/api/auth/callback',
  ],
};
```

### Complete Callback Route
```typescript
// src/app/api/auth/callback/route.ts
// Source: https://github.com/workos/authkit-nextjs README
import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth({ returnPathname: '/app' });
```

### Server Action for Logout
```typescript
// src/lib/auth-actions.ts
"use server";

import { signOut } from "@workos-inc/authkit-nextjs";

export async function logout() {
  await signOut({ returnTo: "/" });
}
```

### UserInfo Type Shape (from WorkOS)
```typescript
// What withAuth() returns (source: authkit-nextjs/src/interfaces.ts)
interface UserInfo {
  user: User;           // WorkOS User object
  sessionId: string;
  organizationId?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  entitlements?: string[];
  featureFlags?: string[];
  impersonator?: Impersonator;
  accessToken: string;  // JWT access token
}

// User object properties (from @workos-inc/node)
interface User {
  id: string;                    // WorkOS user ID (e.g., "user_01H...")
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Environment Variables
```bash
# .env.local (replaces Better Auth vars)
WORKOS_CLIENT_ID=client_01H...           # From WorkOS dashboard
WORKOS_API_KEY=sk_test_...               # From WorkOS dashboard
WORKOS_COOKIE_PASSWORD=a-32-char-or-longer-random-string  # Session encryption
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Keep existing
NEXT_PUBLIC_TAMBO_API_KEY=...
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...

# Remove
# BETTER_AUTH_SECRET (no longer needed)
# BETTER_AUTH_URL (no longer needed)
# GOOGLE_CLIENT_ID (no longer needed -- WorkOS manages providers)
# GOOGLE_CLIENT_SECRET (no longer needed)
```

### Complete Better Auth Reference Inventory
Every file referencing Better Auth that must be modified or deleted:
```
DELETE:
  src/lib/auth.ts                      - betterAuth server config
  src/lib/auth-client.ts               - createAuthClient client
  src/app/api/auth/[...all]/route.ts   - toNextJsHandler route
  src/app/login/page.tsx               - login page (content moves to /)

MODIFY:
  src/middleware.ts                     - getSessionCookie -> authkitMiddleware
  src/app/page.tsx                     - authClient.useSession -> withAuth props
  src/components/user-header.tsx       - authClient.useSession/signOut -> props + server action
  src/app/layout.tsx                   - add AuthKitProvider wrapper
  package.json                         - remove better-auth, add @workos-inc/authkit-nextjs
  example.env.local                    - replace env vars
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `better-auth` with Google OAuth | WorkOS AuthKit managed auth | Project decision | Full session management in middleware; hosted login UI |
| Client-side `useSession()` hook | Server-side `withAuth()` / `getUser()` | authkit-nextjs v1+ | No client session polling; server-rendered auth state |
| Custom middleware session check | `authkitMiddleware()` with `middlewareAuth` | authkit-nextjs v2+ | Declarative route protection; automatic token refresh |
| Per-page auth guards | Middleware-level auth + `unauthenticatedPaths` | authkit-nextjs v2+ | Secure by default; whitelist public routes |

**Deprecated/outdated:**
- `getUser()` standalone function: Still works but `withAuth()` is the recommended equivalent (same return type, can also wrap components)
- Older `authkit-nextjs` versions used `redirect` option instead of `middlewareAuth` -- use `middlewareAuth` pattern
- `proxy.ts` file is for Next.js 16+ only; for Next.js 15 use `middleware.ts`

## Open Questions

1. **TamboProvider userToken source**
   - What we know: Currently receives `session.session.token` from Better Auth. WorkOS provides an `accessToken` JWT in the `UserInfo` result.
   - What's unclear: Whether TamboProvider specifically requires a Better Auth session token or if any unique user identifier works. The `accessToken` from WorkOS or `user.id` might be sufficient.
   - Recommendation: Try passing `user.id` as `userToken` first. If Tambo requires a JWT, pass the WorkOS `accessToken`. Test by verifying Tambo conversation threads work after migration.

2. **Better Auth database tables cleanup**
   - What we know: Better Auth creates tables (user, session, account, verification) in Turso. CONTEXT.md says to drop them.
   - What's unclear: Whether these tables are managed by Better Auth migrations or were manually created. Whether Kysely has migration scripts for them.
   - Recommendation: Check if any migration files exist. If not, write a simple SQL script to DROP TABLE the Better Auth tables. Verify table names by checking the database or Better Auth documentation.

3. **WorkOS dashboard configuration**
   - What we know: Need to configure redirect URI and sign-out redirect in WorkOS dashboard. Need WORKOS_CLIENT_ID and WORKOS_API_KEY.
   - What's unclear: Whether the user has already set up a WorkOS account and project.
   - Recommendation: Include dashboard configuration as a prerequisite step in the plan. Document exact URLs to configure.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | None -- see Wave 0 |
| Quick run command | `npm run build` (type-check + build) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | User can sign in via WorkOS AuthKit | manual | Manual: visit `/`, click sign in, complete WorkOS flow, verify redirect to `/app` | N/A |
| AUTH-02 | Session persists across browser refreshes | manual | Manual: sign in, close tab, reopen, verify still authenticated at `/app` | N/A |
| AUTH-03 | User can log out from any page | manual | Manual: click logout in UserHeader, verify redirect to `/`, verify `/app` redirects to WorkOS login | N/A |
| AUTH-04 | Redirect to intended destination after login | manual | Manual: visit `/app` while unauthenticated, complete login, verify lands on `/app` | N/A |
| AUTH-05 | Better Auth fully removed | unit-like | `grep -r "better-auth\|betterAuth\|auth-client\|getSessionCookie" src/ --include="*.ts" --include="*.tsx" && echo "FAIL" \|\| echo "PASS"` | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors, missing imports)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full build + lint + manual auth flow test

### Wave 0 Gaps
- No test framework is configured in this project. CLAUDE.md confirms: "No test framework is currently configured."
- AUTH-01 through AUTH-04 require manual testing (browser-based OAuth flow). Automated testing of OAuth flows requires browser automation (Playwright/Cypress) which is out of scope for this phase.
- AUTH-05 can be validated with a grep command as shown above.
- The build command (`npm run build`) serves as a strong type-check gate -- it will catch any remaining Better Auth imports that would cause module-not-found errors.

## Sources

### Primary (HIGH confidence)
- [authkit-nextjs GitHub README](https://github.com/workos/authkit-nextjs) - Complete SDK documentation including middleware, withAuth, signOut, handleAuth, environment variables, all TypeScript interfaces
- [authkit-nextjs/src/interfaces.ts](https://github.com/workos/authkit-nextjs/blob/main/src/interfaces.ts) - TypeScript type definitions for UserInfo, Session, AccessToken, AuthkitMiddlewareOptions
- [authkit-nextjs/src/auth.ts](https://github.com/workos/authkit-nextjs/blob/main/src/auth.ts) - Source code for signOut, getSignInUrl, getSignUpUrl functions
- [next-authkit-example](https://github.com/workos/next-authkit-example) - Official example app showing withAuth, middleware, callback patterns
- [authkit-nextjs releases](https://github.com/workos/authkit-nextjs/releases) - Version history confirming v2.15.0 (Feb 25, 2026) as latest

### Secondary (MEDIUM confidence)
- [WorkOS AuthKit Next.js Docs](https://workos.com/docs/authkit/nextjs) - Official setup guide (partially accessed)
- [WorkOS AuthKit SDK Reference](https://workos.com/docs/sdks/authkit-nextjs) - SDK function reference
- [Next.js auth guide 2026 blog post](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) - WorkOS blog on Next.js App Router auth patterns

### Tertiary (LOW confidence)
- [Nir Tamir comprehensive guide](https://www.nirtamir.com/articles/authentication-with-workos-in-next-js-a-comprehensive-guide/) - Third-party guide (useful for patterns, verify against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official WorkOS SDK, verified v2.15.0 via GitHub releases, well-documented API
- Architecture: HIGH - Patterns verified against official example repo and source code; middleware + withAuth pattern is explicitly documented
- Pitfalls: HIGH - Tailwind v4 matcher issue documented in official README; signOut server action pattern confirmed in source code
- Migration scope: HIGH - Complete grep of existing codebase confirms exactly which files reference Better Auth

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable library, monthly releases)
