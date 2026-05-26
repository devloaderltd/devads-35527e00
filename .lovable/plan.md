## Plan: Finish email infrastructure & branded auth templates

Domain `notify.callescort.devloader.com` is verified ✅. Current preview crashes with "Cannot find module '@lovable.dev/email-js'" because the queue processor route was created but its dependencies were never installed and the rest of the email infra (DB tables, RPCs, cron) is partially set up.

### Steps

1. **Install missing npm packages**
   - `@lovable.dev/email-js`, `@lovable.dev/webhooks-js`, `@react-email/components`, `react-email`
   - Fixes the runtime error breaking the preview right now.

2. **Run `setup_email_infra`** (idempotent)
   - Ensures pgmq queues, `enqueue_email` / `read_email_batch` / `delete_email` / `move_to_dlq` RPCs, `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`, vault secret, and `process-email-queue` pg_cron job all exist and point at the correct app URL.

3. **Scaffold auth email templates** via `scaffold_auth_email_templates`
   - Creates `auth-email-hook` server route (queue-based) and 6 React Email templates: signup confirmation, magic link, password recovery, invite, email change, reauthentication.

4. **Brand the 6 auth email templates** to match CallEscort24
   - Read brand tokens from `src/styles.css`
   - Apply: white body background (#ffffff hard rule), brand accent buttons, rounded corners, system font stack, footer with site name + tagline
   - Consistent header logo/wordmark, generous spacing, mobile-friendly

5. **Verify** preview no longer errors; confirm pg_cron job + queue tables exist; tell user emails will flow via `notify.callescort.devloader.com`.

### Out of scope
- Transactional (app) emails — can be added next as a follow-up
- Editing template copy beyond the standard auth flows

Approve to proceed.