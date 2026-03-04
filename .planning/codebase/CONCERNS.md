# Codebase Concerns

**Analysis Date:** 2025-03-03

## Tech Debt

**Large UI Components:**
- Issue: `src/components/tambo/message-input.tsx` (1,611 lines) and `src/components/tambo/message.tsx` (1,001 lines) are significantly oversize
- Files: `src/components/tambo/message-input.tsx`, `src/components/tambo/message.tsx`, `src/components/tambo/text-editor.tsx` (856 lines)
- Impact: Difficult to maintain, test, and reason about. Changes to one feature may inadvertently affect others. Increased cognitive load when debugging.
- Fix approach: Extract focused sub-components. For example, message-input could be split into ResourceSuggestions, PromptSuggestions, ImageUpload, and InputCore. Message could separate ToolUseDisplay, ComponentDisplay, and MarkdownRendering into separate modules.

**Type Safety Gaps:**
- Issue: 48 instances of `any`, `unknown`, or `@ts-ignore` comments scattered throughout the codebase
- Files: Primarily in `src/components/tambo/markdown-components.tsx` (explicit `any` in line 130-131), `src/components/tambo/text-editor.tsx` (line 749 cast to `unknown`), `src/components/tambo/message-input.tsx` (line 934 cast to `unknown`)
- Impact: Potential runtime errors at type boundaries; harder to track data flow through elicitation and MCP components
- Fix approach: Use strict generic types instead of `any`. For React component types, use `React.ComponentType<Props>` or extracted interface. For event handling, use proper React event types instead of casting.

**Unguarded JSON Operations:**
- Issue: Multiple `JSON.parse` calls without validation; stored data assumed valid
- Files: `src/components/tambo/mcp-config-modal.tsx` (lines 43, 489, 515), `src/components/tambo/message-input.tsx` (line 438), `src/lib/user-tokens.ts` (lines 119, 136)
- Impact: Malformed stored data crashes components; no graceful degradation if localStorage is corrupted
- Fix approach: Wrap all `JSON.parse` in try-catch blocks. Add schema validation using Zod for mcp-servers and team config before using parsed data.

## Error Handling Gaps

**API Error Handling:**
- Issue: No error recovery in client-side API calls; failed network requests silently return empty data structures
- Files: `src/lib/tambo.ts` (apiFetch function lines 13-18 throws raw errors), API routes have no timeout handling
- Impact: Silent failures when Linear/GitHub services are down; users see empty lists instead of error messages
- Fix approach: Implement exponential backoff retry logic in apiFetch. Add user-facing error states in components. Return typed error responses from API routes with helpful messages.

**Async Error Handling in React:**
- Issue: Multiple Promise chains without proper error boundaries; errors logged to console but not surfaced to user
- Files: `src/components/tambo/message-input.tsx` (lines 196-198 fetch errors logged but state not updated), `src/components/tambo/thread-history.tsx` (lines 234, 420 errors logged only)
- Impact: Thread creation/switching failures appear as frozen UI; no user notification
- Fix approach: Create a dedicated error state management system. Use React Error Boundaries for component-level errors. Add user-facing toast notifications for API failures.

**Missing Timeout Handling:**
- Issue: Crypto operations in `src/lib/user-tokens.ts` and HTTP requests lack timeouts
- Files: `src/lib/user-tokens.ts` (deriveKey function), all fetch calls in API routes and client code
- Impact: If encryption or API is slow, page becomes unresponsive; user has no indication request is in-flight
- Fix approach: Add AbortSignal with timeout to all fetch calls (suggested 30s). Add UI feedback during slow crypto operations.

## Security Considerations

**Sensitive Data in localStorage:**
- Risk: GitHub and Linear tokens encrypted with PBKDF2 key derived from userId, but if browser storage is compromised, encrypted values persist
- Files: `src/lib/user-tokens.ts` (encryption/storage logic), `src/components/tambo/mcp-config-modal.tsx` (MCP server URLs stored unencrypted)
- Current mitigation: AES-GCM encryption with 100,000 PBKDF2 iterations; good, but 12-byte IV for GCM is minimal (should be per-operation)
- Recommendations: (1) Add session timeout to clear tokens after inactivity. (2) Store only short-lived session tokens, not permanent API keys. (3) Encrypt MCP server URLs if they contain credentials. (4) Consider secure cookie storage instead of localStorage.

**Missing CSRF Protection:**
- Risk: POST/mutation endpoints in API lack CSRF tokens; MCP server URLs added via modal are not validated
- Files: `src/app/api/` routes accept mutations via withLinearClient/withGitHubToken; no CSRF validation
- Current mitigation: None detected
- Recommendations: (1) Add SameSite cookie policy. (2) Implement CSRF token validation for state-changing operations. (3) Validate MCP server URLs (must be HTTPS, allowlist known MCP servers).

**Client-Side User Resolution:**
- Risk: GitHub/Linear user lookups in `src/lib/github-client.ts` (lines 16-28) and `src/app/page.tsx` rely on email/name matching, which could resolve to wrong user in shared email domains
- Files: `src/lib/github-client.ts` (resolveGitHubLogin), `src/lib/tambo.ts` (findGitHubUser tool)
- Current mitigation: Email search preferred, then org member matching
- Recommendations: (1) Add warnings when multiple matches found. (2) Require explicit user selection if confidence is low. (3) Log user resolutions for audit.

## Performance Bottlenecks

**N+1 Issue Resolution in Linear Routes:**
- Problem: Team member status calculated by fetching all team issues, then iterating to find assignee stats (inefficient graph traversal)
- Files: `src/app/api/linear/team/route.ts` (lines 51-92), `src/app/api/linear/risks/route.ts` (lines 31-93)
- Cause: Linear SDK doesn't support filtering issues by multiple assignees; must fetch all and filter in-memory
- Current scale: Tested with ~200 issues; at 1000+ issues per team, response time will exceed 10s
- Improvement path: (1) Implement caching layer with 5-minute TTL. (2) Use Linear's cursor pagination to stream results. (3) Cache team member stats separately from team list.

**Unbounded Promise.all in API Routes:**
- Problem: `Promise.all` used to fetch state/assignee for all issues concurrently; no backpressure control
- Files: `src/app/api/linear/team/route.ts` (line 59), `src/app/api/linear/cycle/route.ts` (line 13), `src/app/api/linear/search/route.ts` (line 23)
- Cause: Linear SDK's lazy-loading fields mean each Promise.all fires a separate HTTP request
- Impact: If team has 500 issues, 500+ concurrent requests to Linear API; potential rate-limiting or service degradation
- Improvement path: (1) Batch requests in groups of 50. (2) Implement Linear API rate limit handling with exponential backoff. (3) Return partial data with error flag if rate-limited.

**Message Rendering Performance:**
- Problem: Large chat histories with 100+ messages render all messages in DOM; no virtualization
- Files: `src/components/tambo/scrollable-message-container.tsx`, `src/components/tambo/thread-content.tsx`
- Impact: Scrolling becomes janky; memory usage grows linearly with message count
- Improvement path: Implement react-window or similar virtualization library for message lists. Lazy-load message content.

**Debounce Settings Too Aggressive:**
- Problem: Resource/prompt search debounced at 200ms, causing noticeable UI lag
- Files: `src/components/tambo/message-input.tsx` (line 141: EXTERNAL_SEARCH_DEBOUNCE_MS = 200)
- Cause: Original intent likely to avoid overwhelming MCP servers; but local MCP resources are instant
- Improvement path: Differentiate MCP resources (no debounce) from external resources (50ms debounce).

## Fragile Areas

**MCP Server Configuration:**
- Files: `src/components/tambo/mcp-config-modal.tsx`
- Why fragile: localStorage-based config with no persistence layer; if tab crashes during config save, config lost. Multiple listeners for 'mcp-servers-updated' event can race. No validation of server URLs before adding.
- Safe modification: (1) Add IndexedDB backup layer. (2) Persist to backend after validation. (3) Use single-source-of-truth state manager. (4) Add URL validation (must be HTTPS, valid domain).
- Test coverage: No tests detected for MCP config persistence or parsing.

**User Token Encryption Key Derivation:**
- Files: `src/lib/user-tokens.ts` (deriveKey function)
- Why fragile: If userId changes (account migration), all encrypted tokens become unreadable. Key derivation happens at runtime with no memoization; every decrypt call re-derives key. Salt is hardcoded string, not random.
- Safe modification: (1) Add version number to encrypted values; allow key rotation. (2) Cache derived key in memory. (3) Use random salt per encryption, store with ciphertext. (4) Add migration path if userId changes.
- Test coverage: No unit tests for encryption/decryption.

**Linear API Error Handling:**
- Files: `src/app/api/linear/team/route.ts`, `src/app/api/linear/risks/route.ts`
- Why fragile: No handling for partial failures; if one issue fetch fails in Promise.all, entire response fails. No fallback if team.issues() returns empty (treated as success, not error).
- Safe modification: (1) Use Promise.allSettled instead of Promise.all; aggregate errors. (2) Return partial results with error array. (3) Validate team existence before fetching issues.
- Test coverage: No integration tests for API routes.

## Missing Critical Features

**No Offline Support:**
- Problem: All features require working GitHub/Linear connection; no cached data for offline use
- Blocks: Users cannot view previous team status/reports without network
- Solution: Implement service worker + IndexedDB cache of recent API responses with timestamp

**No User Session Timeout:**
- Problem: Tokens persist in localStorage indefinitely; if device is left unlocked, attacker can use tokens
- Blocks: Security compliance for sensitive development environments
- Solution: Add 30-minute inactivity timeout; prompt user to re-authenticate

**No API Rate Limit Handling:**
- Problem: GitHub/Linear API calls can be rate-limited, but no detection or backoff
- Blocks: High-volume usage (large teams) will see service degradation without feedback
- Solution: Parse rate-limit headers; return 429 with retry-after; implement token bucket

**No Audit Logging:**
- Problem: No record of which user accessed which data; no compliance trail
- Blocks: Security and compliance requirements for enterprise deployment
- Solution: Log all API calls with user context to backend

## Test Coverage Gaps

**No API Route Tests:**
- What's not tested: GET handlers in `src/app/api/linear/*` and `src/app/api/github/*`
- Files: All files under `src/app/api/`
- Risk: Regressions in complex data transformation (team member status calculation, issue filtering) go undetected. Changes to query parameters break silently.
- Priority: High — these are core data endpoints

**No Component Integration Tests:**
- What's not tested: MessageInput with external resource provider, MCP resource selection flow, thread creation/switching
- Files: `src/components/tambo/message-input.tsx`, `src/components/tambo/thread-history.tsx`, `src/components/tambo/mcp-config-modal.tsx`
- Risk: UI flows (especially async flows) can break without detection. Error states untested.
- Priority: High — these are user-facing features

**No Encryption/Decryption Unit Tests:**
- What's not tested: Token encryption, key derivation, decryption with corrupted data
- Files: `src/lib/user-tokens.ts`
- Risk: Crypto changes could silently break token storage; corruption handling unknown
- Priority: Medium — security-critical but rarely changes

**No Linear/GitHub Client Integration Tests:**
- What's not tested: Actual API calls to Linear/GitHub; auth header handling; error responses
- Files: `src/lib/tambo.ts` (apiFetch), `src/lib/linear-client.ts`, `src/lib/github-client.ts`
- Risk: Auth failures, malformed responses, or API changes break silently
- Priority: Medium — best caught with e2e tests against staging APIs

## Dependencies at Risk

**@tambo-ai/react (v1.0.1):**
- Risk: Tambo SDK is young (v1.0.1); API surface may change; community support limited
- Impact: If SDK has breaking changes, codebase tightly coupled (heavy use of useTambo*, TamboProvider, component registration)
- Migration plan: (1) Track v2.x releases. (2) Create abstraction layer around Tambo hooks in `src/lib/tambo-wrapper.ts` to reduce coupling. (3) Keep local fork of compatibility shim if needed.

**better-auth (v1.4.19):**
- Risk: Better-auth is in active development; session/token handling is critical
- Impact: Authentication failures would lock out all users
- Migration plan: (1) Monitor for security patches. (2) Have backup auth implementation sketched (e.g., next-auth). (3) Lock to minor version in package.json.

**Linear SDK (@linear/sdk v76.0.0):**
- Risk: Linear frequently updates API; SDK may lag or introduce breaking changes
- Impact: API routes could fail if SDK doesn't support queries used in `src/app/api/linear/*`
- Migration plan: (1) Test SDK updates in staging. (2) Implement API version negotiation. (3) Keep fallback to REST API if SDK unavailable.

---

*Concerns audit: 2025-03-03*
