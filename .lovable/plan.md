## Problem

The server starts and listens on port 3000, but every request that touches SMTP (sending mail) crashes with:

```
Error: Cannot find module 'cloudflare:sockets'
  at .../node_modules/worker-mailer/dist/index.js
```

`worker-mailer` is a Cloudflare-Workers-only SMTP library — it imports the virtual module `cloudflare:sockets` which does not exist in Node.js. On the VPS (plain Node), this throws as soon as `src/lib/smtp/send.server.ts` is loaded by any code path (page render, email send, etc.), which is why pages return 500.

## Fix

Swap the SMTP transport from `worker-mailer` to `nodemailer` (the standard Node SMTP client). Only `src/lib/smtp/send.server.ts` needs changes — its public API (`getSmtpConfig`, `sendViaSMTP`, types) stays identical, so every caller keeps working unchanged.

### Steps

1. **Add nodemailer**
   - `bun add nodemailer`
   - `bun add -d @types/nodemailer`

2. **Rewrite `src/lib/smtp/send.server.ts`**
   - Replace `import { WorkerMailer } from 'worker-mailer'` with `import nodemailer from 'nodemailer'`.
   - Inside `sendViaSMTP`, build a transporter:
     ```ts
     const transporter = nodemailer.createTransport({
       host: config.host,
       port: config.port,
       secure: config.secure,           // true => SMTPS (465), false => STARTTLS upgrade
       auth: config.auth_user && config.auth_pass
         ? { user: config.auth_user, pass: config.auth_pass }
         : undefined,
     })
     await transporter.sendMail({
       from: config.from_name
         ? `"${config.from_name}" <${config.from_email}>`
         : config.from_email,
       to: input.to,
       replyTo: input.replyTo ?? config.reply_to ?? undefined,
       subject: input.subject,
       html: input.html,
       text: input.text,
     })
     ```
   - Keep the same `SmtpSendResult` shape (`ok`, `durationMs`, `error`) and the same `try/catch` + `console.error` logging.
   - Keep `getSmtpConfig()` unchanged.

3. **Remove `worker-mailer`**
   - `bun remove worker-mailer` so it can never get bundled again.

4. **Redeploy on the VPS**
   ```bash
   git pull
   rm -rf dist node_modules
   bun install
   bun run build
   pm2 restart callescort
   pm2 logs callescort --lines 30
   curl -I http://localhost:3000
   ```

## Why this works

`nodemailer` is pure Node, no Cloudflare-only imports, supports the same SMTP options (host, port, secure/STARTTLS, auth, from/replyTo, html/text). The bundled server file will no longer reference `cloudflare:sockets`, so the module loads cleanly and SSR stops 500-ing.

## Note on future Lovable builds

The Lovable preview/published deploy targets Cloudflare Workers, where `nodemailer` won't run. Since you've forked the project to self-host on a VPS, this trade-off is fine — your VPS build is the source of truth. If you ever want both, we'd need a small adapter that picks `nodemailer` vs `worker-mailer` based on the runtime, but it's not needed for the VPS fix.