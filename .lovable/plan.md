## Plan: Auth + Transactional Emails

Email infrastructure is already set up for `notify.callescort.devloader.com`. This plan adds both branded auth emails and transactional app email sending.

### 1. Branded auth email templates
- Scaffold the 6 standard auth templates (signup confirmation, magic link, password recovery, invite, email change, reauthentication).
- Style them to match the current dark admin aesthetic (deep slate/indigo accents, refined typography) while keeping the email body background white (#ffffff) for deliverability.
- Bake in site name "CallEscort" and a clear branded header.

### 2. Transactional (app) email infrastructure
- Scaffold the generic `send-transactional-email`, `handle-email-unsubscribe`, and `handle-email-suppression` server routes.
- Create the `TEMPLATES` registry at `src/lib/email-templates/registry.ts`.
- Add a `sendTransactionalEmail` helper at `src/lib/email/send.ts` for client-side triggers.
- Create one starter template: **KYC status update** (approval/rejection notification — fits existing `approve_kyc`/`reject_kyc` flows).
- Create a branded `/unsubscribe` page that calls the unsubscribe route.

### 3. Wire one real trigger
- Hook the KYC approval/rejection flow in the admin panel to send the KYC status email via `sendTransactionalEmail` with idempotency key `kyc-${submission_id}-${status}`.

### Out of scope
- No bulk/marketing emails.
- No new admin features beyond the KYC email trigger.
- No DB schema changes (KYC tables already exist).
- DNS verification is independent — emails will start flowing once DNS verifies (monitor in Cloud → Emails).

### Files touched
- `supabase/functions/auth-email-hook/` + `_shared/email-templates/*.tsx` (scaffolded)
- `src/routes/lovable/email/transactional/*` (scaffolded)
- `src/lib/email-templates/registry.ts`, `src/lib/email-templates/kyc-status.tsx`
- `src/lib/email/send.ts`
- `src/routes/unsubscribe.tsx`
- `src/routes/admin.kyc.tsx` (trigger wiring)
