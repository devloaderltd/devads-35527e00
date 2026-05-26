## Goal
Add password reset + email verification flows and prepare branded auth email templates.

## Findings
- `/login` has no "Forgot password" link.
- `/signup` calls `supabase.auth.signUp` with `emailRedirectTo: origin + "/"` — verification works via default Lovable emails but lands on home with no confirmation UI.
- No `/forgot-password` or `/reset-password` routes exist.
- No email domain is configured in the workspace — required for branded custom templates.
- `auth.callback.tsx` already exists for OAuth.

## Changes

### 1. Forgot password flow (no domain needed — uses default emails until step 4 lands)
- **`src/routes/login.tsx`**: add "Forgot password?" link under password field → `/forgot-password`.
- **`src/routes/forgot-password.tsx`** (new): public page with email input, calls
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + "/reset-password" })`,
  shows success state.
- **`src/routes/reset-password.tsx`** (new, public): detects `type=recovery` in URL hash, shows new-password form, calls `supabase.auth.updateUser({ password })`, then redirects to `/login`.

### 2. Email verification feedback
- **`src/routes/signup.tsx`**: change `emailRedirectTo` to `${origin}/auth/callback?verified=1`; after successful `signUp`, show a "Check your email to verify" state instead of immediately navigating home.
- **`src/routes/auth.callback.tsx`**: if `verified=1` in search, toast "Email verified!" then redirect to `/`.
- **`src/routes/verify-email.tsx`** (new, public): standalone "We sent a verification link to {email} — didn't get it? Resend" page reachable from signup success and from a banner for unverified users. "Resend" calls `supabase.auth.resend({ type: "signup", email })`.

### 3. Auth config
- Call `configure_auth` to ensure `auto_confirm_email: false` (so verification emails are actually required) while keeping signup enabled and HIBP on.

### 4. Branded email templates (requires email domain)
Custom-designed auth email templates (signup confirmation, magic link, password recovery, invite, email change, reauthentication) require a verified sender domain. The plan will:
- Prompt the user to set up an email domain via the in-app setup dialog.
- After the domain is configured, scaffold the 6 auth email templates and brand them to match CallEscort24 (gradient header, glass card body on white background, accent buttons matching `--primary` / `--gradient-primary`, footer with site name).
- Update auth redirect URLs (signup `emailRedirectTo`, reset `redirectTo`) to use the production URL.

If the user wants to skip step 4, default Lovable auth emails will still work — only branding is missing.

## Out of scope
- Transactional/app emails (welcome, notifications) — not requested.
- Phone/SMS verification.
- Changes to existing OAuth (Google) flow.