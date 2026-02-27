# The Standup App

AI-powered team standup dashboard built with [Tambo AI](https://tambo.co). Connect your Linear and GitHub accounts, ask natural language questions about your team, and get rich interactive components on a live canvas.

https://github.com/user-attachments/assets/d17682a7-e9e3-401e-b8a3-998aaf258d06

## What you can ask

- "Show me the team" — renders a full team overview with statuses
- "What's Sarah working on?" — pulls up her Linear issues and GitHub PRs
- "What's at risk?" — surfaces overdue, stale, and unassigned items
- "Show me a breakdown of issue status" — generates a chart
- "What did the team ship this week?" — builds a custom summary

## Features

- **Conversational AI canvas** — ask questions in plain English, get interactive components arranged in an adaptive grid (up to 4 at once, dismissable, drag-to-reorder)
- **Linear + GitHub integration** — pulls issues, PRs, team members, and risk data in real time
- **Member filter** — focus on specific team members; filters apply across all components and AI responses
- **Per-user encrypted storage** — API keys are AES-GCM encrypted in localStorage, scoped per user
- **Google OAuth** — sign-in via Better Auth + Turso

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
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` for local dev |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | [Turso dashboard](https://turso.tech) |

3. Run the database migration:

```bash
npx @better-auth/cli@latest migrate
```

4. Start the dev server:

```bash
npm run dev
```

5. Open [localhost:3000](http://localhost:3000), sign in with Google, then open **Settings** to connect your GitHub token, GitHub org, and Linear API key. Select a team and optionally filter to specific members.

## Components

The AI decides which components to render based on your question.

| Component | Trigger | Data source |
|-----------|---------|-------------|
| **TeamOverview** | "show me the team" | Self-fetching (Linear team ID) |
| **PersonDetail** | "what's [name] working on?" | Self-fetching (Linear user ID + GitHub) |
| **RiskReport** | "what's at risk?", "blockers" | Self-fetching (Linear team ID) |
| **WeeklyGoals** | "what are we working on this week?" | AI-assembled from tool results |
| **SummaryPanel** | Any structured info request | AI-assembled (stats, sections, body text) |
| **Graph** | "show me a chart of..." | AI-assembled (bar, line, or pie) |

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Main app shell, system prompt, TamboProvider
│   ├── login/                # Login page
│   └── api/
│       ├── github/           # find-user, prs
│       └── linear/           # team, issues, risks, cycle
├── components/
│   ├── tambo/                # AI-rendered canvas components
│   ├── settings-modal.tsx    # API keys, team selection, member filter
│   └── user-header.tsx       # Top bar with user info
├── lib/
│   ├── tambo.ts              # Component + tool registration
│   ├── member-filter.ts      # Shared member filter logic (types, hooks, fetching)
│   ├── user-tokens.ts        # Encrypted per-user localStorage
│   └── use-fetch-json.ts     # Data fetching hook with auth headers
└── services/
    └── population-stats.ts   # Demo data
```

## Tech stack

[Next.js 15](https://nextjs.org) / [React 19](https://react.dev) / [Tambo AI](https://tambo.co) / [Better Auth](https://better-auth.com) + [Turso](https://turso.tech) / [Tailwind CSS v4](https://tailwindcss.com) / [Recharts](https://recharts.org) / [Zod](https://zod.dev)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |

## License

[MIT](LICENSE)
