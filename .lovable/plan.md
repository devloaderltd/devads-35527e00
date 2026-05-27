Set up email infrastructure for the sender domain `send.callescort24.org`:

1. Provision the email queue, tables (send log, suppressions, unsubscribe tokens), priority queues, and the cron dispatcher tied to the `send.callescort24.org` sender subdomain.
2. Scaffold branded auth email templates (signup confirmation, magic link, password reset, invite, email change, reauthentication) styled to match CallEscort24.
3. Scaffold app (transactional) email infrastructure: the send route, unsubscribe page + route, suppression webhook, plus a starter template you can extend.
4. Tell you to monitor DNS verification in Cloud → Emails. Sending activates automatically once DNS for `send.callescort24.org` verifies.

After approval I’ll run the setup, scaffold both auth and app email templates, and apply CallEscort24 branding.