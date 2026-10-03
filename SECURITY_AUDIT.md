# Security Audit — elphatechsolutions.com

Date: 2026-10-03 · Scope: `elphatech/` Next.js app (the legacy static `index.html` site is superseded and was not in the deployed path), live HTTP/DNS checks of the public domain.

## 1. Executive Summary

| Question | Finding |
|---|---|
| Actual compromise / malware / injected code? | **No evidence.** No obfuscated JS, no `eval`/`new Function`/`child_process`, no iframes, no injected `<script>` (the only inline script is the JSON-LD from `src/lib/schema.ts`), no base64 payloads, no install scripts, no unknown third-party domains. The live homepage loads only same-origin scripts. `/.env`, `/.git/config`, source maps all return 404/403. |
| Security vulnerabilities? | **Yes, in dependencies** (now mostly fixed): the deployed Next.js 16.2.9 and next-auth beta.31 had 4 *critical* advisories (incl. RCE in image optimisation / `next/og`, a middleware bypass and an Auth.js email-normalisation bypass). Plus several app-level gaps (below). None indicate that anyone exploited them. |
| Suspicious behaviour? | None malicious. Several benign behaviours resemble phishing patterns (§6). |
| Likely false-positive / reputation issue? | **Yes — this is the most likely cause.** A brand-new domain with a "sign in with your email → we email you a link" page listed in the sitemap, magic-link emails from a domain whose SPF doesn't authorise the actual sender, DMARC at `p=none`, and a git history showing Chrome's phishing heuristic was already tripped once on the magic-link URL (`a1ec016 fix: token-only verify URL to avoid Chrome phishing heuristic`). |

**Bottom line:** no real compromise was found. The blocking is most plausibly reputation/heuristic-driven, aggravated by (a) the login page being promoted in the sitemap, (b) email-authentication gaps on the domain, and (c) unpatched dependencies. I could not see the actual flag source — see §7 for how to confirm it.

Limits of this review: I can't query Safe Browsing / SmartScreen / VirusTotal from here, can't see Vercel/Cloudflare dashboards or production env vars, and couldn't exercise the full magic-link flow (needs the production DB + email provider). Findings about production env are inferred.

## 2. Architecture

Next.js 16 (App Router, Turbopack) on Vercel · NextAuth v5 beta, Email (magic link) provider, JWT sessions, Drizzle adapter · Postgres · Bird (email API) · Cloudflare R2 (presigned uploads) · Upstash Redis (rate limiting) · DNS/MX on Cloudflare, `www` CNAME and apex A records to Vercel. No Dockerfile/CI; `docker-compose.yml` is dev-only Postgres. Third-party runtime requests: only `next/font/google` (self-hosted at build time) and Bird API server-side.

## 3. Findings

### Critical
| # | Finding | Evidence | Contributes to warning? | Status |
|---|---|---|---|---|
| C1 | Next.js 16.2.9 — critical RCE advisories (Image Optimisation/AVIF, `next/og`), middleware bypass with Turbopack, SSRF, cache confusion | `package.json` `"next": "16.2.9"` | Unlikely directly, but a compromised host is the other main cause of real blocklisting | **Fixed** → 16.3.8 |
| C2 | next-auth beta.31 / @auth/core <0.41.3 — email normaliser homoglyph `@` bypass (can mail a login link to an attacker-chosen address), fail-open config errors | `package.json` | No | **Fixed** → beta.32 / core 0.41.3 |
| C3 | **Live Bird API token stored in plaintext** in `../.claude/settings.json` (two saved `curl` permission entries). Outside the git repo and not found in git history, but it is a valid send-as-your-domain credential sitting in a config file/transcripts | `/home/stephen/Documents/personal-project/elphatech solutions/.claude/settings.json` | Indirectly: a leaked sender token enables spam/phishing from your domain, which *would* get it blocked | **Unresolved — rotate the Bird token now**, then delete those two entries. I did not edit that file. |

### High
| # | Finding | Evidence | Contributes? | Status |
|---|---|---|---|---|
| H1 | Daily digest cron never ran: Vercel Cron issues `GET`, route only exported `POST` (405) | `src/app/api/cron/digest/route.ts` | No | **Fixed** (GET+POST) |
| H2 | Cron auth compared against `Bearer ${process.env.CRON_SECRET}` — if unset, `Authorization: Bearer undefined` passes | same | No | **Fixed** (fails closed). Confirm `CRON_SECRET` is set in Vercel. |
| H3 | No rate limit on magic-link request endpoint (`authLimiter` defined but never used) → anyone can trigger unlimited sign-in emails from your domain (mail-bombing, spam complaints, sender-reputation damage) | `src/lib/rate-limit.ts`, none in `auth.ts` | **Yes (email reputation)** | **Fixed** in `src/middleware.ts` (5/15 min/IP) |
| H4 | Rate limiting silently becomes a no-op when `UPSTASH_REDIS_*` is missing; `.env.local` doesn't contain them, and `env.ts` (which would flag it) is imported nowhere | `rate-limit.ts`, `src/lib/env.ts` | Yes (same as H3) | **Unresolved — verify Upstash vars exist in Vercel prod.** |
| H5 | Email authentication needs verification: the apex SPF is `include:_spf.mx.cloudflare.net` only (Cloudflare *inbound* routing) and does not list Bird. CLAUDE.md says Bird's return-path CNAME is active, which can satisfy SPF alignment via the bounce domain, and Bird's DKIM selectors are unknown to me, so I could not confirm SPF/DKIM pass. DMARC is `p=none`. | `dig TXT elphatechsolutions.com` | **Possibly.** Auth-themed mail that fails DKIM/DMARC alignment is a phishing signal | **Unresolved (DNS, outside repo).** Send a magic link to a Gmail address and check "Show original" for SPF/DKIM/DMARC = PASS. Fix records from the Bird dashboard if not, then move DMARC to `quarantine`. |

### Medium
| # | Finding | Evidence | Contributes? | Status |
|---|---|---|---|---|
| M1 | `/login` was in `sitemap.xml` and indexable | `src/app/sitemap.ts` | **Yes** — advertises a credential-style page on a young domain | **Fixed** (removed; `noindex` on auth pages) |
| M2 | Security headers only applied by middleware to `/portal`, `/login`, `/api`; the homepage had only HSTS | live `curl -I /` | Minor | **Fixed** via `next.config.ts` `headers()` (+Permissions-Policy) |
| M3 | No Content-Security-Policy anywhere | — | Minor | **Unresolved (P2)** — needs nonce plumbing for Next inline scripts; do in Report-Only first |
| M4 | CSRF check did `new URL(origin)` without try/catch → 500 on malformed Origin | `src/middleware.ts` | No | **Fixed** (returns 403) |
| M5 | Remaining `npm audit` highs (11, all non-critical): `nodemailer` (peer of next-auth, not used for transport — Bird API is used), `shadcn` CLI + `fast-glob/braces/micromatch/ts-morph` (build tooling listed under `dependencies`), | `npm audit --omit=dev` | No | **Unresolved.** Move `shadcn` to `devDependencies`; nodemailer 10 is a major bump outside next-auth's peer range — wait for upstream. |
| M6 | `www` serves the site (200) instead of redirecting to apex → duplicate content/two origins | `curl -I www.` | Minor | **Unresolved** — add Vercel domain redirect |
| M7 | No CAA record | `dig CAA` | No | **Unresolved (P2)** |

### Low / hardening
- Login page said links expire in 15 min; real expiry is 24 h (inconsistent copy looks sloppy to reviewers) — **fixed**.
- Digest email fallback URL pointed to `portal.elphatechsolutions.com`, which is NXDOMAIN — **fixed** to apex. Make sure `NEXTAUTH_URL` is set to the apex.
- `/login` is served with `access-control-allow-origin: *` (Vercel static default, harmless for a static page).
- `X-XSS-Protection` is deprecated; harmless.
- `stale env.ts` references SMTP2GO vars that are no longer used and would hard-fail a production boot if it were ever imported. Delete or update.
- `trustHost: true` in NextAuth is acceptable on Vercel; ensure `NEXTAUTH_URL` is pinned.
- `/api/auth/providers` and `/api/auth/csrf` are publicly readable (normal for NextAuth).
- Upload MIME types are client-declared; downloads are forced `Content-Disposition: attachment` (good). Consider server-side content sniffing/AV scan for `application/zip`.
- Repo hygiene: `ruvector.db`, `agentdb.rvf`, `.superpowers/` and AI-tool state sit in the project tree (ignored/untracked, but keep them out of deploys).
- Lint has 20 pre-existing errors (e.g. `react-hooks/purity`), unrelated to security.

## 4. Things checked and found clean
No `eval`/dynamic code/shell exec; no `dangerouslySetInnerHTML` except trusted JSON-LD; no iframes; no `window.location` redirects; no hidden routes (all non-public API routes are behind middleware + per-route `auth()`/membership checks; public ones are `/api/contact` and `/api/marketing/*` GETs of published content); `.env*` is gitignored and absent from git history; no secrets in tracked files or history (searched for Bird/AWS/Stripe patterns and DB URLs); contact form escapes HTML and strips CR/LF from subject; cookies are NextAuth defaults (HttpOnly, Secure, SameSite=Lax); source maps not served; `robots.txt` disallows `/portal/` and `/api/`; no postinstall scripts in `package.json`; production bundle contains no outbound domains other than library doc URLs in strings.

## 5. Fixes applied (files changed)
1. `next.config.ts` — global security headers incl. Permissions-Policy.
2. `src/app/sitemap.ts`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx` — login out of sitemap, `noindex`, copy corrected.
3. `src/app/api/cron/digest/route.ts` — GET support, fail-closed secret, fallback URL.
4. `src/middleware.ts` — Origin parse hardening, magic-link rate limit.
5. `package.json` / `package-lock.json` — `next`/`eslint-config-next` 16.3.8, `npm audit fix` (next-auth beta.32, @auth/core 0.41.3, drizzle adapter 1.11.3, etc.).

Verification: `tsc --noEmit` passes; `next build` passes; local production server: `/`, `/login`, `/verify-request`, `/robots.txt`, `/sitemap.xml` → 200; `/portal` → 307 to `/login` (single redirect, same origin); `/api/projects` → 401 unauthenticated; headers present on `/`; sitemap has no `/login`; cron rejects missing and `Bearer undefined` credentials; malformed Origin → 403. `npm audit --omit=dev`: 4 critical → 0 (the 31 total included dev-tool issues; 11 high remain, see M5). **Not verified:** the full magic-link login (no DB/email in this environment) and the rate limiter under load. Test a real sign-in after deploy. There is no automated test suite in the repo.

## 6. Reputation false-positive risks
- Email-only login page on a recently registered domain, with copy like "Sign in", "magic link", and a client-portal brand panel — matches credential-harvest templates. (Mitigated: no longer in sitemap, `noindex`.)
- Magic-link URLs of the form `/api/auth/callback/email?callbackUrl=…&token=…&email=…` — a long query string containing an email and a callback URL is a known heuristic trigger (already hit once per git history). Keep the callback URL same-origin and short; avoid including `email=` where possible.
- Magic-link emails with a prominent button, if they fail SPF/DKIM alignment (H5). Click tracking is already disabled on magic-link and invite emails (`src/lib/bird.ts`), so links are not rewritten. Other Bird emails may still be tracked.
- Mail sent to clients when someone logs in ("client login alert") adds more auth-themed volume.
- Marketing site and login page share one domain; consider serving the portal from `portal.elphatechsolutions.com` so a login-page flag doesn't take down the marketing site.
- `www` and apex both serve content; Vercel's new IPs (216.198.79.x / 64.29.17.x) are shared infrastructure — neighbours' bad reputation can bleed in, rarely.

## 7. Recommended next steps
**P0 (today)**
1. Rotate the Bird access token; remove it from `.claude/settings.json`; check Bird logs for unexpected sends.
2. Deploy these changes; confirm `CRON_SECRET`, `NEXTAUTH_URL`, `AUTH_SECRET`, `UPSTASH_REDIS_REST_*` in Vercel prod.
3. Find out *who* flags you: check https://transparencyreport.google.com/safe-browsing/search?url=elphatechsolutions.com, Google Search Console → Security issues, `https://www.virustotal.com/gui/domain/elphatechsolutions.com`, and the exact browser warning text. Request review from each vendor (Search Console "Request review", Microsoft SmartScreen feedback, Netcraft, etc.) — a review is the only way to clear a reputation flag; code changes alone won't.

**P1 (this week)**
4. Fix SPF/DKIM for Bird; set DMARC to `p=quarantine` with a monitored `rua`.
5. (Already done in code: click tracking is off for magic-link/invite mail.) Check the digest email too.
6. Redirect `www` → apex in Vercel; verify the domain in Google Search Console.
7. Move `shadcn` to `devDependencies`.

**P2**
8. CSP in Report-Only, then enforce with nonces.
9. Add CAA records (`letsencrypt.org`, Vercel's CA), optionally DNSSEC at Cloudflare.
10. Consider a separate portal subdomain; add a basic privacy policy / contact / address footer (legit-site trust signals).
11. Fix the 20 lint errors, add tests for auth gating, and add CI running `npm audit`.
12. Replace the stale `env.ts` with a validation actually imported at startup.
