## Goal
Now that auth emails are branded and wired up, set up **app emails** (transactional) so CallEscort24 can send branded notifications from `notify.callescort.devloader.com` for in-app events.

## Scope
Scaffold the transactional email infrastructure on top of the existing email setup, plus a minimal first template + trigger so the system is provably working end-to-end.

### Steps
1. **Scaffold transactional email infra** — creates:
   - `src/routes/lovable/email/transactional/send.ts` (authenticated sender)
   - `src/routes/lovable/email/transactional/preview.ts` (dashboard preview)
   - `src/routes/email/unsubscribe.ts` (public token API)
   - `src/routes/lovable/email/suppression.ts` (bounce/complaint webhook)
   - `src/lib/email-templates/registry.ts` + sample template
2. **Brand the sample template** to match CallEscort24 (reuse `EmailShell` from `_layout.tsx` — gradient header, white body, primary `#6E5BE8`, accent `#2BB6DC`, footer).
3. **Create initial app email templates** for the likely high-value triggers on this listings/marketplace app:
   - `new-message` — buyer/seller receives a new chat message
   - `listing-approved` — seller's listing was approved by moderation
   - `listing-rejected` — seller's listing was rejected (with reason)
   - `review-received` — seller received a new review
   - `kyc-status` — KYC approved / rejected
   - `topup-confirmed` — wallet top-up confirmed
   *(Register all in `registry.ts`. Each one stays React-escaped, no unsubscribe text — system appends it.)*
4. **Create `src/lib/email/send.ts`** — thin `sendTransactionalEmail()` helper that POSTs to `/lovable/email/transactional/send` with the user's JWT.
5. **Build `/unsubscribe` page** (`src/routes/unsubscribe.tsx`) — branded confirm/success/error states calling the public unsubscribe API.
6. **Verify** — check preview builds, confirm queue + cron still active, log a test enqueue.

### Not in scope (do separately if you want)
- Wiring every trigger into the existing app flows (messages, moderation, reviews, KYC, wallet) — I'll list the exact call sites after scaffolding so we can wire them in a follow-up turn, or do it now if you confirm.
- Editing copy beyond a clean first draft.

## Question
Do you want me to also **wire the triggers into the existing flows** in this same pass (insert `sendTransactionalEmail(...)` calls in the message-send, moderation, review, KYC, and wallet code paths), or just scaffold the templates + helper and stop there?
