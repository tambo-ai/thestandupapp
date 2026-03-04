# Testing Patterns

**Analysis Date:** 2026-03-03

## Test Framework

**Current Status:** No test framework configured

**Note:** This is a Tambo AI template project. The codebase currently lacks:
- Test runner (Jest, Vitest, etc.)
- Test files (no `.test.ts`, `.spec.ts` files found)
- Testing libraries (no @testing-library or similar in devDependencies)
- Test configuration files

**Development Approach:** Manual testing via development server
- Run `npm run dev` to start localhost:3000
- Verify AI can properly invoke components and tools
- Test user flows manually in browser

## Test Structure

Given the absence of a testing framework, the codebase relies on:

1. **TypeScript Strict Mode** for compile-time type safety
   - `tsconfig.json` has `strict: true`
   - Prevents many common errors before runtime

2. **Zod Validation at Runtime** for data validation
   - Every component and tool has a schema: `graphSchema`, `teamOverviewSchema`, `personDetailSchema`
   - Schemas validate props from AI/API layer before rendering
   - Example: `z.infer<typeof graphSchema>` types props while validating structure

3. **Error Boundaries and Try-Catch** for error handling
   - React Error Boundaries catch rendering errors (e.g., `GraphErrorBoundary`)
   - Route handlers wrapped with `withLinearClient()` and `withGitHubToken()` for API error handling
   - Failed requests return JSON error responses with status codes

## Error Handling for Testing

**Client-side (React):**
- Error Boundaries log errors to console
- Component Error in `graph.tsx`:
  ```typescript
  class GraphErrorBoundary extends React.Component<...> {
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error("Error rendering chart:", error, errorInfo);
    }
    render() {
      if (this.state.hasError) {
        return <div>Error loading chart. Please try again.</div>;
      }
      return this.props.children;
    }
  }
  ```

**Server-side (API Routes):**
- All route handlers wrapped with try-catch via HOF pattern
- Example from `withLinearClient()`:
  ```typescript
  export function withLinearClient(
    handler: (client: LinearClient, request: NextRequest) => Promise<NextResponse>,
  ) {
    return async (request: NextRequest) => {
      const clientOrError = linearClientFromRequest(request);
      if (clientOrError instanceof NextResponse) return clientOrError;  // 401

      try {
        return await handler(clientOrError, request);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    };
  }
  ```

- Missing headers return 401 with error message
- Exceptions caught and returned as 500 with error details

## Manual Testing Approach

**Development Server:**
```bash
npm run dev              # Start dev server on localhost:3000
```

**What to Test Manually:**
1. Component rendering: Verify Graph, TeamOverview, PersonDetail render without errors
2. API endpoints: Test `/api/linear/*` and `/api/github/*` routes with mock tokens
3. Tool invocation: Confirm AI can call `listTeams`, `getTeamMembers`, `findGitHubUser`, `searchIssues`
4. Error states: Remove API keys/tokens, verify error messages display
5. Data validation: Pass invalid data shapes to components, verify Zod validation catches it

**Verification Approach:**
- Use browser DevTools console for error logs
- Inspect Network tab for API responses
- Check for 401/500 status codes on failed requests
- Confirm error boundaries render fallback UI on component crashes

## Mocking and Data

**No Mock Framework:**
The codebase uses real API calls; no mocking library is configured.

**Data Validation (Zod):**
Zod schemas act as runtime validators and de-facto test specifications:

```typescript
// Validates API response structure at runtime
export const teamOverviewSchema = z.object({
  teamId: z.string().describe("Linear team ID"),
  teamName: z.string().optional().describe("Team display name"),
});

// Validates tool output
export const searchIssuesOutputSchema = z.array(
  z.object({
    identifier: z.string(),
    title: z.string(),
    url: z.string(),
    priority: z.string(),
    status: z.string(),
    statusType: z.string(),
    assignee: z.string().nullable(),
    labelIds: z.array(z.string()),
    updatedAt: z.string(),
    createdAt: z.string(),
  }),
);
```

**Test Data in Components:**
- No test fixtures or factories
- Components fetch real data from API routes
- Example: `TeamOverview` fetches from `/api/linear/team?id=...` in `useFetchJSON()` hook

## Integration Points

**Client-Server Integration:**
- React components call API routes via `useFetchJSON()` hook
- Hook automatically attaches encrypted auth headers from `user-tokens.ts`
- Example flow in `team-overview.tsx`:
  ```typescript
  const { data, error } = useFetchJSON<TeamData>(
    teamId ? `/api/linear/team?id=${teamId}` : null,
  );
  // Renders data or error state
  ```

**API Layer Integration:**
- Route handlers accept encrypted tokens from headers (`x-github-token`, `x-linear-api-key`)
- Create clients and fetch from third-party APIs (Linear, GitHub)
- Return JSON responses with proper status codes

**Example from `/api/linear/issues/route.ts`:**
```typescript
export const GET = withLinearClient(async (linear, request) => {
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await linear.user(userId);
  const assigned = await user.assignedIssues({ first: 20, orderBy: "updatedAt" as never });

  const issues = await Promise.all(
    assigned.nodes.map(async (issue) => {
      const state = await issue.state;
      return {
        identifier: issue.identifier,
        title: issue.title,
        url: issue.url,
        priorityLabel: issue.priorityLabel,
        updatedAt: issue.updatedAt.toISOString(),
        state: state ? { name: state.name, color: state.color, type: state.type } : null,
      };
    }),
  );

  return NextResponse.json(issues, {
    headers: { "Cache-Control": "private, max-age=120" },
  });
});
```

## Type Safety as Testing

**TypeScript Strict Mode:**
The codebase relies heavily on TypeScript for correctness:

```typescript
// Type-safe API response handling
interface FetchResult<T> {
  data: T | null;
  error: string | null;
}

export function useFetchJSON<T>(url: string | null): FetchResult<T> { ... }
```

**Generic Type Parameters:**
- Components and utilities use generics to ensure correct data shapes
- Example: `useFetchJSON<TeamData>()` ensures response matches `TeamData` type

**Zod Runtime Validation:**
- Acts as both schema and type definition
- Validates API responses match expected structure
- Prevents silent bugs from malformed data

```typescript
// Zod schema validates _and_ provides type
const personDetailSchema = z.object({ ... });
type PersonDetailProps = z.infer<typeof personDetailSchema>;
```

## Testing Recommendations

If adding tests in the future:

**Test Framework:** Vitest (modern, Next.js friendly)
- Config file: `vitest.config.ts`
- Run: `npm run test` / `npm run test:watch`

**Testing Library:** @testing-library/react for component testing

**Test Structure:**
- Co-locate tests with components: `graph.test.tsx` next to `graph.tsx`
- Unit tests for utilities: `lib/user-tokens.test.ts`
- Integration tests for API routes: `__tests__/api/linear/issues.test.ts`

**What to Test:**
1. **Components:** Render with valid props, handle error states, call callbacks
2. **Hooks:** State updates, cleanup on unmount, cancellation
3. **API Routes:** Validate headers, handle errors, return correct response structure
4. **Utilities:** Input validation, crypto functions, filtering logic

**Example Test Structure (if implemented):**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { TeamOverview } from '@/components/team-overview';
import { render, screen } from '@testing-library/react';

describe('TeamOverview', () => {
  it('renders loading skeleton when data is null', () => {
    render(<TeamOverview teamId="test-id" />);
    // Would need to mock useFetchJSON
    expect(screen.getByText(/Loading members/i)).toBeInTheDocument();
  });

  it('displays error message on fetch failure', () => {
    // Mock useFetchJSON to return error
    render(<TeamOverview teamId="test-id" />);
    expect(screen.getByText(/Failed to load team/i)).toBeInTheDocument();
  });
});
```

---

*Testing analysis: 2026-03-03*
