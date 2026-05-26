import * as React from 'react'
import { Button, Heading, Link, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'CallEscort24'

interface NotificationEmailProps {
  recipientName?: string
  title?: string
  message?: string
  actionUrl?: string
  actionLabel?: string
}

const NotificationEmail = ({
  recipientName,
  title = 'You have a new update',
  message = 'There is new activity on your CallEscort24 account.',
  actionUrl,
  actionLabel = 'Open CallEscort24',
}: NotificationEmailProps) => (
  <EmailShell siteName={SITE_NAME} preview={title}>
    <Heading style={styles.h1}>
      {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
    </Heading>
    <Text style={styles.text}>{message}</Text>
    {actionUrl ? (
      <>
        <div style={styles.buttonWrap}>
          <Button style={styles.button} href={actionUrl}>
            {actionLabel}
          </Button>
        </div>
        <Text style={styles.small}>
          Or open this link in your browser:
          <br />
          <Link href={actionUrl} style={styles.link}>
            {actionUrl}
          </Link>
        </Text>
      </>
    ) : null}
  </EmailShell>
)

export const template = {
  component: NotificationEmail,
  subject: (data: Record<string, any>) =>
    (data?.title as string) || 'A new update from CallEscort24',
  displayName: 'Generic notification',
  previewData: {
    recipientName: 'Alex',
    title: 'New message on your listing',
    message:
      'You have a new message about one of your listings. Tap below to open the conversation.',
    actionUrl: 'https://callescort.devloader.com/messages',
    actionLabel: 'Open messages',
  },
} satisfies TemplateEntry

export default NotificationEmail
