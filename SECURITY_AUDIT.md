# Security Audit — elphatechsolutions.com

Date: 2026-10-03 (second pass; supersedes the earlier same-day audit, whose history is summarised in §8)
Scope: `elphatech/` Next.js app, deployment configuration visible from the repo, and live HTTP/DNS/TLS checks of the production domain. The legacy static `index.html` in the parent folder is not deployed and was not reviewed in depth.

## Status update (same day, after the audit)

The owner reports the off-repo P0/P1 items (Bird token rotation, email authentication, vendor review requests, Vercel env cleanup) are done. Re-checked from outside afterwards:

- **Email authentication verified (M1 resolved):** a real contact-form notification (Bird → `info@` → Cloudflare Email Routing → Gmail, 2026-10-03) shows Bird's DKIM `d=elphatechsolutions.com s=bird-878-0626` **pass**, SPF **pass** for `send.elphatechsolutions.com` (Bird's return-path subdomain, which is why the apex SPF correctly lists only Cloudflare), and **DMARC pass** with `From` aligned. The two `dkim=fail` entries are Cloudflare's own forwarding re-signatures (`cf2024-1`), a normal artefact of forwarding that does not affect the DMARC result thanks to the passing Bird signature and ARC. This also confirms the contact route's Bird email path works in production, and the owner confirmed the HubSpot contact and deal were created from the same test submission, so the full contact flow works end to end. DMARC is still `p=none`; once the `rua` reports show clean alignment for a couple of weeks, move to `p=quarantine`.
- **Bird adds an unsubscribe footer and click-tracking to the internal notification** (`List-Unsubscribe` header; the footer link is wrapped in a `post.eu.spmailtechno.com` tracking URL). It is harmless, but a tracked third-party redirect domain in mail from your domain is an avoidable reputation signal. Disable click/open tracking and the auto-unsubscribe footer for transactional sending in the Bird dashboard (the code only sets `track_clicks=false` when a caller asks, and the contact route does not).
- **Code fixes not deployed yet:** production still returns 200 for `www` and has no canonical tag. The `www` redirect and canonical changes in §5 take effect only after the next deploy.
- Not verifiable from here: token rotation, Vercel env cleanup, and the outcome of the vendor reviews. Treated as done on the owner's word.
- CAA and DNSSEC are still absent (P2).

## 1. Executive Summary

| Question | Finding |
|---|---|
| Actual compromise, malware or injected code? | **No evidence.** No obfuscated JS, `eval`/`new Function`, `child_process`, iframes, base64 payloads, or unknown third-party scripts. The live homepage loads only same-origin scripts. The only outbound links are WhatsApp (`wa.me`) and Credly. `.env`, `.git/config`, `/api/projects` and `/api/auth/*` return 404; source maps return 403. |
| Security vulnerabilities? | **Not in production code.** `npm audit --omit=dev`: 0 vulnerabilities. 5 "high" findings exist only in the dev-time ESLint chain (`eslint-config-next` → `fast-glob` → `micromatch` → `braces`) and never ship. The earlier critical Next.js/next-auth advisories were fixed by upgrading to Next 16.3.8 and later removing auth entirely. |
| Suspicious behaviour? | None malicious. |
| Likely false-positive / reputation issue? | **Yes, this is the most probable cause.** The domain was registered **2026-06-22 (about 3.5 months old)**. Until recently it hosted an email-only login page ("magic link") with long query-string URLs, mail from a domain with weak email authentication (SPF does not list the sender; DMARC `p=none`), and a git history showing Chrome's phishing heuristic already tripped once. That is a textbook profile for a reputation false positive. The login surface is now gone, so what remains is clearing the flag with each vendor. |

**Bottom line:** the codebase and the live deployment are clean. The blocking is a domain-reputation problem, not a compromised application. Code changes cannot clear a reputation flag; vendor reviews can (§6).

Limits of this review: I cannot query Safe Browsing, SmartScreen or VirusTotal from here, cannot see the Vercel/Cloudflare/Bird/HubSpot dashboards or production env vars, and did not submit a real contact form on production. Statements about those are inferred and marked as such.

## 2. Architecture

- Next.js 16.3.8 (App Router, Turbopack, Tailwind v4) on Vercel. One static page (`/`), `robots.txt`, `sitemap.xml`, and one dynamic route, `POST /api/contact`.
- No authentication, database, file storage, cron or admin routes (removed in commit `c03ee1c`).
- External services, all server-side: HubSpot (lead + deal), Bird (notification email), Upstash Redis (rate limit). Client-side third parties: none (fonts are self-hosted at build time by `next/font`).
- DNS/registrar at Cloudflare; apex A records to Vercel; `www` CNAME to Vercel; inbound mail via Cloudflare Email Routing. TLS: Let's Encrypt, valid to 2026-11-24 for apex and `www` separately. No Dockerfile, CI or IaC in the repo.
- Dependencies (11 runtime): next, react, react-dom, zod, sonner, lucide-react, clsx, tailwind-merge, tailwindcss-animate, @upstash/ratelimit, @upstash/redis. All well-known. The only install script in the lockfile is `unrs-resolver` (dev-only, via the ESLint import resolver; legitimate).

## 3. Findings

### Critical
None in the current codebase.

**C3 (carried over, still open, outside the repo).** `../.claude/settings.json` (parent folder, not in git) still contains a plaintext Bird API token in saved command-permission entries (re-confirmed this pass). A leaked sender token allows sending mail as your domain, which would genuinely get it blocklisted. **Action: rotate the Bird token now, delete those entries, and review Bird send logs for unexpected sends.** I did not edit that file.

### High
None.

### Medium
| # | Finding | Evidence | Could contribute to warning? | Status |
|---|---|---|---|---|
| M1 | Email authentication likely weak: SPF is `v=spf1 include:_spf.mx.cloudflare.net ~all` (Cloudflare inbound routing only; Bird not listed); DMARC `p=none`. Bird DKIM selectors could not be verified from here. | `dig TXT elphatechsolutions.com`, `dig TXT _dmarc.…` | **Yes.** Mail from a young domain failing alignment is a strong phishing signal, and many URL-reputation systems score the domain's mail too. | Open (DNS). Send a test through Bird to Gmail, check "Show original" for SPF/DKIM/DMARC = PASS; fix records from the Bird dashboard; then DMARC `p=quarantine`. |
| M2 | `www` and apex both served 200 (two origins, duplicate content), and no canonical tag. This is the "Duplicate without user-selected canonical" row in your Search Console screenshot. | live `curl -I`; no `<link rel="canonical">` in HTML | Minor (splits reputation across two hostnames) | **Fixed** (§5). |
| M3 | No Content-Security-Policy. | response headers | No (scanners do not penalise this), but it is the main missing browser hardening | Open (P2). Needs nonce plumbing for Next's inline scripts; roll out Report-Only first. |

### Low / hardening
- **Rate limiter fails open.** `src/lib/rate-limit.ts` becomes a no-op (with a console warning) if Upstash/KV credentials are absent. `.env.local` has `KV_REST_API_*`; confirm the same exist in Vercel production, otherwise the contact form is unthrottled and could be abused to spam `info@` and HubSpot. Consider failing closed in production.
- **Rate-limit key.** Uses the first `x-forwarded-for` value. Safe on Vercel (the platform sets it); would be spoofable behind a different proxy.
- **JSON-LD** (`src/app/(marketing)/layout.tsx`) uses `dangerouslySetInnerHTML` with `JSON.stringify` of a static constant. Not exploitable, but escaping `<` as `<` is a free hardening step.
- **No CAA record** and no DNSSEC at Cloudflare. P2.
- **`access-control-allow-origin: *`** on static pages and `robots.txt`: Vercel's default for static assets. Harmless; the contact API enforces a same-origin `Origin` check separately.
- **`X-Frame-Options: DENY`** is set; no `frame-ancestors` CSP yet (covered by M3).
- **Dev-only audit findings:** 5 highs through `eslint-config-next`. `npm audit fix --force` proposes downgrading to eslint-config-next 14, which is wrong. Wait for upstream; no production impact.
- **Outdated (non-security):** @upstash/ratelimit 2.0.8→2.2.0, @upstash/redis 1.38→1.39, zod 4.4→4.6, lucide-react 1.21→1.51, sonner 2.0.7→2.0.8. Left untouched to avoid unrequested churn.
- **Repo hygiene:** unused Next.js boilerplate SVGs in `public/` (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`); `logo.png` is 2.1 MB (performance, not security); `docs/superpowers/plans/…` is tracked; AI-tool state (`ruvector.db`, `agentdb.rvf`, `.superpowers/`) sits in/near the tree (untracked/ignored; keep out of deploys).
- **Stale env vars in Vercel** (inferred from `.env.local`, since the code no longer reads them): `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `R2_*`, `CRON_SECRET`. Remove them. A Postgres server was previously reachable on a public IP per the earlier audit; confirm it is shut down or firewalled.
- **Local `.env.local`** holds live HubSpot, Bird, R2 and Redis credentials. It is correctly gitignored and was never committed (history scan clean), but rotate anything that has appeared in transcripts or tool config.

## 4. Checked and found clean
- No `eval`, `new Function`, `child_process`, `document.write`, `atob/btoa`, `fromCharCode`, iframes, or `window.location` redirects anywhere in `src/`.
- No secrets in tracked files or full git history (scanned for AWS/HubSpot/Stripe/PEM/DB-URL/bearer patterns; the only hit is a `postgres:postgres@localhost` example in an old plan doc).
- Contact route: Zod validation with length limits, same-origin check with safe URL parsing, HTML-escaped email body, CR/LF stripped from subject, 3/hour/IP limit, generic error messages, no stack traces returned.
- Sitemap lists only `/`. `robots.txt` blocks only `/api/`. No hidden or test routes; `/api/projects`, `/api/auth/*`, `/.env`, `/.git/config` all 404.
- Redirects: only `http→https` (Vercel) and the old `/login`, `/verify-request`, `/error`, `/portal/*` URLs to `/` (single hop, same origin, permanent). No open redirects, no cross-domain hops.
- Headers on every route: HSTS (1 year, includeSubDomains), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, Permissions-Policy. No cookies are set at all.
- Source maps are not served in production (403). `X-Powered-By` is the only fingerprinting header (cosmetic).

## 5. Fixes applied this pass

| Area | Change | Why | Risk |
|---|---|---|---|
| Canonical (M2) | `src/app/layout.tsx`: `metadataBase: new URL("https://elphatechsolutions.com")`. `src/app/(marketing)/layout.tsx`: `alternates: { canonical: '/' }`. | Addresses Search Console "Duplicate without user-selected canonical" and gives crawlers one authoritative origin. | Metadata only. |
| `www` → apex (M2) | `next.config.ts`: host-matched 308 from `www.elphatechsolutions.com/:path*` to `https://elphatechsolutions.com/:path*`, ahead of the old-portal redirects. | Removes the duplicate origin. Matches only the `www` host, so previews and apex are untouched. | Low. Both hosts previously returned 200, so there is no loop. If you later configure the apex to redirect to `www` in Vercel, you would create a loop; do not. |

Not changed: CSP, rate-limiter behaviour, dependency versions, DNS (all outside "clearly safe" or outside the repo).

Verification (local production build, `next start`):
- `tsc --noEmit`: pass. `npm run lint`: pass, no warnings. `npm run build`: pass (routes: `/`, `/api/contact`, `robots.txt`, `sitemap.xml`, icons).
- `/`, `/robots.txt`, `/sitemap.xml` → 200. `/login`, `/portal/x` → single 308 to `/`. `/api/projects`, `/api/auth/providers` → 404.
- `Host: www…` → 308 to `https://elphatechsolutions.com/` (path preserved). Canonical tag present: `https://elphatechsolutions.com`.
- All five security headers present. Page references only `elphatechsolutions.com`, `schema.org`, `wa.me`, `credly.com` (plus the `w3.org` SVG namespace string).
- `/api/contact`: no Origin → 403; cross-origin → 403; same-origin invalid body → 400 with validation messages.
- Authentication: there is none to verify (removed). Not verified: a real contact-form submission end to end (needs live HubSpot/Bird credentials). Submit one on the deployed site after release and confirm the HubSpot deal and email arrive.
- No automated test suite exists in the repo.

## 6. Reputation false-positive risks and your Search Console screenshot

**What the screenshot shows (all benign):**
- *Page with redirect (2):* the old `/login` and `/portal/*` URLs now 308 to `/`. Expected; they drop out as Google recrawls.
- *Duplicate without user-selected canonical (1):* the `www`/apex duplicate. Fixed by this pass once deployed.
- *Blocked by robots.txt (1):* an `/api/…` URL (or a legacy `/portal/` URL from the earlier robots rules). Expected.
- *Crawled, currently not indexed (1):* a quality/age signal for a new site, not a security issue.
None of these is a security-issue report. If Search Console's **Security issues** page were flagging the site, it would say so there; check it explicitly.

**Why the domain was likely flagged:**
1. Domain age about 3.5 months, with very little reputation history.
2. Until the removal, an email-only login page ("Sign in", "magic link", client-portal branding) that was also in the sitemap. This matches credential-harvest page templates.
3. Magic-link URLs shaped like `/api/auth/callback/email?callbackUrl=…&token=…&email=…` (long query string containing an email address and a callback URL). The git history (`a1ec016`) shows Chrome's phishing heuristic already fired on this.
4. Automated auth-themed email (login links, "client login alert") from a domain with weak SPF/DMARC.
5. A contact form that collects name, email and message is normal, but combined with the above it adds to the profile.
6. Shared Vercel IP space (64.29.17.x / 216.198.79.x): neighbours' reputation can occasionally bleed in. Rare.

Do not reintroduce a public login on this domain. If a client portal returns, host it on a separate subdomain, keep it out of the sitemap, mark it `noindex`, and keep link URLs short without `email=` parameters.

## 7. Recommended next steps

**P0 (today)**
1. Rotate the Bird access token; remove it from `../.claude/settings.json`; review Bird send logs.
2. Deploy this change set.
3. Identify who is flagging you and request review from each: Google Safe Browsing status (`transparencyreport.google.com/safe-browsing/search?url=elphatechsolutions.com`) and Search Console → Security issues → Request review; Microsoft SmartScreen feedback/Defender submission; VirusTotal domain page (note which engines flag it); Netcraft and Cisco Talos reputation lookup; any corporate-firewall category (e.g. Palo Alto, Fortinet) via their site-review forms. Record the exact warning text and vendor for each block.

**P1 (this week)**
4. Fix email authentication for Bird (SPF/DKIM aligned), verify with a real test, then DMARC `p=quarantine`.
5. In Search Console, validate fixes for the four indexing rows after deploy, and submit the sitemap.
6. Confirm in Vercel production: Upstash/KV vars present; remove stale `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `R2_*`, `CRON_SECRET`; shut down or firewall the old public Postgres.
7. Submit one real contact form on production and confirm HubSpot + email delivery.
8. Add trust signals: privacy policy page, visible company/contact details, `sameAs` social links in the JSON-LD.

**P2**
9. CSP in Report-Only, then enforce with nonces; add CAA records and DNSSEC; escape `<` in JSON-LD.
10. Make the rate limiter fail closed in production; update the five minor dependency bumps; delete unused `public/*.svg` and compress `logo.png`.
11. Add CI (`npm audit --omit=dev`, typecheck, lint, build) and a few tests for the contact route guards.

## 8. History (earlier audit, same day)
The first pass found and fixed: Next.js 16.2.9 critical advisories (→16.3.8), next-auth beta.31 email-normaliser bypass, a cron route that never ran and failed open on an unset secret, unthrottled magic-link requests, `/login` in the sitemap, and missing security headers on the homepage. The client portal, login, admin APIs, database, file storage and cron were then removed entirely, which resolved all of those. Items C3, H5 (now M1), M6 (now fixed), M7 (CAA) were carried forward above.
