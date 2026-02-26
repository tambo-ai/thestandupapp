# The Standup App

AI-powered team standup dashboard that pulls data from Linear and GitHub. Built with [Tambo AI](https://tambo.co) for generative UI.

Ask natural language questions about your team and get rich, interactive components on a canvas — team overviews, person details, risk reports, weekly goals, charts, and custom summaries.

https://github.com/user-attachments/assets/d17682a7-e9e3-401e-b8a3-998aaf258d06

## Features

- **Google OAuth** sign-in via Better Auth + Turso
- **Per-user API keys** for GitHub and Linear (encrypted in localStorage)
- **AI canvas** with up to 4 components in an adaptive grid, drag-and-drop reordering
- **Self-fetching components** — TeamOverview, PersonDetail, RiskReport pull their own data
- **AI-controlled components** — WeeklyGoals, SummaryPanel, Graph are filled by the AI
- **GitHub org member matching** — configure your GitHub org for reliable user lookups

## Setup

1. Clone and install:

```bash
npm install
```

2. Copy the example env file and fill in your values:

```bash
cp example.env.local .env.local
```

You need:
- `NEXT_PUBLIC_TAMBO_API_KEY` — from [tambo.co/dashboard](https://tambo.co/dashboard)
- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`
- `BETTER_AUTH_URL` — `http://localhost:3000` for local dev
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — from [Turso dashboard](https://turso.tech)

3. Run the database migration:

```bash
npx @better-auth/cli@latest migrate
```

4. Start the dev server:

```bash
npm run dev
```

5. Open [localhost:3000](http://localhost:3000), sign in with Google, then open Settings to enter your GitHub token, GitHub org, and Linear API key.

## Components

| Component | Description |
|-----------|-------------|
| TeamOverview | All team members with status, issue counts, top issue |
| PersonDetail | One person's Linear issues and GitHub PRs |
| RiskReport | Overdue, stale, and unassigned items |
| WeeklyGoals | Progress tracker with grouped items |
| SummaryPanel | Flexible panel for any structured data |
| Graph | Bar, line, or pie charts |

## Tech Stack

- [Next.js](https://nextjs.org) 15 with App Router
- [React](https://react.dev) 19
- [Tambo AI](https://tambo.co) for generative UI
- [Better Auth](https://better-auth.com) + [Turso](https://turso.tech) for authentication
- [Tailwind CSS](https://tailwindcss.com) v4
- [Recharts](https://recharts.org) for charts
- [Zod](https://zod.dev) for schema validation

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
