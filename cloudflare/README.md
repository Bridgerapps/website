# Cloudflare deployment

This repository deploys to the `bridgerapps-website` Worker in company account
`a829203d7d24484af6fcd3946b93712b`. The source baseline is the Vercel production
commit `e0a4edfb986a24201e78b63b6b39c18dc59e27b6`.

Use Node.js 22 or later. Run `npm ci`, then `npm run deploy:cloudflare` from the
repository root with an authenticated Wrangler session. Wrangler is pinned in
the lockfile. `npm run dev:cloudflare` runs the same Worker runtime locally.

Run `npm run verify:cloudflare -- https://DEPLOYMENT.workers.dev` after the build
to check published asset hashes and routing before cutover.

The build copies only versioned public assets into `dist`; source files,
credentials and dependency directories are not published. The Worker preserves
the apex-to-www canonical redirect and directory-index URLs. No environment
variables or backend database are required. Tailwind's CDN and Google Fonts
remain external browser dependencies, as on Vercel.

Production is live at `https://www.bridgerapps.com` and the pinned Wrangler configuration
contains the apex/www Workers routes. Both hosting DNS records are proxied:
apex A `192.0.2.1`, www CNAME `bridgerapps.com`. The Worker serves every request
without an origin fallback; Vercel is not an origin dependency. HTTP redirects
to HTTPS, preserving the original canonical hostname. Do not change any email
or non-hosting records when adjusting hosting.

Rollback: redeploy the previous Worker version using `wrangler rollback`, or
restore the recorded hosting DNS to Vercel while the old project is retained.
Do not cancel Vercel until all projects and dependencies have been verified.

## Automatic publishing on the Mac mini

A LaunchAgent on the company Mac mini checks `origin/main` every five minutes
and deploys new commits from dedicated checkouts using the already-authorized
Wrangler login. Its versioned implementation is `cloudflare/watch-deploy.mjs`.
It never writes back to GitHub, refuses unexpected local modifications, uses
the locked dependencies, and records success only after Cloudflare HTTPS
responds. No credentials are placed in GitHub or on the bot server.

Operational files are in `~/Projects/hosting-migration-2026-10-31/automation`;
the agent label is `com.bridgerapps.cloudflare-hosting`. The Mac must remain
powered on with this user logged in. A failed build is retried on the next run;
inspect `automation/deploy.log` and each `*-state.json` for the last success.
The source script accepts `CHECKOUT STATE_FILE LIVE_URL`. A cloud-native Git
integration is an optional replacement, but needs a separate GitHub app/build
token grant. Do not run both publishers concurrently.
