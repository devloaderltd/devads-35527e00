/**
 * Server functions for sending app emails from authenticated client flows.
 * Currently provides notifyNewMessage, called after a message is inserted
 * to email the other party in the thread.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import {
  enqueueTransactionalEmail,
  getUserEmail,
  getUserDisplayName,
} from './enqueue.server'

const SITE_URL = 'https://callescort.devloader.com'

export const notifyNewMessage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string; preview?: string }) => {
    const schema = z.object({
      threadId: z.string().uuid(),
      preview: z.string().max(500).optional(),
    })
    return schema.parse(input)
  })
  .handler(async ({ data, context }) => {
    const { threadId, preview } = data
    const senderId = context.userId

    const { data: thread } = await supabaseAdmin
      .from('message_threads')
      .select('id, buyer_id, seller_id, listing_id')
      .eq('id', threadId)
      .maybeSingle()
    if (!thread) return { ok: false, reason: 'thread_not_found' as const }

    const recipientId =
      thread.buyer_id === senderId ? thread.seller_id : thread.buyer_id
    if (!recipientId || recipientId === senderId) {
      return { ok: false, reason: 'no_recipient' as const }
    }

    const [recipientEmail, recipientName, senderName, listing] = await Promise.all([
      getUserEmail(recipientId),
      getUserDisplayName(recipientId),
      getUserDisplayName(senderId),
      thread.listing_id
        ? supabaseAdmin
            .from('listings').select('title').eq('id', thread.listing_id).maybeSingle()
            .then((r) => r.data?.title as string | null)
        : Promise.resolve(null),
    ])
    if (!recipientEmail) return { ok: false, reason: 'no_email' as const }

    const res = await enqueueTransactionalEmail({
      templateName: 'new-message',
      recipientEmail,
      idempotencyKey: `msg-${threadId}-${senderId}-${Date.now()}`,
      templateData: {
        recipientName: recipientName ?? undefined,
        senderName: senderName ?? 'A user',
        listingTitle: listing ?? undefined,
        preview,
        threadUrl: `${SITE_URL}/messages/${threadId}`,
      },
    })
    return res
  })
