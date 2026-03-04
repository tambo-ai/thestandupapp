# Codebase Structure

**Analysis Date:** 2026-03-03

## Directory Layout

```
thestandupapp/
├── src/
│   ├── app/                          # Next.js 15 App Router pages & API routes
│   │   ├── layout.tsx                # Root layout, global styles/fonts
│   │   ├── page.tsx                  # Home page (authenticated, main dashboard)
│   │   ├── login/
│   │   │   └── page.tsx              # Login page (Google OAuth)
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...all]/
│   │       │       └── route.ts       # Better Auth handler
│   │       ├── linear/
│   │       │   ├── team/
│   │       │   │   └── route.ts       # GET team list or team members
│   │       │   ├── search/
│   │       │   │   └── route.ts       # Search issues by query
│   │       │   ├── issues/
│   │       │   │   └── route.ts       # Fetch issues for a team
│   │       │   ├── cycle/
│   │       │   │   └── route.ts       # Fetch cycle details
│   │       │   └── risks/
│   │       │       └── route.ts       # Identify at-risk issues
│   │       └── github/
│   │           ├── prs/
│   │           │   └── route.ts       # Fetch/search pull requests
│   │           └── find-user/
│   │               └── route.ts       # Resolve email/name to GitHub login
│   ├── components/
│   │   ├── tambo/                    # Tambo AI-specific components
│   │   │   ├── canvas-space.tsx      # Grid layout for rendered components
│   │   │   ├── message-thread-full.tsx # Chat + history sidebar container
│   │   │   ├── message-input.tsx     # Input textarea + submit button
│   │   │   ├── message-suggestions.tsx # Suggestion pills below messages
│   │   │   ├── message.tsx           # Individual message renderer
│   │   │   ├── thread-container.tsx  # Chat panel wrapper
│   │   │   ├── thread-content.tsx    # Message list container
│   │   │   ├── thread-history.tsx    # Thread list sidebar
│   │   │   ├── scrollable-message-container.tsx # Scrollable wrapper
│   │   │   ├── markdown-components.tsx # Custom markdown renderers
│   │   │   ├── mcp-components.tsx    # MCP integration components
│   │   │   ├── mcp-config-modal.tsx  # MCP settings dialog
│   │   │   ├── text-editor.tsx       # Rich text input (Tiptap)
│   │   │   ├── elicitation-ui.tsx    # Form generation from schemas
│   │   │   ├── dictation-button.tsx  # Voice input
│   │   │   └── message-generation-stage.tsx # Generation state UI
│   │   ├── team-overview.tsx         # Grid of team members with status
│   │   ├── person-detail.tsx         # One person's issues + PRs
│   │   ├── pull-request-list.tsx     # PR list with filters
│   │   ├── weekly-goals.tsx          # Progress tracker by status
│   │   ├── risk-report.tsx           # Overdue/stale/unassigned issues
│   │   ├── summary-panel.tsx         # Flexible data display (stats + sections)
│   │   ├── graph.tsx                 # Recharts wrapper (bar/line/pie)
│   │   ├── filter-pills.tsx          # State/repo/author filter buttons
│   │   ├── settings-modal.tsx        # User settings (tokens, team, filters)
│   │   ├── user-header.tsx           # User name/avatar + settings button
│   │   └── globals.css               # Global styles
│   ├── lib/
│   │   ├── tambo.ts                  # CENTRAL CONFIG: component & tool registry
│   │   ├── auth.ts                   # Better Auth instance (server-side)
│   │   ├── auth-client.ts            # Better Auth React hook client
│   │   ├── linear-client.ts          # LinearClient wrapper & route helpers
│   │   ├── github-client.ts          # GitHub API helpers & route wrappers
│   │   ├── user-tokens.ts            # Encrypted token storage (localStorage)
│   │   ├── member-filter.ts          # Member filtering helpers & types
│   │   ├── thread-hooks.ts           # Tambo thread utilities (useMergeRefs, etc.)
│   │   ├── use-fetch-json.ts         # Generic JSON fetch hook
│   │   └── utils.ts                  # General utilities (cn, etc.)
│   └── middleware.ts                 # Session check middleware
├── public/                           # Static assets (favicon, robots.txt, etc.)
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript config (strict mode)
├── next.config.js                    # Next.js config
├── tailwind.config.ts                # Tailwind CSS v4 config
├── postcss.config.ts                 # PostCSS config
└── .planning/
    └── codebase/                     # Analysis documents (this directory)
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js 15 App Router — pages and API routes
- Contains: Page components, API handlers
- Key files: `page.tsx` (main app), `login/page.tsx`, `api/` routes

**`src/app/api/linear/`:**
- Purpose: Backend routes that call Linear SDK
- Contains: GET endpoints for teams, members, issues, search, risks, cycle
- Key files: `team/route.ts` (most complex — fetches issues and computes member stats), `risks/route.ts` (identifies at-risk issues)

**`src/app/api/github/`:**
- Purpose: Backend routes that call GitHub REST API
- Contains: GET endpoints for PR search and user resolution
- Key files: `prs/route.ts` (complex multi-mode PR search), `find-user/route.ts` (email/name resolution)

**`src/components/`:**
- Purpose: All React components
- Contains: Specialized dashboard components (TeamOverview, RiskReport, etc.) and Tambo UI components (MessageThread, CanvasSpace)
- Key files: `tambo/canvas-space.tsx` (grid layout), `tambo/message-thread-full.tsx` (chat interface)

**`src/components/tambo/`:**
- Purpose: Chat interface and Tambo SDK integration
- Contains: Message rendering, input, suggestions, thread history
- Key files: All message-*.tsx and thread-*.tsx files

**`src/lib/`:**
- Purpose: Utilities, configuration, hooks
- Contains: Tambo registry, auth, API wrappers, data fetching hooks
- Key files: `tambo.ts` (component & tool registration — this is where you add new components/tools)

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Main dashboard — renders TamboProvider + MessageThreadFull + CanvasSpace
- `src/app/login/page.tsx`: Authentication page
- `src/middleware.ts`: Protects all routes except /login and API auth

**Configuration:**
- `src/lib/tambo.ts`: Register components and tools available to AI
- `src/app/layout.tsx`: Root layout with fonts and global CSS

**Core Logic:**
- `src/app/page.tsx`: AppShell — handles session, tokens, system prompt, chat width resizing
- `src/lib/user-tokens.ts`: Token encryption/decryption and localStorage management
- `src/app/api/linear/team/route.ts`: Complex logic — fetches team + issues, computes member status

**Testing:**
- No test files present (manual testing via dev server)

## Naming Conventions

**Files:**
- API routes: `route.ts` (in `[segment]/` directories per Next.js convention)
- Components: `ComponentName.tsx` (PascalCase)
- Utilities/hooks: `use-something.ts` or `something-helper.ts` (kebab-case)
- Types: Defined inline in files or in exported interfaces

**Directories:**
- API: `api/[service]/[endpoint]/` structure (e.g., `api/linear/team/`)
- Components: `components/` with optional subdirectories (e.g., `components/tambo/`)
- Pages: Direct files in `app/` or `app/[segment]/page.tsx`

**Variables & Functions:**
- Observed pattern: camelCase for functions and variables
- React hooks: `use*` prefix (useTambo, useFetchJSON, useFilteredMemberIds)
- Status values: "on-track" | "at-risk" | "idle" (kebab-case strings)
- Zod schemas: PascalCase + "Schema" suffix (teamOverviewSchema, personDetailSchema)

## Where to Add New Code

**New Tambo-Controlled Component:**
1. Create file: `src/components/FeatureName.tsx`
2. Define Zod schema: `export const featureNameSchema = z.object({...})`
3. Export component: `export function FeatureName({...}) {...}`
4. Register in `src/lib/tambo.ts`:
   ```typescript
   {
     name: "FeatureName",
     description: "What this component does",
     component: FeatureName,
     propsSchema: featureNameSchema,
   }
   ```

**New Tambo Tool (Data Fetching Function):**
1. Create API endpoint: `src/app/api/service/endpoint/route.ts`
   - Use `withLinearClient` or `withGitHubToken` wrapper
   - Return `NextResponse.json(data)`
2. Define tool in `src/lib/tambo.ts`:
   ```typescript
   const myTool = defineTool({
     name: "toolName",
     description: "What the tool does",
     tool: async ({ param1, param2 }) => {
       return apiFetch<ReturnType>(`/api/service/endpoint?param1=${param1}`);
     },
     inputSchema: z.object({...}),
     outputSchema: z.object({...}),
   });
   ```
3. Add to `tools` array in tambo.ts

**New API Route (without Tambo Tool):**
1. Create file: `src/app/api/service/endpoint/route.ts`
2. Use route wrapper (withLinearClient, withGitHubToken, etc.)
3. Export GET/POST handler
4. Use getTokenHeaders() if calling from client components

**New Hook (Client-Side):**
1. Create file: `src/lib/use-feature-name.ts`
2. Export function: `export function useFeatureName() {...}`
3. Use React hooks and Tambo SDK hooks as needed

**New Utility/Helper:**
1. Create file: `src/lib/feature-helper.ts` or add to existing file
2. Export functions as needed

## Special Directories

**`src/app/api/`:**
- Purpose: All backend API routes
- Generated: No (manually created)
- Committed: Yes
- Pattern: Routes use Next.js `route.ts` files in segment directories
- Auth: Token passed in headers (x-linear-api-key, x-github-token)

**`.planning/codebase/`:**
- Purpose: Architecture analysis documents
- Generated: By GSD mapper (initially), can be updated manually
- Committed: Yes
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by npm install)
- Committed: No

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by npm run build)
- Committed: No

**`public/`:**
- Purpose: Static assets (served at root)
- Generated: No (manually created)
- Committed: Yes

---

*Structure analysis: 2026-03-03*
