import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as notification } from './notification'
import { template as newMessage } from './new-message'
import { template as listingApproved } from './listing-approved'
import { template as listingRejected } from './listing-rejected'
import { template as reviewReceived } from './review-received'
import { template as kycStatus } from './kyc-status'
import { template as topupConfirmed } from './topup-confirmed'

/**
 * Template registry — maps template names to React Email components.
 * Add new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  notification,
  'new-message': newMessage,
  'listing-approved': listingApproved,
  'listing-rejected': listingRejected,
  'review-received': reviewReceived,
  'kyc-status': kycStatus,
  'topup-confirmed': topupConfirmed,
}
