# The Standup App

Multi-tenant AI standup dashboard built with [Tambo AI](https://tambo.co). Create teams, invite members, connect Linear and GitHub via OAuth, and ask natural language questions — the AI renders interactive components on a live canvas.

https://github.com/user-attachments/assets/d17682a7-e9e3-401e-b8a3-998aaf258d06

## What you can ask

- "Show me the team" — renders a full team overview with statuses
- "What's Sarah working on?" — pulls up her Linear issues and GitHub PRs
- "What's at risk?" — surfaces overdue, stale, and unassigned items
- "Show me a breakdown of issue status" — generates a chart
- "What did the team ship this week?" — builds a custom summary

## Features

- **Conversational AI canvas** — ask questions in plain English, get interactive components on an adaptive grid (up to 4 at once, dismissable, drag-to-reorder)
- **Multi-tenant teams** — personal workspaces, shared teams with roles (owner/member), team switching
- **Invite system** — shareable invite links and email invites with expiry and usage limits
- **Linear + GitHub OAuth** — connect accounts via WorkOS, data is fetched per-team across all members
- **Member filter** — focus on specific team members; filters apply across all components and AI responses
- **WorkOS AuthKit** — sign-in, session management, and org-level membership sync

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file and fill in your values:

```bash
cp example.env.local .env.local
```

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_TAMBO_API_KEY` | [tambo.co/dashboard](https://tambo.co/dashboard) |
| `WORKOS_CLIENT_ID` | [WorkOS Dashboard](https://dashboard.workos.com) |
| `WORKOS_API_KEY` | [WorkOS Dashboard](https://dashboard.workos.com) |
| `WORKOS_COOKIE_PASSWORD` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | `http://localhost:3000/api/auth/callback` for local dev |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | [Turso dashboard](https://turso.tech) |

3. Run database migrations:

```bash
npm run db:migrate
```

4. Verify the schema (optional):

```bash
npm run db:verify
```

5. Start the dev server:

```bash
npm run dev
```

6. Open [localhost:3000](http://localhost:3000) and sign in.

7. Open **Settings** and connect your GitHub and Linear accounts via OAuth.

8. Create or join a team and start asking questions.

## Components

The AI decides which components to render based on your question.

| Component | Trigger | Data source |
|-----------|---------|-------------|
| **TeamOverview** | "show me the team" | Linear team members + stats |
| **PersonDetail** | "what's [name] working on?" | Linear issues + GitHub PRs |
| **PullRequestList** | "show PRs for [repo]" | GitHub PRs by repo/org/author |
| **RiskReport** | "what's at risk?", "blockers" | Overdue/stale/unassigned Linear issues |
| **WeeklyGoals** | "what are we working on this week?" | AI-assembled from tool results |
| **SummaryPanel** | Any structured info request | AI-assembled (stats, sections, body text) |
| **Graph** | "show me a chart of..." | Recharts (bar, line, or pie) |

## Project structure

```
src/
├── app/
│   ├── page.tsx                # Landing page
│   ├── app/
│   │   ├── page.tsx            # App entry point
│   │   └── app-shell.tsx       # Main shell + AI canvas
│   ├── invite/[token]/         # Invite link acceptance
│   └── api/
│       ├── auth/callback/      # WorkOS AuthKit callback
│       ├── teams/              # Create, delete, update, switch, join, leave, invite, members
│       ├── connections/        # GitHub/Linear OAuth status
│       ├── github/             # PR endpoints
│       └── linear/             # Issues, team, risks, cycle, search
├── components/
│   ├── tambo/                  # AI-rendered canvas components
│   ├── team-settings-modal.tsx # Settings (general, invite, members, connections)
│   ├── team-switcher.tsx       # Team dropdown + creation
│   ├── team-creation-form.tsx  # New team form
│   └── user-header.tsx         # Top bar with user profile
├── lib/
│   ├── tambo.ts                # Component + tool registration
│   ├── db.ts                   # Kysely DB accessors (global, team-scoped, full)
│   ├── schema.ts               # Database type definitions
│   ├── team-actions.ts         # Team server actions
│   ├── auth-actions.ts         # Auth server actions
│   └── member-filter.ts        # Member filter logic
├── middleware.ts                # Auth, user sync, team resolution
└── migrations/                 # Database migrations (001–006)
```

## Tech stack

[Next.js 15](https://nextjs.org) / [React 19](https://react.dev) / [Tambo AI](https://tambo.co) / [WorkOS AuthKit](https://workos.com/docs/user-management/authkit) / [Turso](https://turso.tech) + [Kysely](https://kysely.dev) / [Tailwind CSS v4](https://tailwindcss.com) / [Recharts](https://recharts.org) / [Zod](https://zod.dev)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run db:migrate` | Run database migrations |
| `npm run db:verify` | Verify database schema |

## License

[MIT](LICENSE)
