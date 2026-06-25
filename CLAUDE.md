# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start dev server (Turbopack)
npm run build          # Production build (lint + typecheck + compile)
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run db:generate    # Drizzle schema → SQL migration
npm run db:push        # Push schema to database (dev)
npm run db:migrate     # Run migrations (prod)
npm run db:studio      # Drizzle Studio (DB GUI)
npm run db:seed        # Create tables via seed.ts (requires DATABASE_URL)
```

No test suite is configured. Verify changes with `npm run typecheck` and `npm run build`.

## Architecture

**Stack:** Next.js 16 (App Router, React 19, Turbopack), TypeScript, Tailwind v4 (CSS-first config with `@utility` directives), PostgreSQL via Drizzle ORM, NextAuth v5 (JWT strategy, magic links via Bird Email API), Cloudflare R2 (presigned URLs), Upstash Redis (rate limiting), deployed on Vercel.

**Path alias:** `@/*` maps to `./src/*`

### Route Groups

- `src/app/(marketing)/` — Public lead-generation site. Its own layout with Navigation/Footer.
- `src/app/(auth)/` — Login and verify-request pages. Split-screen layout (brand panel + form).
- `src/app/portal/` — Authenticated client portal. Layout wraps everything in `<SessionProvider>` with sidebar nav + header.
- `src/app/api/` — All REST endpoints. Protected routes require JWT token via middleware.

### Security & Auth Flow

`middleware.ts` runs on all `/portal/*` and `/api/*` routes:
1. CSRF: Validates Origin header against Host on all mutations (except `/api/auth`).
2. Auth: Unauthenticated requests to protected API routes get 401 JSON; portal routes redirect to `/login`.
3. Security headers: HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff.

Every `/api/projects/[projectId]/*` route independently checks project membership — admins bypass, clients must be in `project_members`. The project layout (`src/app/portal/projects/[projectId]/layout.tsx`) also gates access server-side.

Roles: `admin` (full access, can create projects/manage members) and `client` (can only see/interact with assigned projects).

### Data Layer

- **Schema:** `src/lib/db/schema.ts` — Single source of truth. Drizzle + postgres-js.
- **Connection:** `src/lib/db/index.ts` — Pools limited to 1 on Vercel (serverless), 10 locally.
- **Migrations:** `drizzle/` directory. Run `db:generate` after schema changes, `db:push` for dev.
- **Key constraints:** `projects.ownerId` uses `onDelete: 'restrict'` (must reassign before user deletion). `tasks.assigneeId` uses `set null`. Auth tables cascade on user delete.

### Design System

Defined in `src/app/globals.css` using CSS custom properties:
- Surface elevation: `--surface-0` through `--surface-4` (darkest to lightest)
- Brand: `--brand-primary` (#E8302A), `--brand-hover`, `--brand-muted`, `--brand-subtle`
- Text hierarchy: `--text-primary`, `--text-secondary`, `--text-tertiary`
- Status: `--status-success`, `--status-warning`, `--status-danger`, `--status-info`

Backward-compat utility classes (`bg-navy`, `bg-red`, `text-slate`, `border-brand`) reference these variables. The portal uses `.dark` class on the root wrapper.

shadcn/ui components live in `src/components/ui/`. Portal components in `src/components/portal/`.

### File Upload Flow

1. Client POSTs to `/api/projects/[projectId]/files/presign` with filename, type, size.
2. Server validates membership, MIME type allowlist, max 50MB, sanitizes filename, returns presigned PUT URL + key.
3. Client PUTs file directly to R2 using the presigned URL.
4. Client POSTs metadata (key, name, size, mimeType) to `/api/projects/[projectId]/files` — server validates key prefix matches projectId.

### Email (Bird API)

`src/lib/bird.ts` — Central email module. Sends via Bird REST API (`POST /v1/email/messages` on `eu1.platform.bird.com`). Exports: `sendEmail`, `sendMagicLinkEmail`, `sendProjectInviteEmail`, `sendTaskAssignedEmail`, `sendCommentNotificationEmail`, `sendDigestEmail`. Auth emails disable click/open tracking so magic links go directly to the app. Domain: `elphatechsolutions.com` (verified, return_path CNAME active).

### Notifications & Cron

`src/lib/notifications.ts` provides `createNotification()` and `createBulkNotifications()`. A Vercel cron (`/api/cron/digest`) runs daily at 8am, batches unread notifications into a digest email per user, then marks them as emailed via Bird.

### Rate Limiting

`src/lib/rate-limit.ts` exports three Upstash Redis limiters: `authLimiter` (5/15min), `apiLimiter` (60/min), `contactLimiter` (3/hour). Currently applied to presign and contact routes.

## Key Patterns

- **API route params:** Next.js 16 uses `params: Promise<{ ... }>` — always `await params`.
- **Auth check pattern:** `const session = await auth(); if (!session?.user) return 401;` then check role/membership.
- **Optimistic UI:** The kanban board uses local state + `onDragOver` for instant card movement, persists via PATCH on drop, reverts on failure.
- **Server components** fetch data directly from DB. Client components call API routes and use `router.refresh()` for revalidation.
- **No global state:** No Zustand/Redux. Server components own data; client components use local state + `useSession()` for role checks.
