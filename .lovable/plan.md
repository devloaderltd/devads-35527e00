## Goal
Remove the leftover `https://devads.lovable.app` reference from the auth email preview so previews show your real domain `callescort.devloader.com`.

## Findings
- Live auth emails (`src/routes/lovable/email/auth/webhook.ts`) already use `ROOT_DOMAIN = "callescort.devloader.com"` for `siteUrl`, and `confirmationUrl` comes from Supabase. No `devads` reference there.
- The only remaining `devads.lovable.app` lives in the preview sample data:
  - `src/routes/lovable/email/auth/preview.ts` → `const SAMPLE_PROJECT_URL = "https://devads.lovable.app"`
  This URL is only used to render dashboard previews (sample buttons/links), not for actual sends.

Note: you wrote `callescort.devlosder.com` — assuming a typo for the existing domain `callescort.devloader.com`. Confirm if different.

## Change
Edit `src/routes/lovable/email/auth/preview.ts`:
- `SAMPLE_PROJECT_URL` → `"https://callescort.devloader.com"`

No other files need changes. No DB / infra / template edits.
