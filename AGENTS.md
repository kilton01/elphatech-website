# ElphaTech Solutions — Full-Stack Web App

Next.js 16 (App Router, TypeScript, Tailwind v4) with PostgreSQL (Drizzle ORM), NextAuth v5 (magic links), Cloudflare R2 file storage, and Deployed on Vercel.

## Structure
- `src/app/(marketing)/` — public lead-generation site (Hero, Services, Work, Contact)
- `src/app/portal/` — client portal (protected by auth)
- `src/app/api/` — Next.js API routes (auth, contact, projects, tasks, files)
- `src/components/marketing/` — marketing page components (Navigation, Hero, Services, etc.)
- `src/components/portal/` — portal components (KanbanBoard, FileUpload, PortalNav, PortalHeader)
- `src/lib/db/schema.ts` — Drizzle schema (users, accounts, sessions, projects, tasks, files, comments, activities)
- `src/lib/auth.ts` — NextAuth v5 config (magic links via SMTP2Go)
- `src/lib/r2.ts` — Cloudflare R2 client with presigned URL support
- `src/content/case-studies/` — MDX case study files
- `seed.ts` — database seed script (creates tables)

## Developer Commands
```bash
npm run dev            # Start dev server
npm run build          # Production build (lint + typecheck + compile)
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run db:generate    # Drizzle schema → SQL migration
npm run db:push        # Push schema to database (dev)
npm run db:migrate     # Run migrations (prod)
npm run db:studio      # Drizzle Studio (DB GUI)
npm run db:seed        # Create tables via seed.ts (requires DATABASE_URL)
```

## Database
- Local: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/elphatech`
- Before running seed: ensure Postgres is running and database exists
- Auth tables: `users`, `accounts`, `sessions`, `verification_tokens`
- App tables: `projects`, `project_members`, `tasks`, `files`, `comments`, `activities`
- Enums: `role` (admin/client), `task_status` (todo/in_progress/review/done), `task_priority` (low/medium/high/urgent)

## Auth
- Magic links via NextAuth v5 Email provider + SMTP2Go
- Credentials provider also configured (email + bcrypt password)
- JWT strategy (stateless, edge-compatible)
- middleware.ts protects `/portal/*`
- Roles: admin (you), client (view-only assigned projects)

## Key Conventions
- Marketing site uses Tailwind custom colors: `bg-navy`, `bg-navy2`, `bg-red`, `text-slate`, `border-brand`
- Fonts: Sora (headings), Inter (body) via next/font/google
- shadcn/ui components in `src/components/ui/`
- Portal uses shadcn primitives + custom components
- Contact form at `/api/contact` sends via nodemailer → SMTP2Go
- R2 file uploads use presigned URLs (POST for URL → PUT file → POST metadata)
- Case studies in MDX under `src/content/case-studies/`
- SEO: sitemap.ts, robots.ts, OG metadata in marketing layout

## Zustand / State
- No global state manager — server components fetch from DB, client components use local state + revalidation
- Portal session via `auth()` server-side, `useSession()` client-side
