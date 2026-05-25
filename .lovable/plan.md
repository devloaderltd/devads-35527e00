## Add Google & Apple Sign-In (Standalone Supabase OAuth)

Implement standalone OAuth using `supabase.auth.signInWithOAuth()` directly — no Lovable-managed auth wrapper. You'll provide your own Google and Apple OAuth credentials.

### What I'll build

1. **`src/components/SocialAuthButtons.tsx`** — reusable component with two branded buttons:
   - "Continue with Google" (official Google `G` logo SVG)
   - "Continue with Apple" (official Apple logo SVG)
   - Calls `supabase.auth.signInWithOAuth({ provider: 'google' | 'apple', options: { redirectTo: \`${window.location.origin}/auth/callback\` } })`
   - Handles loading state + error toasts

2. **`src/routes/auth.callback.tsx`** — OAuth return page:
   - Supabase client auto-exchanges the `?code=...` from the URL into a session
   - Shows a spinner, then redirects to `/` (or to a stored `redirect` param)
   - Handles `error` / `error_description` query params with a toast

3. **Inject buttons into existing `/login` and `/signup` pages** with an "or" divider above the email/password form. No changes to email/password flow.

### What you need to provide (standalone credentials)

I'll list the exact steps in chat when we switch to build, but the short version:

**Google** — Google Cloud Console → OAuth 2.0 Client ID (Web application)
- Authorized redirect URI: `https://jxvrfmekootjojxfovli.supabase.co/auth/v1/callback`
- Paste Client ID + Secret into Supabase Dashboard → Authentication → Providers → Google

**Apple** — Apple Developer → Services ID + Sign in with Apple key (.p8)
- Return URL: `https://jxvrfmekootjojxfovli.supabase.co/auth/v1/callback`
- Generate the Apple client secret JWT (Team ID + Key ID + .p8) and paste Services ID + JWT into Supabase Dashboard → Authentication → Providers → Apple

Both providers must be toggled **enabled** in the Supabase Auth dashboard. Because this is standalone (no `supabase--configure_social_auth`), I cannot enable them from here — you'll do it in the Supabase dashboard after I ship the code.

### Technical notes
- Uses the existing `@/integrations/supabase/client` (PKCE flow is already the default).
- The new profile trigger `handle_new_user` already runs on `auth.users` inserts, so OAuth sign-ups auto-create a profile + wallet row.
- No DB migration required.
- No new packages required.
