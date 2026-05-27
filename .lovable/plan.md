## Goal
- Keep **email + password** sign-in (already working).
- Replace the current broken Google button with **branded Google OAuth using your own Google Cloud credentials**.
- Remove **Apple** sign-in entirely.

No Lovable-managed OAuth, no Apple Developer account needed.

---

## Part A — Code changes I'll make

### 1. `src/components/SocialAuthButtons.tsx`
- Delete the Apple button + `AppleIcon`.
- Keep the Google button. Its click handler stays on `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })` — this is the correct call for BYO-credentials Google (the Lovable broker is only for *managed* OAuth, which you don't want).
- Rename divider text to "Or with email" (already correct).

### 2. `src/routes/login.tsx` and `src/routes/signup.tsx`
- No structural change — they already render `<SocialAuthButtons />`. The Apple button just disappears when removed from the component.

### 3. `src/routes/auth.callback.tsx`
- Already handles the OAuth return + `?redirect=` param. No change needed; I'll just verify it.

### 4. Enable Google provider in the backend
I'll enable the `google` provider in the project's auth config so Supabase accepts the OAuth flow once you paste your Client ID / Secret in step B-6 below. Email/password stays enabled. Apple stays disabled.

### 5. Apple cleanup
- Remove the unused `AppleIcon` SVG.
- No DB or backend changes — Apple was never enabled.

---

## Part B — What you do in Google Cloud (one-time, ~10 min)

You need a Google Cloud project to host your branded OAuth client. This is what makes the consent screen show **CallEscort24** instead of "Lovable".

### B-1. Create / pick a Google Cloud project
1. Go to https://console.cloud.google.com
2. Top bar → project dropdown → **New Project** → name it `CallEscort24` → Create.

### B-2. OAuth consent screen
1. Left menu → **APIs & Services → OAuth consent screen**.
2. User Type: **External** → Create.
3. Fill in:
   - **App name:** `CallEscort24`
   - **User support email:** your email
   - **App logo:** upload your logo (optional but recommended for branding)
   - **App domain:** `https://callescort24.org`
   - **Authorized domains:** add **both**:
     - `callescort24.org`
     - `lovable.app`
   - **Developer contact:** your email
4. **Scopes** step → click **Add or remove scopes** → tick:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. **Test users** step → skip (you'll publish below).
6. Back on the consent screen → click **Publish app** → confirm. (Otherwise only test users can sign in.)

### B-3. Create the OAuth client
1. Left menu → **APIs & Services → Credentials**.
2. **Create credentials → OAuth client ID**.
3. **Application type:** Web application.
4. **Name:** `CallEscort24 Web`.
5. **Authorized JavaScript origins** — add all of these:
   - `https://callescort24.org`
   - `https://www.callescort24.org`
   - `https://devads.lovable.app`
   - `https://id-preview--4e817e8c-6b6f-4c13-a579-a3b9b7d44ed7.lovable.app`
6. **Authorized redirect URIs** — add the **Supabase callback URL**. You'll get this exact URL in step B-6; for now leave a placeholder and come back. The URL looks like:
   `https://jxvrfmekootjojxfovli.supabase.co/auth/v1/callback`
   Add that one literal value here.
7. Click **Create**. Copy the **Client ID** and **Client Secret** that appear in the modal — you need both for step B-6.

### B-4. (Optional) Brand verification
For the consent screen to drop the "unverified app" warning, Google requires domain verification + brand review. Not required to function — only required to remove the warning banner. You can submit later from the consent screen → "Prepare for verification".

### B-6. Paste credentials into Lovable Cloud
1. Open Backend → **Users → Authentication Settings → Sign In Methods → Google**.
2. Make sure **Google** is enabled.
3. Switch to **"Use your own credentials"**.
4. Paste the **Client ID** and **Client Secret** from B-3.
5. The panel shows the **Callback URL** — confirm it matches what you put in B-3 step 6. If not, copy it now and add it as an Authorized redirect URI in Google Cloud Credentials.
6. Save.

I'll add a button in my reply that opens the backend panel for you.

---

## Part C — Smoke test
1. Open `/login`.
2. Click **Continue with Google** → Google consent screen says **CallEscort24** → pick account → redirected back to `/auth/callback` → logged in.
3. Try `/signup` with email + password → confirmation email → log in. (No change to this flow.)

---

## Files I'll touch in build mode
- **EDIT** `src/components/SocialAuthButtons.tsx` (remove Apple, keep Google with `supabase.auth.signInWithOAuth`)

## Files I won't touch
- `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/routes/auth.callback.tsx`, `src/integrations/supabase/*` — already correct.

Confirm and I'll switch to build mode to apply the code change and enable Google in the auth config. You can do Part B in parallel.