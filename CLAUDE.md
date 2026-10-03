# CLAUDE.md

See `AGENTS.md` for structure, commands and env vars. Verify changes with `npx tsc --noEmit`, `npm run lint` and `npm run build` (no tests exist).

Key points: the site is static marketing content plus one API route (`/api/contact`). Content is edited in `src/content/marketing.ts`. Leads go to HubSpot; a notification email goes through Bird. There is no auth, database or storage layer.
