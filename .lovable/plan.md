## Goal
Remove Vercel Cron config so deployment passes on the Hobby plan, and switch the two cron endpoints to URL-based triggers protected by a shared secret token so a third-party cron service (cron-job.org, EasyCron, etc.) can invoke them safely.

## Changes

### 1. `vercel.json` — drop the `crons` block
Remove the `crons` array entirely. Keep `buildCommand`, `outputDirectory`, `framework`, `regions`. After this, Vercel deploy stops complaining about the 15-minute schedule.

### 2. Add a shared secret
Add a new secret `CRON_TRIGGER_SECRET` (random 32+ char string) via the secrets tool. This becomes the auth token the third-party cron service sends.

### 3. Protect both cron endpoints with the secret
Files:
- `src/routes/api/public/cron/auto-promote.ts`
- `src/routes/api/public/cron/match-saved-searches.ts`

Wrap the existing `run` handler so it first checks the incoming request for a matching token. Accept the token in either:
- header: `x-cron-secret: <token>`, OR
- query string: `?token=<token>` (useful for cron services that only support GET URLs with no custom headers)

If neither matches `process.env.CRON_TRIGGER_SECRET`, return `401 Unauthorized`. Otherwise run the existing logic. Keep both `GET` and `POST` handlers so any cron provider works.

Also fix the stale parse-error symptom on `auto-promote.ts` by rewriting the file cleanly (current indentation is salvageable but I'll normalize it while editing).

### 4. (Optional cleanup) Disable the existing `pg_cron` jobs
If `pg_cron` is currently scheduling these same endpoints, the third-party cron + pg_cron would double-fire. Plan: leave pg_cron as-is for now; user can run `SELECT cron.unschedule('<job-name>')` later from the SQL panel once the third-party trigger is verified. I'll note the exact commands in the final message but not run them automatically.

## Third-party setup (post-deploy instructions you'll get in the final message)
For each endpoint, create a job in your third-party cron service:

- **auto-promote** — daily, e.g. `15 3 * * *`
  URL: `https://<your-domain>/api/public/cron/auto-promote?token=<CRON_TRIGGER_SECRET>`
  Method: GET

- **match-saved-searches** — every 15 minutes, `*/15 * * * *`
  URL: `https://<your-domain>/api/public/cron/match-saved-searches?token=<CRON_TRIGGER_SECRET>`
  Method: GET

Header-based alternative: send `x-cron-secret: <CRON_TRIGGER_SECRET>` instead of the query token.

## Out of scope
- No business-logic changes inside the two cron handlers.
- No changes to other routes or UI.