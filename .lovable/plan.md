## Goal

Add a third-party SMTP system that can be configured and tested from the admin panel. When enabled, all outgoing emails (auth + transactional) route through the configured SMTP server instead of Lovable's email queue. When disabled, the current Lovable email queue is used.

## Architecture

```text
auth-email-hook  ─┐
transactional/send ─┼─► enqueueEmail() ─► [SMTP enabled?]
enqueueTransactionalEmail ─┘                  │
                                              ├─ YES ─► sendViaSMTP()  ── worker-mailer ──► remote SMTP
                                              └─ NO  ─► pgmq enqueue ─► process-email-queue (Lovable API)
```

Worker-mailer is a Cloudflare-Workers-compatible SMTP client (uses `cloudflare:sockets`). No Node `net` needed.

## Database

New migration creates one admin-only table:

- `smtp_settings` (single-row, id text default `'global'`)
  - `enabled` boolean default false
  - `host` text, `port` int default 587, `secure` boolean default false (true for 465/SSL)
  - `auth_user` text, `auth_pass` text (encrypted via pgsodium, or stored plain in this admin-only row — see Security)
  - `from_email` text, `from_name` text, `reply_to` text nullable
  - `provider_label` text (e.g. "SendGrid", "Mailgun" — informational)
  - `last_test_at` timestamptz, `last_test_status` text, `last_test_error` text
  - `updated_at`, `updated_by`
- RLS: only admins (`has_role(auth.uid(),'admin')`) can SELECT/UPDATE. Service role full access.
- GRANTs for `authenticated` (SELECT/UPDATE) and `service_role` (ALL). No anon.

A SECURITY DEFINER RPC `get_smtp_settings_for_send()` returns the row to service-role only, used by the dispatcher.

## Server code

1. **`src/lib/smtp/send.server.ts`** — `sendViaSMTP({to, from, subject, html, text, replyTo})` using `worker-mailer`. Reads config from `smtp_settings` via admin client. Throws typed errors with provider response.
2. **`src/lib/smtp/settings.functions.ts`** — admin-gated server fns:
   - `getSmtpSettings()` — returns row (password masked as `••••` if set).
   - `updateSmtpSettings(input)` — Zod-validated; only writes non-empty password.
   - `testSmtpConnection({ to })` — sends a fixed "SMTP test from CallEscort24" email, updates `last_test_*` columns, returns `{ ok, error?, durationMs }`.
   - `toggleSmtp({ enabled })` — flips the global switch.
3. **Routing layer** — introduce `src/lib/email/dispatch.server.ts` with `dispatchEmail(payload)` that checks `smtp_settings.enabled`:
   - true → `sendViaSMTP` + insert `email_send_log` row (status `sent`/`failed`).
   - false → existing pgmq enqueue path (unchanged).
4. Update:
   - `src/routes/lovable/email/auth/webhook.ts` — call `dispatchEmail` instead of always enqueuing.
   - `src/routes/lovable/email/transactional/send.ts` and `src/lib/email/enqueue.server.ts` — same.
   - `src/routes/lovable/email/queue/process.ts` — when SMTP is enabled, dequeue and send via SMTP (keeps backward compatibility for any messages already in pgmq).

## Admin UI

New route `src/routes/admin.smtp.tsx` (sidebar entry "SMTP"):

- Header card with status pill (Enabled / Disabled), toggle switch.
- Form: provider label, host, port, secure (TLS/SSL select), auth user, auth pass (write-only — placeholder shows `••••`), from email, from name, reply-to.
- "Save settings" button (calls `updateSmtpSettings`).
- "Send test email" panel: recipient input (defaults to admin's email), "Send test" button → shows result toast + inline status (last test at / status / error message).
- Help text listing common provider presets (Gmail 587 STARTTLS, SendGrid 587, Mailgun 587, Brevo 587, generic SSL 465).
- Add link in `src/components/admin/AdminSidebar.tsx`.

## Packages

- `bun add worker-mailer` (Workers-compatible SMTP, uses `cloudflare:sockets`).

## Security

- All write/read server fns wrapped in `requireAdmin` middleware.
- Password never returned to client; UI shows masked placeholder.
- Test send rate-limited in-handler (1 per 10s per admin) to avoid abuse.
- Audit log entry on save/toggle/test via existing `log_admin_action` RPC.

## Non-goals

- No per-template provider override (single global SMTP).
- No DKIM/SPF management (handled at provider).
- Auth-email customization unchanged — only the transport differs.

After approval I will run the migration first, then add the package and code.