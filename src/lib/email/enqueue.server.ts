/**
 * Server-side transactional email enqueue helper.
 *
 * Use this from server functions, server routes, and webhooks where there is
 * no user JWT to forward to /lovable/email/transactional/send. It performs the
 * same suppression check, unsubscribe-token bookkeeping, rendering, and pgmq
 * enqueue as the HTTP route, using the service-role Supabase client.
 *
 * NEVER import this file from client code.
 */
import * as React from 'react'
import { render } from '@react-email/components'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'CallEscort24'
const SENDER_DOMAIN = 'notify.callescort.devloader.com'
const FROM_DOMAIN = 'callescort.devloader.com'

let _admin: SupabaseClient | null = null
function admin(): SupabaseClient {
  if (!_admin) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase service role env missing')
    _admin = createClient(url, key)
  }
  return _admin
}

function redact(email: string | null | undefined): string {
  if (!email) return '***'
  const [l, d] = email.split('@')
  if (!l || !d) return '***'
  return `${l[0]}***@${d}`
}

function token(): string {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

export interface EnqueueEmailParams {
  templateName: string
  recipientEmail: string
  templateData?: Record<string, any>
  idempotencyKey?: string
}

export type EnqueueEmailResult =
  | { ok: true; queued: true; messageId: string }
  | { ok: false; reason: 'unknown_template' | 'suppressed' | 'enqueue_failed' | 'token_failed' }

/**
 * Enqueue a transactional email for async delivery. Safe to await in server
 * code paths — any failure is logged and returned, never thrown, so the caller
 * (e.g. a wallet credit or KYC approval) is not aborted by an email problem.
 */
export async function enqueueTransactionalEmail(
  params: EnqueueEmailParams,
): Promise<EnqueueEmailResult> {
  const { templateName, recipientEmail, templateData = {} } = params
  const messageId = crypto.randomUUID()
  const idempotencyKey = params.idempotencyKey || messageId

  const template = TEMPLATES[templateName]
  if (!template) {
    console.error('[email] unknown template', { templateName })
    return { ok: false, reason: 'unknown_template' }
  }
  const recipient = (template.to || recipientEmail || '').trim()
  if (!recipient) {
    console.error('[email] missing recipient', { templateName })
    return { ok: false, reason: 'enqueue_failed' }
  }
  const normalized = recipient.toLowerCase()
  const sb = admin()

  try {
    // 1. Suppression check
    const { data: suppressed } = await sb
      .from('suppressed_emails').select('id').eq('email', normalized).maybeSingle()
    if (suppressed) {
      await sb.from('email_send_log').insert({
        message_id: messageId, template_name: templateName,
        recipient_email: recipient, status: 'suppressed',
      })
      return { ok: false, reason: 'suppressed' }
    }

    // 2. Unsubscribe token
    let unsubscribeToken: string
    const { data: existing } = await sb
      .from('email_unsubscribe_tokens').select('token, used_at').eq('email', normalized).maybeSingle()
    if (existing?.used_at) {
      return { ok: false, reason: 'suppressed' }
    } else if (existing) {
      unsubscribeToken = existing.token
    } else {
      unsubscribeToken = token()
      await sb.from('email_unsubscribe_tokens').upsert(
        { token: unsubscribeToken, email: normalized },
        { onConflict: 'email', ignoreDuplicates: true },
      )
      const { data: stored } = await sb
        .from('email_unsubscribe_tokens').select('token').eq('email', normalized).maybeSingle()
      if (!stored) return { ok: false, reason: 'token_failed' }
      unsubscribeToken = stored.token
    }

    // 3. Render
    const element = React.createElement(template.component, templateData)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof template.subject === 'function' ? template.subject(templateData) : template.subject

    // 4. Log pending then enqueue
    await sb.from('email_send_log').insert({
      message_id: messageId, template_name: templateName,
      recipient_email: recipient, status: 'pending',
    })

    const { error: enqErr } = await sb.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject, html, text,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqErr) {
      console.error('[email] enqueue failed', { error: enqErr, templateName, recipient: redact(recipient) })
      await sb.from('email_send_log').insert({
        message_id: messageId, template_name: templateName,
        recipient_email: recipient, status: 'failed',
        error_message: 'Failed to enqueue email',
      })
      return { ok: false, reason: 'enqueue_failed' }
    }

    console.log('[email] enqueued', { templateName, recipient: redact(recipient) })
    return { ok: true, queued: true, messageId }
  } catch (e: any) {
    console.error('[email] unexpected error', { templateName, error: e?.message })
    return { ok: false, reason: 'enqueue_failed' }
  }
}

/**
 * Look up a user's email by their auth user id using the service role.
 * Returns null on miss or error — callers should skip the email and continue.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data, error } = await admin().auth.admin.getUserById(userId)
    if (error) {
      console.error('[email] getUserEmail failed', { userId, error: error.message })
      return null
    }
    return data?.user?.email ?? null
  } catch (e: any) {
    console.error('[email] getUserEmail threw', { userId, error: e?.message })
    return null
  }
}

/**
 * Look up the display name on the user's profile for personalised greetings.
 * Returns null on miss.
 */
export async function getUserDisplayName(userId: string): Promise<string | null> {
  try {
    const { data } = await admin()
      .from('profiles').select('display_name').eq('id', userId).maybeSingle()
    return (data?.display_name as string | null) ?? null
  } catch {
    return null
  }
}
