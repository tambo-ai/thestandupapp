# Phase 3: WorkOS Pipes Connections - Research

**Researched:** 2026-03-03
**Domain:** WorkOS Pipes OAuth integration, React widget embedding, server-side token management
**Confidence:** HIGH

## Summary

WorkOS Pipes is a managed OAuth service that handles the full OAuth flow, token storage, and automatic token refresh for third-party providers. Both GitHub and Linear are confirmed supported providers. The integration has two parts: (1) a React `<Pipes />` widget from `@workos-inc/widgets` that renders an embedded UI for users to connect/disconnect/reauthorize accounts, and (2) a server-side `workos.pipes.getAccessToken()` call that retrieves fresh access tokens on demand without ever exposing them to the client.

The existing codebase uses `@workos-inc/authkit-nextjs` (v2.15.0) which bundles `@workos-inc/node` (v8.8.0). The `getWorkOS()` export provides a singleton `WorkOS` instance with `workos.pipes.getAccessToken()` already available server-side. The Pipes widget needs `@workos-inc/widgets` (plus peer dependencies `@radix-ui/themes` and `@tanstack/react-query`) and accepts an `authToken` prop that can be either a backend-generated widget token or a `getAccessToken` function from AuthKit. Since `AuthKitProvider` already wraps the app in `layout.tsx`, the `useAccessToken` hook from `@workos-inc/authkit-nextjs/components` is available to feed the widget.

**Primary recommendation:** Install `@workos-inc/widgets` with peers, embed the `<Pipes />` widget in a reworked modal, use `getWorkOS().pipes.getAccessToken()` in API routes to replace header-based token passing, and delete `user-tokens.ts` and all `getTokenHeaders()` call sites.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Rework existing `settings-modal.tsx` -- keep as modal, not a new page or panel
- Modal contains only GitHub and Linear connection cards -- no other settings
- Remove the Linear team selector and member filter from the modal (separate concerns for Phase 4+)
- Remove the GitHub organization text input field
- Title stays "Connect your accounts", no subtitle
- Triggered via existing gear icon in UserHeader component
- MCP config modal stays separate (not combined)
- Each card shows: provider icon + name, connected account username/email, status indicator, action button (Connect / Disconnect / Reconnect)
- New users with no connections see an inline message in the chat/canvas area
- Message names both providers specifically: "Connect your GitHub and Linear accounts to get started"
- Message includes a button that opens the connections modal
- Text + button only -- no illustrations or provider icons
- Prompt auto-disappears once the user connects at least one account
- At least one connection required to use the app meaningfully
- If user queries the AI with no connections, AI responds conversationally explaining they need to connect accounts
- No special messaging for returning users who had old localStorage tokens -- treat as new
- Two small generic colored dots in the user header (one per provider)
- Colors: green = connected, gray = not connected, amber = needs reauthorization
- Tooltip on hover reveals which provider and its status
- Dots are clickable -- opens the connections modal
- Status checked on app load and after connections modal is closed
- Disconnect requires inline confirmation within the card ("Are you sure? [Yes] [Cancel]" replaces the Disconnect button)
- No separate confirmation modal (avoid modal-on-modal)
- After disconnect, the card stays visible showing "Not connected" with a Connect button
- When a connection is in error state, the action button changes to "Reconnect"
- Clicking Reconnect triggers the same OAuth flow as initial connect
- Amber dot in header signals the issue; tooltip says which provider needs reauth
- If an AI query fails mid-conversation due to broken connection, AI explains it conversationally in the response

### Claude's Discretion
- Connect button mechanism (redirect-based OAuth vs embedded Pipes widget -- pick based on WorkOS Pipes SDK capabilities)
- Server-side token retrieval pattern (how API routes get tokens from WorkOS Pipes instead of request headers)
- Exact card layout, spacing, and styling within the modal
- How connection status is fetched server-side (API route design)
- Error handling for failed OAuth flows
- Loading states during connect/disconnect operations

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONN-01 | User can connect their GitHub account via WorkOS Pipes widget | Pipes widget `<Pipes />` handles the full OAuth flow. GitHub is a confirmed provider. Widget embedded in reworked modal. |
| CONN-02 | User can connect their Linear account via WorkOS Pipes widget | Linear is a confirmed Pipes provider (official tutorial exists). Same widget handles Linear. |
| CONN-03 | User can see the status of their connected accounts (connected/disconnected/needs reauth) | `getAccessToken()` returns `{ active: true, accessToken }` or `{ active: false, error: 'not_installed' | 'needs_reauthorization' }`. API route maps this to connection status. |
| CONN-04 | User can reauthorize a broken connection via Pipes widget | Widget natively handles reauthorization flows. Reconnect button reopens/re-triggers the widget. |
| CONN-05 | User can disconnect an account | Widget supports disconnect natively. Connection row in DB updated/removed. |
| CONN-06 | New user sees a prompt to connect accounts on first use | Server-side connection status query in page.tsx, passed as prop. Inline prompt component in chat area. |
| CONN-07 | Connected account tokens are managed server-side via WorkOS Pipes (never in localStorage) | `getWorkOS().pipes.getAccessToken({ provider, userId })` called in API routes. Tokens never sent to client. |
| CONN-08 | Client-side encrypted token storage (user-tokens.ts) is fully removed | Delete `user-tokens.ts` (156 lines), remove all `getTokenHeaders()` imports, update `useFetchJSON`, `tambo.ts`, `member-filter.ts`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@workos-inc/node` | 8.8.0 | Server-side WorkOS SDK (Pipes, Widgets token generation) | Already installed as transitive dep of authkit-nextjs. Provides `workos.pipes.getAccessToken()` |
| `@workos-inc/widgets` | ^1.5.0 | React Pipes widget component | Official WorkOS React widget. Handles connect/disconnect/reauth UI |
| `@workos-inc/authkit-nextjs` | ^2.15.0 | Auth, session, `getWorkOS()`, `useAccessToken` hook | Already installed. Provides the singleton WorkOS instance and client-side access tokens |
| `@radix-ui/themes` | ^3.2.0 | Peer dependency of @workos-inc/widgets | Required by widgets package for UI styling |
| `@tanstack/react-query` | ^5.x | Peer dependency of @workos-inc/widgets | Required by widgets package for data fetching/caching |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-tooltip` | ^1.2.7 | Status dot tooltips in UserHeader | Already installed. Use for hover tooltips showing provider name and status |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pipes widget for connect UI | Custom redirect-based OAuth flow | Widget handles all OAuth complexity, error states, reauth. Custom would require building OAuth redirect handlers, callback routes, and state management. Use the widget. |
| `workos.widgets.getToken()` for widget auth | `useAccessToken` from authkit-nextjs | Widget token approach requires server-side token generation with scopes. But the Pipes widget scope is NOT in the current `WidgetScope` type (only `widgets:users-table:manage` etc. exist). The access token approach via `useAccessToken` is simpler and confirmed to work with Pipes. **Use `useAccessToken`**. |

**Installation:**
```bash
npm install @workos-inc/widgets @radix-ui/themes @tanstack/react-query
```

**CSS Imports (required in globals.css or layout):**
```css
@import '@radix-ui/themes/styles.css';
@import '@workos-inc/widgets/styles.css';
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── connections/
│   │   │   └── status/route.ts   # GET: returns connection status for current user
│   │   ├── github/               # Existing -- update withGitHubToken to use Pipes
│   │   └── linear/               # Existing -- update withLinearClient to use Pipes
│   └── app/
│       └── page.tsx              # Add connection status query, pass to AppShell
├── components/
│   ├── connections-modal.tsx      # Replaces settings-modal.tsx -- Pipes widget + cards
│   ├── connection-prompt.tsx      # First-use onboarding message in chat area
│   └── user-header.tsx           # Add status dots, keep gear icon
├── lib/
│   ├── workos-server.ts          # Server-side WorkOS helpers (getAccessToken, connection status)
│   ├── github-client.ts          # Updated: token from Pipes, not headers
│   ├── linear-client.ts          # Updated: token from Pipes, not headers
│   └── db.ts                     # Existing -- connections table already defined
```

### Pattern 1: Server-Side Token Retrieval via Pipes
**What:** API routes call `getWorkOS().pipes.getAccessToken()` to get fresh tokens instead of reading from request headers.
**When to use:** Every API route that needs a GitHub or Linear token.
**Example:**
```typescript
// Source: WorkOS Node SDK v8.8.0 type definitions + official tutorials
import { getWorkOS } from '@workos-inc/authkit-nextjs';
import { withAuth } from '@workos-inc/authkit-nextjs';

async function getProviderToken(provider: 'github' | 'linear', userId: string) {
  const workos = getWorkOS();
  const result = await workos.pipes.getAccessToken({
    provider,
    userId,
    // organizationId is optional, omit for now (no WorkOS orgs yet)
  });

  if (!result.active) {
    // result.error is 'not_installed' | 'needs_reauthorization'
    return { token: null, error: result.error };
  }

  return { token: result.accessToken.accessToken, error: null };
}
```

### Pattern 2: Updated API Route Wrapper
**What:** Replace header-based token extraction with server-side Pipes lookup.
**When to use:** All GitHub and Linear API routes.
**Example:**
```typescript
// Updated withGitHubToken pattern
import { withAuth } from '@workos-inc/authkit-nextjs';
import { getWorkOS } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export function withPipesToken(
  provider: 'github' | 'linear',
  handler: (token: string, request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    // Get authenticated user from WorkOS session
    const { user } = await withAuth({ ensureSignedIn: true });

    const workos = getWorkOS();
    const result = await workos.pipes.getAccessToken({
      provider,
      userId: user.id,
    });

    if (!result.active) {
      return NextResponse.json(
        { error: `${provider} not connected`, code: result.error },
        { status: 401 },
      );
    }

    try {
      return await handler(result.accessToken.accessToken, request);
    } catch (error) {
      console.error(`${provider} route error`, error);
      return NextResponse.json({ error: `${provider} request failed` }, { status: 500 });
    }
  };
}
```

### Pattern 3: Pipes Widget with AuthKit Access Token
**What:** Embed the Pipes widget in a React component using the AuthKit access token approach.
**When to use:** The connections modal.
**Example:**
```typescript
// Source: WorkOS docs - Pipes Widget with AuthKit integration
'use client';
import { useAccessToken } from '@workos-inc/authkit-nextjs/components';
import { Pipes, WorkOsWidgets } from '@workos-inc/widgets';

export function ConnectionsWidget() {
  const { getAccessToken } = useAccessToken();

  return (
    <WorkOsWidgets>
      <Pipes authToken={getAccessToken} />
    </WorkOsWidgets>
  );
}
```

### Pattern 4: Connection Status API Route
**What:** A dedicated API route that checks connection status for both providers server-side.
**When to use:** On app load and after modal closes.
**Example:**
```typescript
// GET /api/connections/status
import { withAuth } from '@workos-inc/authkit-nextjs';
import { getWorkOS } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const workos = getWorkOS();

  const [github, linear] = await Promise.all([
    workos.pipes.getAccessToken({ provider: 'github', userId: user.id }),
    workos.pipes.getAccessToken({ provider: 'linear', userId: user.id }),
  ]);

  return NextResponse.json({
    github: github.active ? 'connected' : github.error,
    linear: linear.active ? 'connected' : linear.error,
  });
}
```

### Pattern 5: Server-Side Connection Status in page.tsx
**What:** Query connection status in the server component and pass to AppShell.
**When to use:** Initial page load to avoid client-side flash.
**Example:**
```typescript
// In src/app/app/page.tsx (server component)
import { getWorkOS, withAuth } from '@workos-inc/authkit-nextjs';

export default async function AppPage() {
  const { user, accessToken } = await withAuth({ ensureSignedIn: true });
  const workos = getWorkOS();

  // Check connection status server-side
  const [ghResult, linearResult] = await Promise.all([
    workos.pipes.getAccessToken({ provider: 'github', userId: user.id })
      .catch(() => ({ active: false, error: 'not_installed' as const })),
    workos.pipes.getAccessToken({ provider: 'linear', userId: user.id })
      .catch(() => ({ active: false, error: 'not_installed' as const })),
  ]);

  const connectionStatus = {
    github: ghResult.active ? 'connected' : (ghResult as any).error ?? 'not_installed',
    linear: linearResult.active ? 'connected' : (linearResult as any).error ?? 'not_installed',
  };

  return <AppShell connectionStatus={connectionStatus} ... />;
}
```

### Anti-Patterns to Avoid
- **Storing tokens in the database:** Only store WorkOS connection references (workos_connection_id) in the connections table, never raw OAuth tokens. WorkOS Pipes owns token storage.
- **Passing tokens to the client:** Never include access tokens in API response bodies or client state. All token usage stays server-side.
- **Caching Pipes tokens locally:** Always call `getAccessToken()` fresh -- WorkOS handles caching and refresh internally. Tokens have `expiresAt` but the SDK manages this.
- **Using `workos.widgets.getToken()` for Pipes:** The `WidgetScope` type in v8.8.0 does NOT include a Pipes scope. Use the access token approach instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow for GitHub | Custom OAuth redirect, callback, token exchange | `<Pipes authToken={getAccessToken} />` widget | WorkOS handles the entire OAuth flow, state parameter, PKCE, redirect URIs |
| OAuth flow for Linear | Custom OAuth redirect, callback, token exchange | Same Pipes widget | Linear OAuth has specific quirks (scope format, token format); Pipes handles it |
| Token refresh logic | Custom refresh token rotation, expiry checking | `workos.pipes.getAccessToken()` | WorkOS automatically refreshes expired tokens server-side |
| Token storage | Database columns for access/refresh tokens | WorkOS Pipes server-side storage | Storing raw tokens is a security liability. Only store `workos_connection_id` reference |
| Connection status UI | Custom status polling, WebSocket updates | Pipes widget + `getAccessToken()` status checks | Widget shows real-time status; server-side `getAccessToken()` returns error codes |
| Encrypted client-side storage | AES-GCM encryption, PBKDF2 key derivation | DELETE entirely | The whole point of Pipes is eliminating client-side token management |

**Key insight:** WorkOS Pipes deliberately removes token management from your responsibility. The only API you need is `getAccessToken({ provider, userId })` -- everything else (OAuth flows, token storage, refresh, error detection) is handled by WorkOS.

## Common Pitfalls

### Pitfall 1: Widget Token Scopes Don't Include Pipes
**What goes wrong:** Trying to use `workos.widgets.getToken({ scopes: ['widgets:pipes:manage'] })` fails because no such scope exists in the SDK.
**Why it happens:** The `WidgetScope` type only includes: `widgets:users-table:manage`, `widgets:sso:manage`, `widgets:domain-verification:manage`, `widgets:dsync:manage`, `widgets:api-keys:manage`, `widgets:audit-log-streaming:manage`.
**How to avoid:** Use the access token approach: `<Pipes authToken={getAccessToken} />` where `getAccessToken` comes from `useAccessToken()` hook in `@workos-inc/authkit-nextjs/components`.
**Warning signs:** TypeScript error on scope string, or widget token endpoint returning 400.

### Pitfall 2: Missing CORS Configuration
**What goes wrong:** Pipes widget fails silently or shows a network error when trying to communicate with WorkOS API.
**Why it happens:** Widgets make client-side requests to the WorkOS API. Your app's origin must be whitelisted.
**How to avoid:** In WorkOS Dashboard > Authentication > Web Origins, add your development and production URLs (e.g., `http://localhost:3000`, `https://your-domain.com`).
**Warning signs:** CORS errors in browser console, widget showing empty state or errors.

### Pitfall 3: Missing CSS Imports for Widgets
**What goes wrong:** Pipes widget renders but looks broken -- unstyled buttons, missing layouts, overlapping text.
**Why it happens:** `@workos-inc/widgets` requires both Radix Themes CSS and its own CSS.
**How to avoid:** Import both stylesheets:
```css
@import '@radix-ui/themes/styles.css';
@import '@workos-inc/widgets/styles.css';
```
**Warning signs:** Widget renders but is visually broken.

### Pitfall 4: Radix Themes CSS Conflicts with Tailwind v4
**What goes wrong:** Radix Themes global CSS resets may conflict with Tailwind CSS v4 styles, breaking the existing app layout.
**Why it happens:** `@radix-ui/themes/styles.css` includes global resets and base styles that can override Tailwind defaults.
**How to avoid:** Scope the Radix Themes CSS import to only apply within the widget container. Consider using `@layer` in CSS or wrapping the widget in a Shadow DOM / iframe. Alternatively, test carefully and use CSS specificity to override conflicts. The most practical approach is to import Radix Themes CSS only in the modal component scope, or use the `<Theme>` wrapper from Radix only around the widget.
**Warning signs:** Font changes, spacing shifts, or color changes in the rest of the app after adding widget CSS.

### Pitfall 5: organizationId Not Yet Available
**What goes wrong:** Calling `getAccessToken({ provider, userId, organizationId: undefined })` might not match connections if WorkOS expects org-scoped connections.
**Why it happens:** The app doesn't use WorkOS Organizations yet (Phase 4 introduces teams as WorkOS Organizations).
**How to avoid:** The `organizationId` parameter is optional in `GetAccessTokenOptions`. For Phase 3, omit it. Pipes connections are user-scoped. When Phase 4 adds organizations, connections can be scoped then.
**Warning signs:** `getAccessToken()` returning `not_installed` even after the user has connected.

### Pitfall 6: Incomplete Cleanup of Old Token System
**What goes wrong:** Runtime errors because something still imports from the deleted `user-tokens.ts`, or localStorage still has stale encrypted tokens.
**Why it happens:** The old token system is deeply integrated -- 7+ files import from `user-tokens.ts`.
**How to avoid:** Systematically update every import site:
- `src/components/settings-modal.tsx` -- REWRITE entirely
- `src/components/user-header.tsx` -- Remove token-related imports
- `src/lib/tambo.ts` -- Remove `getTokenHeaders()`, replace `apiFetch`
- `src/lib/use-fetch-json.ts` -- Remove `getTokenHeaders()`, simplify to plain fetch
- `src/lib/member-filter.ts` -- Remove `getTokenHeaders()`, simplify fetch calls
- All existing components that use `useFetchJSON` -- should work after hook is fixed
**Warning signs:** Build errors about missing module, runtime `getTokenHeaders is not a function`.

### Pitfall 7: Pipes Widget Inside Custom Modal Creates Double-Portal Issues
**What goes wrong:** The Pipes widget may open its own popups or overlays (for OAuth flows), conflicting with the existing `createPortal`-based modal pattern.
**Why it happens:** The Pipes widget launches OAuth flows that may use popup windows or redirects.
**How to avoid:** Ensure the modal z-index is high enough, and test the full connect flow. OAuth flows typically open in a new window/tab (popup), so the modal just needs to stay open behind it and refresh status when focus returns.
**Warning signs:** OAuth popup appearing behind the modal, or modal closing during the OAuth flow.

## Code Examples

### Complete Connections Modal Structure
```typescript
// Source: WorkOS Pipes Widget docs + project patterns
'use client';
import { useAccessToken } from '@workos-inc/authkit-nextjs/components';
import { Pipes, WorkOsWidgets } from '@workos-inc/widgets';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionsModal({ isOpen, onClose }: ConnectionsModalProps) {
  const { getAccessToken } = useAccessToken();

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full mx-4 border border-[rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">
            Connect your accounts
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[rgba(0,0,0,0.04)] transition-colors cursor-pointer">
            <X className="w-4 h-4 text-[#AAA]" />
          </button>
        </div>
        <div className="px-5 pt-4 pb-5">
          <WorkOsWidgets>
            <Pipes authToken={getAccessToken} />
          </WorkOsWidgets>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modal, document.body) : null;
}
```

### Updated withGitHubToken (Server-Side Pipes)
```typescript
// Source: WorkOS Node SDK types + existing github-client.ts pattern
import { getWorkOS, withAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export function withGitHubToken(
  handler: (token: string, request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const { user } = await withAuth({ ensureSignedIn: true });
    const workos = getWorkOS();

    const result = await workos.pipes.getAccessToken({
      provider: 'github',
      userId: user.id,
    });

    if (!result.active) {
      return NextResponse.json(
        { error: 'GitHub not connected', code: result.error },
        { status: 401 },
      );
    }

    try {
      return await handler(result.accessToken.accessToken, request);
    } catch (error) {
      console.error('GitHub route error', error);
      return NextResponse.json({ error: 'GitHub request failed' }, { status: 500 });
    }
  };
}
```

### Updated useFetchJSON (No More Token Headers)
```typescript
// Simplified -- no more getTokenHeaders, server handles auth
import { useEffect, useState } from 'react';

interface FetchResult<T> {
  data: T | null;
  error: string | null;
}

export function useFetchJSON<T>(url: string | null): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setData(null);
    setError(null);

    fetch(url)
      .then((r) => r.json())
      .then((result) => {
        if (cancelled || !result) return;
        if (result.error) {
          setError(result.error);
          return;
        }
        setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => { cancelled = true; };
  }, [url]);

  return { data, error };
}
```

### Updated tambo.ts apiFetch (No More Token Headers)
```typescript
// Simplified -- server handles auth via session cookies
async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json as T;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual token pasting + encrypted localStorage | WorkOS Pipes OAuth widget + server-side token retrieval | Jan 2026 (Pipes GA) | Users never handle tokens; server calls `getAccessToken()` |
| Custom OAuth redirect flows per provider | `<Pipes />` widget handles all OAuth | Jan 2026 | No need to build callback routes, state management, or PKCE |
| Token refresh logic in app code | WorkOS auto-refreshes tokens | Jan 2026 | `getAccessToken()` always returns a fresh token |
| Separate widget token scopes per widget | Access token approach for Pipes widget | Current | No Pipes-specific widget scope exists; use `useAccessToken` |

**Deprecated/outdated:**
- `user-tokens.ts` encrypted localStorage pattern: DELETE. Replaced entirely by Pipes.
- `x-github-token` / `x-linear-api-key` request headers: REMOVE. Tokens retrieved server-side.
- `getTokenHeaders()` pattern: DELETE. No client-side token passing needed.

## Discretion Recommendations

Based on research, here are recommendations for areas marked as Claude's Discretion:

### Connect Button Mechanism
**Recommendation: Use the embedded `<Pipes />` widget.** The widget handles the full OAuth flow (popup-based), shows available providers, and manages connect/disconnect/reauthorize states. The alternative (custom redirect-based OAuth) would require building callback routes and state management that Pipes eliminates.

**However**, the user wants individual provider cards with Connect/Disconnect buttons, not a single widget. Two approaches:
1. **Embed `<Pipes />` widget directly** -- it shows all configured providers as cards. Style to match the modal design.
2. **Use `<Pipes />` but with custom UI around it** -- the widget may already render cards per provider. Check if it supports provider filtering props after install.

If the widget does NOT support per-provider filtering and renders all providers at once, it may actually be the simpler path -- just embed it and let it handle the UI. The user's card design requirements (icon, name, status, action button) may already be satisfied by the widget's native rendering.

### Server-Side Token Retrieval Pattern
**Recommendation: Create a shared `withPipesToken(provider, handler)` wrapper** that replaces both `withGitHubToken` and `withLinearClient`. This wrapper:
1. Gets the authenticated user via `withAuth({ ensureSignedIn: true })`
2. Calls `getWorkOS().pipes.getAccessToken({ provider, userId: user.id })`
3. Returns 401 with `{ error, code }` if not connected
4. Calls the handler with the token if connected

### Connection Status API Design
**Recommendation: Dual approach:**
1. **Server-side in page.tsx** -- Query both providers' status on initial load, pass to AppShell as props. No flash of "loading" state.
2. **Client-side API route** -- `GET /api/connections/status` for refreshing after modal closes. Returns `{ github: 'connected' | 'not_installed' | 'needs_reauthorization', linear: ... }`.

### Error Handling for Failed OAuth Flows
**Recommendation:** The Pipes widget handles OAuth errors internally (showing retry options). For API-level errors when `getAccessToken()` returns `{ active: false }`, API routes return `{ error: 'GitHub not connected', code: 'not_installed' }`. The client displays a toast or inline message directing users to the connections modal.

## Connections Table Usage

The `ConnectionsTable` schema is already defined in `src/lib/schema.ts`:
```typescript
interface ConnectionsTable {
  id: string;
  team_id: string;
  user_id: string;
  provider: "github" | "linear";
  workos_connection_id: string;
  status: "active" | "inactive" | "error";
  created_at: Generated<string>;
  updated_at: Generated<string>;
}
```

**Usage decision:** The connections table may not be strictly needed for Phase 3 if we rely entirely on `workos.pipes.getAccessToken()` for status checks. However, it provides:
- Local caching of connection state (avoid calling WorkOS API on every page load)
- A place to store the `workos_connection_id` for future Phase 6 team-scoped queries
- Database-driven connection status without hitting the WorkOS API

**Recommendation:** Use the connections table as a cache/reference. Update it when:
- User connects (via webhook or post-connection API call)
- User disconnects
- `getAccessToken()` returns an error (update status to 'error')

For Phase 3, the simplest approach is to NOT use the connections table for status and instead rely directly on `getAccessToken()`. The table becomes important in Phase 6 when we need to iterate over all team members' connections.

## Files to Modify/Delete

### DELETE
- `src/lib/user-tokens.ts` -- Entire file (156 lines)

### REWRITE
- `src/components/settings-modal.tsx` -> `src/components/connections-modal.tsx` -- Complete rewrite as Pipes widget container

### MODIFY (Token System Removal)
- `src/lib/tambo.ts` -- Remove `getTokenHeaders()` import, simplify `apiFetch` to plain fetch
- `src/lib/use-fetch-json.ts` -- Remove `getTokenHeaders()` import, simplify to plain fetch
- `src/lib/member-filter.ts` -- Remove `getTokenHeaders()` import, simplify fetch calls
- `src/components/user-header.tsx` -- Remove `user-tokens` imports, add status dots, update modal reference

### MODIFY (Server-Side Token Lookup)
- `src/lib/github-client.ts` -- Replace `withGitHubToken` with Pipes-based wrapper
- `src/lib/linear-client.ts` -- Replace `withLinearClient` with Pipes-based wrapper
- `src/app/api/github/find-user/route.ts` -- Use updated wrapper
- `src/app/api/github/prs/route.ts` -- Use updated wrapper, remove `x-github-org` header reading
- `src/app/api/linear/team/route.ts` -- Use updated wrapper
- `src/app/api/linear/cycle/route.ts` -- Use updated wrapper
- `src/app/api/linear/issues/route.ts` -- Use updated wrapper
- `src/app/api/linear/risks/route.ts` -- Use updated wrapper
- `src/app/api/linear/search/route.ts` -- Use updated wrapper

### NEW
- `src/app/api/connections/status/route.ts` -- Connection status endpoint
- `src/components/connection-prompt.tsx` -- First-use onboarding prompt
- CSS imports for Radix Themes and WorkOS Widgets styles

### MODIFY (AppShell Integration)
- `src/app/app/page.tsx` -- Add server-side connection status query
- `src/app/app/app-shell.tsx` -- Accept connection status props, render prompt, pass to UserHeader

## Open Questions

1. **Pipes Widget Provider Filtering**
   - What we know: `<Pipes authToken={...} />` renders connection cards for all configured providers
   - What's unclear: Whether it supports a `providers` or `filter` prop to show only specific providers
   - Recommendation: After installing `@workos-inc/widgets`, inspect the exported Pipes component props. If no filtering exists, that's fine -- configure only GitHub and Linear in the WorkOS Dashboard and the widget will show only those two.

2. **Radix Themes CSS Conflict with Tailwind v4**
   - What we know: Radix Themes includes global CSS resets
   - What's unclear: Exact impact on Tailwind v4 styles in this project
   - Recommendation: Test immediately after installing. If conflicts occur, scope the Radix CSS import or wrap the widget in a `<Theme>` container with CSS isolation.

3. **WorkOS Dashboard Provider Configuration**
   - What we know: GitHub and Linear must be configured as Pipes providers in the WorkOS Dashboard
   - What's unclear: Whether they're already configured (STATE.md notes this as a go/no-go gate)
   - Recommendation: Verify in dashboard before implementation. Use shared credentials for sandbox/dev.

4. **Pipes Widget Callbacks After Connect/Disconnect**
   - What we know: The widget handles the full flow internally
   - What's unclear: Whether it exposes `onConnect` / `onDisconnect` callback props for the parent to react to
   - Recommendation: After installing, check the component's TypeScript types. If no callbacks exist, poll connection status when the modal closes (the simpler approach anyway, since status dots update "on app load and after connections modal is closed").

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (manual testing via dev server per CLAUDE.md) |
| Config file | none -- no test framework |
| Quick run command | `npm run build` (type checking + build verification) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONN-01 | Connect GitHub via Pipes widget | manual | Dev server: click Connect in modal | N/A |
| CONN-02 | Connect Linear via Pipes widget | manual | Dev server: click Connect in modal | N/A |
| CONN-03 | See connection status | manual | Dev server: check header dots and modal cards | N/A |
| CONN-04 | Reauthorize broken connection | manual | Dev server: revoke in provider, check reauth flow | N/A |
| CONN-05 | Disconnect an account | manual | Dev server: click Disconnect, confirm | N/A |
| CONN-06 | New user sees connect prompt | manual | Dev server: new user without connections | N/A |
| CONN-07 | Tokens server-side only | manual + build | `npm run build` (no token imports in client code) | N/A |
| CONN-08 | user-tokens.ts removed | build | `npm run build` (file deleted, no broken imports) | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors, broken imports)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full build + manual verification of all 8 success criteria

### Wave 0 Gaps
- [ ] Install `@workos-inc/widgets @radix-ui/themes @tanstack/react-query`
- [ ] Add CSS imports for Radix Themes and WorkOS Widgets
- [ ] Configure GitHub and Linear as Pipes providers in WorkOS Dashboard
- [ ] Add app origin to WorkOS CORS allowed origins (if not already done)

## Sources

### Primary (HIGH confidence)
- `@workos-inc/node` v8.8.0 -- inspected actual TypeScript types in `node_modules`. `Pipes.getAccessToken()` accepts `{ provider, userId, organizationId? }`, returns `GetAccessTokenResponse` (success with `AccessToken` or failure with `'not_installed' | 'needs_reauthorization'`).
- `@workos-inc/node` v8.8.0 -- `Widgets.getToken()` scopes do NOT include a Pipes scope. Confirmed from type definitions.
- `@workos-inc/authkit-nextjs` v2.15.0 -- exports `getWorkOS()` (singleton WorkOS instance), `useAccessToken` hook, `AuthKitProvider`. Confirmed from source code.
- WorkOS Pipes official docs -- https://workos.com/docs/pipes
- WorkOS Pipes Widget docs -- https://workos.com/docs/widgets/pipes

### Secondary (MEDIUM confidence)
- WorkOS Linear tutorial -- https://workos.com/blog/fetch-data-from-linear-with-pipes-tutorial (confirmed `getAccessToken` pattern for Linear)
- WorkOS GitHub tutorial -- https://workos.com/blog/github-with-pipes-tutorial (confirmed `getAccessToken` pattern for GitHub)
- WorkOS Widgets Quick Start -- https://workos.com/docs/widgets/quick-start (confirmed peer deps: `@radix-ui/themes`, `@tanstack/react-query`)
- WorkOS widgets-examples repo -- https://github.com/workos/widgets-examples (confirmed Next.js pattern with `workos.widgets.getToken()`)
- WorkOS Widgets NPM -- https://www.npmjs.com/package/@workos-inc/widgets (version ^1.5.0, latest)

### Tertiary (LOW confidence)
- Pipes widget callback props (onConnect/onDisconnect) -- could not verify from docs or types. Flagged as open question.
- Radix Themes CSS conflict with Tailwind v4 -- theoretical concern, needs testing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- verified from actual installed package types and official docs
- Architecture: HIGH -- patterns derived from type definitions and official tutorials
- Pitfalls: MEDIUM -- some (CSS conflicts, widget callbacks) are theoretical, others (scope types, CORS) are verified
- Token retrieval: HIGH -- verified from TypeScript type definitions in node_modules

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable -- WorkOS SDK unlikely to break in 30 days)
