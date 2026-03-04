# Phase 3: WorkOS Pipes Connections - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace localStorage token storage with WorkOS Pipes OAuth for GitHub and Linear. Users connect accounts via one-click OAuth flow, tokens are managed server-side via WorkOS Pipes, and the old manual token entry system (user-tokens.ts, encrypted localStorage, settings modal token inputs) is fully deleted. At least one connection is required to use the AI.

</domain>

<decisions>
## Implementation Decisions

### Connections Modal Design
- Rework existing `settings-modal.tsx` — keep as modal, not a new page or panel
- Modal contains only GitHub and Linear connection cards — no other settings
- Remove the Linear team selector and member filter from the modal (separate concerns for Phase 4+)
- Remove the GitHub organization text input field
- Title stays "Connect your accounts", no subtitle
- Triggered via existing gear icon in UserHeader component
- MCP config modal stays separate (not combined)
- Each card shows: provider icon + name, connected account username/email, status indicator, action button (Connect / Disconnect / Reconnect)

### First-Use Onboarding
- New users with no connections see an inline message in the chat/canvas area
- Message names both providers specifically: "Connect your GitHub and Linear accounts to get started"
- Message includes a button that opens the connections modal
- Text + button only — no illustrations or provider icons
- Prompt auto-disappears once the user connects at least one account
- At least one connection required to use the app meaningfully
- If user queries the AI with no connections, AI responds conversationally explaining they need to connect accounts
- No special messaging for returning users who had old localStorage tokens — treat as new

### Connection Status Visibility
- Two small generic colored dots in the user header (one per provider)
- Colors: green = connected, gray = not connected, amber = needs reauthorization
- Tooltip on hover reveals which provider and its status
- Dots are clickable — opens the connections modal
- Status checked on app load and after connections modal is closed

### Disconnect Flow
- Disconnect requires inline confirmation within the card ("Are you sure? [Yes] [Cancel]" replaces the Disconnect button)
- No separate confirmation modal (avoid modal-on-modal)
- After disconnect, the card stays visible showing "Not connected" with a Connect button

### Reauthorization Flow
- When a connection is in error state, the action button changes to "Reconnect"
- Clicking Reconnect triggers the same OAuth flow as initial connect
- Amber dot in header signals the issue; tooltip says which provider needs reauth
- If an AI query fails mid-conversation due to broken connection, AI explains it conversationally in the response

### Claude's Discretion
- Connect button mechanism (redirect-based OAuth vs embedded Pipes widget — pick based on WorkOS Pipes SDK capabilities)
- Server-side token retrieval pattern (how API routes get tokens from WorkOS Pipes instead of request headers)
- Exact card layout, spacing, and styling within the modal
- How connection status is fetched server-side (API route design)
- Error handling for failed OAuth flows
- Loading states during connect/disconnect operations

</decisions>

<specifics>
## Specific Ideas

- The modal should feel simpler and cleaner than the current settings modal — it was ~400 lines with token inputs, team selectors, and member filters. The new version is just two connection cards.
- Connection status dots should be subtle — not attention-grabbing when things are fine, but noticeable when something needs action (amber dot).
- The onboarding prompt should feel natural in the chat area, not like an error or warning — it's a friendly nudge.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/settings-modal.tsx`: Current 400-line modal — will be heavily reworked. Contains Dot component, LinearIcon component, and portal-based rendering pattern that can be reused.
- `src/components/user-header.tsx`: Contains the gear icon trigger. Will need status dots added near it.
- `src/lib/schema.ts`: ConnectionsTable already defined (id, team_id, user_id, provider: "github" | "linear", workos_connection_id, status: "active" | "inactive" | "error").
- `src/lib/db.ts`: teamDb(teamId) scoped accessor already handles connections table queries.

### Established Patterns
- Server-component-first: User data fetched server-side in page.tsx, passed as props to AppShell.
- API routes use `withGitHubToken()` and `withLinearClient()` wrappers — these read tokens from `x-github-token` / `x-linear-api-key` headers. Must be changed to server-side WorkOS Pipes token lookup.
- Modal pattern: settings-modal uses createPortal, backdrop blur, Escape key handling.
- Middleware extends auth check — can add connection status checks here.

### Integration Points
- `src/lib/user-tokens.ts` — DELETE entirely (CONN-08). All 156 lines of encrypted localStorage token management.
- `src/components/settings-modal.tsx` — REWRITE as connections-only modal.
- `src/lib/github-client.ts` — Change `withGitHubToken()` from header-based to server-side WorkOS Pipes token retrieval.
- `src/lib/linear-client.ts` — Change `withLinearClient()` from header-based to server-side WorkOS Pipes token retrieval.
- `src/components/user-header.tsx` — Add status dots, keep gear icon trigger.
- `src/lib/tambo.ts` — Currently references `getTokenHeaders()` from user-tokens.ts. Must be updated.
- `src/lib/use-fetch-json.ts` — Uses `getTokenHeaders()` to add tokens to fetch calls. Must be updated.
- `src/lib/member-filter.ts` — Uses `getTokenHeaders()`. Must be updated.
- All API routes in `src/app/api/github/` and `src/app/api/linear/` — Must switch from header-based tokens to server-side lookup.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-workos-pipes-connections*
*Context gathered: 2026-03-03*
