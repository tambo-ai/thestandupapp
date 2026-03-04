# Coding Conventions

**Analysis Date:** 2026-03-03

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `FilterPills.tsx`, `TeamOverview.tsx`, `GraphErrorBoundary`)
- Utilities/hooks: camelCase (e.g., `use-fetch-json.ts`, `linear-client.ts`, `member-filter.ts`, `user-tokens.ts`)
- Pages/routes: lowercase with hyphens (e.g., `page.tsx` in route directories, `[...all]/route.ts` for auth catch-all)

**Functions:**
- camelCase for all exported functions and handlers
- Examples: `toggleFilter()`, `useFetchJSON()`, `withLinearClient()`, `linearClientFromRequest()`
- Hooks start with `use` prefix: `useFilteredMemberIds()`, `useFetchJSON()`
- Higher-order functions start with `with`: `withLinearClient()`, `withGitHubToken()`

**Variables:**
- camelCase for all variable and constant declarations
- Private module-level state prefixed with underscore: `_userId`, `_cryptoKey`, `_readyResolve`, `_ready` in `user-tokens.ts`
- Constants: UPPER_SNAKE_CASE for config constants: `STATUS_CONFIG` in `team-overview.tsx`, `GITHUB_API` in `github-client.ts`, `SALT` in `user-tokens.ts`

**Types:**
- PascalCase for all interface and type definitions
- Examples: `FilterOption`, `TeamMember`, `IssueItem`, `PRItem`, `GraphProps`, `GraphErrorBoundaryProps`
- Zod schema variables: camelCase with `Schema` suffix (e.g., `graphSchema`, `graphDataSchema`, `teamOverviewSchema`, `personDetailSchema`)
- Inferred types use `z.infer<typeof schema>`: `type GraphProps = z.infer<typeof graphSchema>`

## Code Style

**Formatting:**
- ESLint 9 with Next.js and TypeScript support via `eslint-config-next`
- Run with `npm run lint` or auto-fix with `npm run lint:fix`
- No explicit Prettier config; linting is the primary style enforcement

**Linting:**
- Config: `eslint.config.mjs` (ESLint flat config)
- Extends: `next/core-web-vitals` and `next/typescript`
- Enforces Next.js best practices and TypeScript strict rules

**Key Rules Enforced:**
- TypeScript strict mode: `strict: true` in `tsconfig.json`
- All functions and components must have full type annotations
- Unused variables and imports trigger linting errors
- Next.js Image optimization and Link requirements enforced

## Import Organization

**Order:**
1. Node.js and third-party packages (React, Next.js, etc.)
2. Type imports: `import type { ... }` on separate lines
3. Absolute imports using `@/` alias to `src/`
4. Relative imports (within same package/component)

**Examples from codebase:**
```typescript
// From person-detail.tsx
"use client";

import { FilterPills, toggleFilter, type FilterOption } from "@/components/filter-pills";
import { useFilteredMemberIds, type TeamMember } from "@/lib/member-filter";
import { useFetchJSON } from "@/lib/use-fetch-json";
import { useTamboThreadInput } from "@tambo-ai/react";
import { z } from "zod";
```

```typescript
// From tambo.ts
import { Graph, graphSchema } from "@/components/graph";
import { getTokenHeaders } from "@/lib/user-tokens";
import type { TamboComponent, TamboTool } from "@tambo-ai/react";
import { defineTool } from "@tambo-ai/react";
import { z } from "zod";
```

**Path Aliases:**
- `@/*` → `./src/*` (defined in `tsconfig.json`)
- All relative paths use absolute imports via `@/`

## Error Handling

**Patterns:**
- **Route handlers**: Wrapped with higher-order functions that catch errors and return proper JSON responses
  - `withLinearClient()` in `linear-client.ts`: catches all errors, returns 500 with error message
  - `withGitHubToken()` in `github-client.ts`: same pattern, logs to console.error
  - Validates required headers before passing to handler, returns 401 if missing

**Example from `linear-client.ts`:**
```typescript
export function withLinearClient(
  handler: (client: LinearClient, request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const clientOrError = linearClientFromRequest(request);
    if (clientOrError instanceof NextResponse) return clientOrError;  // 401 if no API key

    try {
      return await handler(clientOrError, request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
```

- **React Hooks**: Use explicit null checks and closure variables for cancellation
  - `useFetchJSON()` sets `cancelled` flag to prevent state updates after unmount
  - Errors are stored in state and rendered; null data signals loading state

**Example from `useFetchJSON()`:**
```typescript
let cancelled = false;
setData(null);
setError(null);

getTokenHeaders().then((headers) => {
  if (cancelled) return;  // Check before async operations
  return fetch(url, { headers });
})
  .then((r) => r?.json())
  .then((result) => {
    if (cancelled || !result) return;
    if (result.error) {
      setError(result.error);  // Error stored in state
      return;
    }
    setData(result);
  })
  .catch((e) => {
    if (!cancelled) setError(e.message);
  });

return () => {
  cancelled = true;  // Cleanup
};
```

- **React Error Boundaries**: Used for non-fatal rendering errors (e.g., `GraphErrorBoundary` in `graph.tsx`)
  - Implements `componentDidCatch()` to log errors
  - Renders fallback UI instead of crashing component tree
  - Styled consistently with component theme

**Example from `graph.tsx`:**
```typescript
class GraphErrorBoundary extends React.Component<...> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error rendering chart:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <div>Error loading chart. Please try again.</div>;
    }
    return this.props.children;
  }
}
```

- **Null coalescing for optional values**: Always check for null/undefined
  - `value ?? fallback` for nullish checks
  - `Array.isArray()` for array validation before mapping
  - Optional chaining: `data?.members?.length`

## Logging

**Framework:** `console` (built-in)

**Patterns:**
- `console.error()` used in error handlers (catch blocks, error boundaries)
- Errors logged in: `componentDidCatch()` callbacks, `withGitHubToken()` error handlers
- Examples:
  - `console.error("Error rendering chart:", error, errorInfo)` in GraphErrorBoundary
  - `console.error("GitHub route error", error)` in withGitHubToken

**When to Log:**
- Catch blocks for unexpected errors
- Component lifecycle errors (error boundaries)
- No logging for normal success paths or data fetching

## Comments

**When to Comment:**
- JSDoc comments on public functions, hooks, and components
- Inline comments for non-obvious business logic or API quirks
- Not used for stating what code does (code should be self-documenting)

**JSDoc/TSDoc:**
- Used extensively for exported functions, components, and hooks
- Format: `/** Doc text */` with one-line or multi-line descriptions
- Examples from codebase:

```typescript
/**
 * Per-user localStorage keys for GitHub and Linear tokens.
 * Keys are scoped by userId. Values are AES-GCM encrypted at rest,
 * with the encryption key derived from the userId via PBKDF2.
 */

/**
 * GET /api/linear/issues — Fetch issues assigned to a specific user.
 *
 * @query userId - Linear user ID (required)
 *
 * @returns Array of the user's 20 most recently updated issues with identifier,
 *          title, url, priorityLabel, updatedAt, and workflow state.
 */
export const GET = withLinearClient(async (linear, request) => { ... });

/**
 * Resolve a name or email to a GitHub login via the Search Users API.
 * Used by both find-user and prs routes to avoid duplicating resolution logic.
 */
export async function resolveGitHubLogin(...) { ... }

/**
 * Fetches JSON from a URL with automatic cancellation on unmount/URL change.
 * Automatically attaches user-scoped, encrypted GitHub and Linear tokens as headers.
 * Pass `null` to skip the fetch.
 */
export function useFetchJSON<T>(url: string | null): FetchResult<T> { ... }
```

## Function Design

**Size:** Functions are kept concise and focused
- Route handlers: 10-50 lines (not counting data transformations)
- React components: 30-200 lines for simpler components; larger components delegate to sub-components
- Utilities: 5-30 lines, one responsibility per function

**Parameters:**
- Destructured when possible: `{ teamId, teamName }: Partial<TeamOverviewProps>`
- Higher-order functions accept handler functions: `withLinearClient(handler: (client, request) => Promise<NextResponse>)`
- Objects preferred over many positional params: `resolveGitHubLogin(token, { email, name, org })`

**Return Values:**
- Explicit types always provided (no implicit `any`)
- Union types for error cases: `LinearClient | NextResponse` in `linearClientFromRequest()`
- Zod validation with type inference: `type GraphProps = z.infer<typeof graphSchema>`
- React hooks return tuple or object: `{ data, error }` for hooks, `[state, setState]` for useState

**Examples:**
```typescript
// Clear return type with union
export function linearClientFromRequest(
  request: NextRequest,
): LinearClient | NextResponse { ... }

// Generic type parameter for reusability
export function useFetchJSON<T>(url: string | null): FetchResult<T> { ... }

// Destructured params with partial type
export function TeamOverview({
  teamId,
  teamName,
}: Partial<TeamOverviewProps>) { ... }

// Zod-inferred type
type GraphProps = z.infer<typeof graphSchema>;
export const Graph = React.forwardRef<HTMLDivElement, GraphProps>(...) { ... }
```

## Module Design

**Exports:**
- Named exports for utilities, hooks, types, and functions
- Default exports for React components (used with `React.forwardRef` for ref forwarding)
- Zod schemas exported as named exports alongside their inferred types

**Examples:**
```typescript
// Utilities: named exports
export function useFetchJSON<T>(url: string | null): FetchResult<T> { ... }
export async function resolveGitHubLogin(...): Promise<string | null> { ... }
export type GraphProps = z.infer<typeof graphSchema>;
export const graphSchema = z.object({ ... });

// Components: default export with named schema export
export const Graph = React.forwardRef<HTMLDivElement, GraphProps>(...);
export const graphSchema = z.object({ ... });
```

**Barrel Files:** Not used in this codebase
- Each file is imported individually (e.g., `from "@/lib/linear-client"`)
- Avoids circular dependency issues and makes explicit what's being imported

**Zod Schema Pattern:**
- Every component/tool that accepts props has a corresponding Zod schema
- Schema validates runtime data from AI/tools
- Type is inferred from schema: `z.infer<typeof componentSchema>`
- Schemas describe props with `.describe()` for AI visibility

```typescript
export const teamOverviewSchema = z.object({
  teamId: z.string().describe("Linear team ID"),
  teamName: z.string().optional().describe("Team display name"),
});

type TeamOverviewProps = z.infer<typeof teamOverviewSchema>;
```

---

*Convention analysis: 2026-03-03*
