# Technology Stack

**Analysis Date:** 2026-03-03

## Languages

**Primary:**
- TypeScript 5.9.3 - Full codebase (src/, API routes, components)
- JSX/TSX - React components and Next.js pages

**Secondary:**
- JavaScript - ESLint and PostCSS configuration files
- CSS - Tailwind CSS styling via utility-first approach

## Runtime

**Environment:**
- Node.js 18+ (inferred from package.json and Next.js 15 requirements)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- Next.js 15.5.7 - Full-stack React framework with App Router
- React 19.1.1 - UI component library
- React DOM 19.1.1 - DOM rendering

**UI & Styling:**
- Tailwind CSS 4 - Utility-first CSS framework with dark mode support
- @tailwindcss/postcss 4.1.17 - Tailwind PostCSS plugin
- @tailwindcss/oxide 4.1.17 - Rust-based CSS compilation
- class-variance-authority 0.7.1 - Type-safe component variant management
- tailwind-merge 3.4.0 - Utility conflict resolution
- clsx 2.1.1 - Conditional class concatenation

**AI Framework:**
- @tambo-ai/react 1.0.1 - AI assistant component library and hooks

**Text Editing:**
- @tiptap/react 3.17.1 - Rich text editor library
- @tiptap/extension-* (various 3.17.1) - Document, paragraph, text, mention, placeholder, hard-break extensions
- @tiptap/suggestion 3.17.1 - Mention and suggestion handling

**UI Components:**
- @radix-ui/react-dropdown-menu 2.1.16 - Unstyled dropdown component
- @radix-ui/react-popover 1.1.15 - Popover component
- @radix-ui/react-tooltip 1.2.7 - Tooltip component
- lucide-react 0.554.0 - Icon library

**Data & Visualization:**
- recharts 3.5.0 - React charting library for bar, line, pie charts
- zod 3.14.2+ (implied by usage) - TypeScript-first schema validation
- json-stringify-pretty-compact 4.0.0 - Compact JSON formatting

**Animation:**
- framer-motion 12.23.24 - React animation library

**Utilities:**
- use-debounce 10.1.0 - Debounce hook for React
- dompurify 3.3.0 - DOM sanitization (security)
- highlight.js 11.11.1 - Syntax highlighting
- streamdown 1.6.7 - Markdown streaming utilities

**Testing:**
- No test framework configured (manual testing via dev server)

**Build/Dev:**
- TypeScript 5.9.3 - Type checking
- ESLint 9 - JavaScript linting
- eslint-config-next 16.0.4 - Next.js linting rules
- postcss 8.5.6 - CSS transformation
- autoprefixer 10.4.22 - CSS vendor prefixing
- @types/node 24.3.0 - Node.js type definitions
- @types/react 19 - React type definitions
- @types/react-dom 19 - React DOM type definitions
- @types/dompurify 3.2.0 - DOMPurify type definitions

## Key Dependencies

**Critical:**
- @linear/sdk 76.0.0 - Linear API client for issue tracking integration
- better-auth 1.4.19 - Authentication framework with OAuth2 support
- @libsql/kysely-libsql 0.4.1 - Turso database dialect for Kysely ORM
- kysely 0.28.11 - SQL query builder and type-safe ORM

**Infrastructure:**
- libsql (external) - SQLite-compatible database driver (Node-only, externalized in next.config.ts)
- @libsql/client (external) - Turso client (Node-only, externalized in next.config.ts)

## Configuration

**Environment:**
- `.env.local` file (present but not committed)
- Environment variables required:
  - `NEXT_PUBLIC_TAMBO_API_KEY` - Tambo AI API key (public)
  - `BETTER_AUTH_SECRET` - Authentication secret (generated via openssl)
  - `BETTER_AUTH_URL` - Auth redirect URL
  - `GOOGLE_CLIENT_ID` - Google OAuth client ID
  - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
  - `TURSO_DATABASE_URL` - Database connection string
  - `TURSO_AUTH_TOKEN` - Database authentication token

**Build:**
- `tsconfig.json` - TypeScript compiler configuration (strict mode enabled, ES2017 target, path aliases)
- `next.config.ts - Next.js configuration
  - ESLint ignored during builds (run separately via `npm run lint`)
  - Native/Node packages externalized: `@libsql/client`, `@libsql/kysely-libsql`, `libsql`
  - Webpack aliases for optional peer dependencies
- `eslint.config.mjs` - ESLint flat config (next/core-web-vitals, next/typescript)
- `postcss.config.mjs` - PostCSS configuration with Tailwind plugin
- `tailwind.config.ts` - Tailwind CSS configuration (dark mode class-based, theme customization, CSS variables)

## Platform Requirements

**Development:**
- Node.js 18+
- npm package manager
- Git (version control)
- Web browser with modern JavaScript support

**Production:**
- Node.js 18+ runtime
- Environment variables as specified above
- Turso database (SQLite-compatible)
- Google OAuth app credentials
- Linear API access
- Tambo AI API key

---

*Stack analysis: 2026-03-03*
