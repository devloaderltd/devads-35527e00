import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-middleware'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { sendViaSMTP } from '@/lib/smtp/send.server'

const MASK = '••••••••'

const UpdateSchema = z.object({
  enabled: z.boolean(),
  provider_label: z.string().max(64).default(''),
  host: z.string().trim().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  auth_user: z.string().max(255).default(''),
  // Empty string means "leave existing password unchanged"
  auth_pass: z.string().max(512).default(''),
  from_email: z.string().trim().email().max(255),
  from_name: z.string().max(255).default(''),
  reply_to: z
    .string()
    .trim()
    .max(255)
    .optional()
    .nullable()
    .refine((v) => !v || /.+@.+\..+/.test(v), {
      message: 'Invalid reply-to email',
    }),
})

function mask(row: any) {
  if (!row) return null
  const { auth_pass, ...rest } = row
  return { ...rest, auth_pass: auth_pass ? MASK : '' }
}

export const getSmtpSettings = createServerFn({ method: 'GET' })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from('smtp_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return { settings: mask(data) }
  })

export const updateSmtpSettings = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => UpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Record<string, any> = {
      enabled: data.enabled,
      provider_label: data.provider_label,
      host: data.host,
      port: data.port,
      secure: data.secure,
      auth_user: data.auth_user,
      from_email: data.from_email,
      from_name: data.from_name,
      reply_to: data.reply_to || null,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    }
    if (data.auth_pass && data.auth_pass !== MASK) {
      patch.auth_pass = data.auth_pass
    }
    const { data: row, error } = await (supabaseAdmin
      .from('smtp_settings') as any)
      .update(patch)
      .eq('id', 'global')
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    await supabaseAdmin.rpc('log_admin_action', {
      _actor: context.userId,
      _action: 'smtp.update',
      _target_type: 'smtp_settings',
      _target_id: 'global',
      _metadata: { enabled: data.enabled, host: data.host, port: data.port },
    })
    return { settings: mask(row) }
  })

export const toggleSmtp = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .inputValidator((input: { enabled: boolean }) =>
    z.object({ enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from('smtp_settings')
      .update({
        enabled: data.enabled,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'global')
    if (error) throw new Error(error.message)
    await supabaseAdmin.rpc('log_admin_action', {
      _actor: context.userId,
      _action: data.enabled ? 'smtp.enable' : 'smtp.disable',
      _target_type: 'smtp_settings',
      _target_id: 'global',
      _metadata: {},
    })
    return { ok: true, enabled: data.enabled }
  })

export const testSmtpConnection = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .inputValidator((input: { to: string }) =>
    z.object({ to: z.string().trim().email() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: cfg, error } = await supabaseAdmin
      .from('smtp_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!cfg) throw new Error('SMTP not configured')

    const subject = 'CallEscort24 — SMTP test'
    const html = `<p>Hello,</p><p>This is a test email from your CallEscort24 admin panel. If you received it, your SMTP configuration is working.</p><p><strong>Host:</strong> ${cfg.host}:${cfg.port}<br/><strong>From:</strong> ${cfg.from_email}<br/><strong>Sent at:</strong> ${new Date().toISOString()}</p>`
    const text = `CallEscort24 SMTP test\nHost: ${cfg.host}:${cfg.port}\nFrom: ${cfg.from_email}\nSent at: ${new Date().toISOString()}`

    const result = await sendViaSMTP(
      { to: data.to, subject, html, text },
      cfg as any,
    )

    await supabaseAdmin
      .from('smtp_settings')
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: result.ok ? 'ok' : 'failed',
        last_test_error: result.ok ? null : (result.error ?? 'unknown error'),
      })
      .eq('id', 'global')

    await supabaseAdmin.rpc('log_admin_action', {
      _actor: context.userId,
      _action: 'smtp.test',
      _target_type: 'smtp_settings',
      _target_id: 'global',
      _metadata: {
        ok: result.ok,
        duration_ms: result.durationMs,
        error: result.error ?? null,
        to_domain: data.to.split('@')[1] ?? null,
      },
    })

    return result
  })
