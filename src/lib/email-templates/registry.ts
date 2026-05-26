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

/**
 * Template registry — maps template names to React Email components.
 * Add new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  notification,
}
