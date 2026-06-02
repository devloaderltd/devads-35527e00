# Enable Google Sign-In (hosted Supabase)

Your new Supabase project is hosted at supabase.com, so this is a dashboard +
Google Cloud Console job — no VPS env changes needed.

## 1. Get the callback URL from Supabase

1. Open your Supabase project → **Authentication → Providers → Google**.
2. Copy the **Callback URL (for OAuth)** shown in that panel.
   It looks like: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   Keep this tab open — you'll come back here.

## 2. Create the Google OAuth client

1. Go to https://console.cloud.google.com/
2. Pick (or create) a project.
3. **APIs & Services → OAuth consent screen**
   - User type: **External** → Create
   - App name: `CallEscort24`
   - User support email: your email
   - Developer contact: your email
   - Save and continue through the remaining steps (scopes/test users can be empty for production after you publish; for now you can leave it in Testing).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `CallEscort24 Web`
   - **Authorized JavaScript origins**:
     - `https://callescort24.org`
     - `http://localhost:3000` (optional, for local dev)
   - **Authorized redirect URIs**: paste the callback URL you copied in step 1
     (e.g. `https://<your-project-ref>.supabase.co/auth/v1/callback`)
   - Create → copy the **Client ID** and **Client secret**.

## 3. Enable Google in Supabase

Back in **Supabase → Authentication → Providers → Google**:

1. Toggle **Enable Sign in with Google** ON.
2. Paste **Client ID** and **Client Secret**.
3. Save.

## 4. URL configuration

**Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://callescort24.org`
- **Redirect URLs** (add both):
  - `https://callescort24.org/**`
  - `http://localhost:3000/**` (optional, dev)

## 5. Test

1. Open `https://callescort24.org/login` (incognito).
2. Click **Continue with Google** → choose your Google account → you should
   land back on the site signed in.
3. If you get `redirect_uri_mismatch`, the redirect URI in Google Cloud must
   match the Supabase callback URL **exactly** (no trailing slash, correct
   project ref).

## Publishing the OAuth consent screen

While the consent screen is in **Testing**, only the Google accounts listed
under "Test users" can sign in. Once you're happy, click **Publish app** to
allow any Google user to sign in.

No app code changes are needed — `supabase.auth.signInWithOAuth({ provider: 'google' })`
already does the right thing.
