/**
 * Worker-compatible SMTP sender. Reads config from `smtp_settings` and sends
 * via `worker-mailer` (uses `cloudflare:sockets`).
 *
 * SERVER-ONLY — never import from client code.
 */
import { WorkerMailer } from 'worker-mailer'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export interface SmtpConfig {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  auth_user: string
  auth_pass: string
  from_email: string
  from_name: string
  reply_to: string | null
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const { data, error } = await supabaseAdmin
    .from('smtp_settings')
    .select(
      'enabled, host, port, secure, auth_user, auth_pass, from_email, from_name, reply_to',
    )
    .eq('id', 'global')
    .maybeSingle()
  if (error) {
    console.error('[smtp] failed to read settings', { error: error.message })
    return null
  }
  return (data as SmtpConfig | null) ?? null
}

export interface SmtpSendInput {
  to: string
  subject: string
  html: string
  text: string
  from?: string
  replyTo?: string | null
}

export interface SmtpSendResult {
  ok: boolean
  durationMs: number
  error?: string
}

export async function sendViaSMTP(
  input: SmtpSendInput,
  cfg?: SmtpConfig,
): Promise<SmtpSendResult> {
  const start = Date.now()
  const config = cfg ?? (await getSmtpConfig())
  if (!config) return { ok: false, durationMs: 0, error: 'SMTP not configured' }
  if (!config.host || !config.from_email) {
    return { ok: false, durationMs: 0, error: 'SMTP host or from_email missing' }
  }

  try {
    const mailer = await WorkerMailer.connect({
      host: config.host,
      port: config.port,
      secure: config.secure,
      startTls: !config.secure,
      credentials:
        config.auth_user && config.auth_pass
          ? {
              username: config.auth_user,
              password: config.auth_pass,
              authType: ['plain', 'login'],
            }
          : undefined,
    })

    const from = input.from
      ? input.from
      : config.from_name
        ? { name: config.from_name, email: config.from_email }
        : config.from_email

    await mailer.send({
      from,
      to: input.to,
      replyTo: input.replyTo ?? config.reply_to ?? undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })

    await mailer.close().catch(() => {})
    return { ok: true, durationMs: Date.now() - start }
  } catch (e: any) {
    const msg = e?.message || String(e)
    console.error('[smtp] send failed', { error: msg })
    return { ok: false, durationMs: Date.now() - start, error: msg }
  }
}
