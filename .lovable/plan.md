# Add Google OAuth card to Admin Settings

## Why not a real form

Google OAuth Client ID + Secret live inside the backend's auth config (consumed by `/auth/v1/callback`), not in our app's database. The app code never reads them at runtime — only the backend's GoTrue server does. That's the opposite of SMTP, where our own server code sends the email and therefore needs the creds in a DB row.

Building a custom form that writes those creds would require storing a Supabase Personal Access Token (account-wide admin access) as a project secret — too much blast radius for a cosmetic win. So we'll do the safe, fast version: a clearly-branded card inside `/admin/settings` that documents the steps and deep-links to the exact backend panel.

## Changes

### `src/routes/admin.settings.tsx`
Add a new `Panel` titled **"Google sign-in (branded)"** to the existing settings page, placed near the SMTP / branding panels. Contents:

- Short explanation: "Branded Google sign-in uses your own Google Cloud OAuth credentials so the consent screen shows **CallEscort24** instead of a generic Lovable app name."
- Status hint line: "Credentials are managed in the backend auth panel — they live in the auth provider config, not in the app database."
- A copy-to-clipboard field showing the **Authorized redirect URI** the user must paste into Google Cloud Console:  
  `https://jxvrfmekootjojxfovli.supabase.co/auth/v1/callback`
- A copy-to-clipboard field with the **Authorized JavaScript origins** they need (current preview + published + custom domains).
- A primary button **"Open Google provider settings"** that opens the backend Google provider panel in a new tab:  
  `https://supabase.com/dashboard/project/jxvrfmekootjojxfovli/auth/providers?provider=Google`
- A secondary link **"Google Cloud Console → Credentials"** opening `https://console.cloud.google.com/apis/credentials` in a new tab.
- A collapsible "Setup checklist" with the 6 steps (create GCP project → OAuth consent screen → Web client → paste redirect URI → enable provider in backend → paste Client ID/Secret).

No new dependencies, no new server functions, no DB changes, no migration. Pure presentational addition to one existing route file.

## Out of scope

- No custom form that writes Google credentials (rejected: requires PAT, full account admin scope).
- No changes to `SocialAuthButtons.tsx`, `login.tsx`, `signup.tsx`, `auth.callback.tsx` — the OAuth flow itself already works once creds are pasted in the backend.
- Apple sign-in stays removed.
