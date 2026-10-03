# ElphaTech Solutions — Marketing Site

Next.js 16 (App Router, TypeScript, Tailwind v4), deployed on Vercel. Public marketing site only — there is no login, portal, database or file storage.

## Structure
- `src/app/(marketing)/page.tsx` — the single public page
- `src/components/marketing/` — page sections (Navigation, Hero, Services, Work, Contact, ...)
- `src/content/marketing.ts` — case studies, testimonials, tech list (edit and redeploy)
- `src/app/api/contact/route.ts` — contact form: same-origin check, Upstash rate limit, then HubSpot lead + deal and a notification email via Bird, in parallel
- `src/lib/hubspot.ts` — creates/updates the contact and opens a deal in the first pipeline stage
- `src/lib/bird.ts` — `sendEmail` via the Bird API
- `src/lib/rate-limit.ts` — Upstash limiter (contact form: 3/hour/IP; no-op with a console warning if credentials are missing)
- Security headers and old-URL redirects (`/login`, `/portal/*` -> `/`) live in `next.config.ts`

## Commands
```bash
npm run dev | build | start | lint
npx tsc --noEmit
```
No test suite.

## Env vars
`BIRD_ACCESS_TOKEN`, `BIRD_API_URL`, `EMAIL_FROM`, `HUBSPOT_ACCESS_TOKEN` (optional `HUBSPOT_DEAL_STAGE`, `HUBSPOT_DEAL_PIPELINE`), `KV_REST_API_URL`, `KV_REST_API_TOKEN` (created by Vercel's Upstash integration; `UPSTASH_REDIS_REST_*` also accepted).

## Notes
- Prospects are managed in HubSpot (Deals pipeline); client project updates happen outside this codebase.
- Do not reintroduce a public login page on this domain without reading `SECURITY_AUDIT.md` (it is a phishing-heuristic risk).
- Brand colors are Tailwind custom utilities (`bg-navy`, `bg-red`, `text-slate`) defined in `src/app/globals.css`.
