import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'CallEscort24'

interface Props {
  recipientName?: string
  senderName?: string
  listingTitle?: string
  preview?: string
  threadUrl?: string
}

const NewMessageEmail = ({
  recipientName,
  senderName = 'Someone',
  listingTitle,
  preview,
  threadUrl = 'https://callescort.devloader.com/messages',
}: Props) => (
  <EmailShell siteName={SITE_NAME} preview={`New message from ${senderName}`}>
    <Heading style={styles.h1}>
      {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
    </Heading>
    <Text style={styles.text}>
      <strong>{senderName}</strong> sent you a new message
      {listingTitle ? <> about <em>{listingTitle}</em></> : null}.
    </Text>
    {preview ? (
      <Text style={{ ...styles.text, fontStyle: 'italic', color: '#5a5478' }}>
        “{preview.length > 180 ? preview.slice(0, 180) + '…' : preview}”
      </Text>
    ) : null}
    <div style={styles.buttonWrap}>
      <Button style={styles.button} href={threadUrl}>Open conversation</Button>
    </div>
  </EmailShell>
)

export const template = {
  component: NewMessageEmail,
  subject: (d: Record<string, any>) =>
    `New message${d?.senderName ? ` from ${d.senderName}` : ''} on ${SITE_NAME}`,
  displayName: 'New message',
  previewData: {
    recipientName: 'Alex',
    senderName: 'Jordan',
    listingTitle: 'Vintage Leather Jacket',
    preview: 'Hey! Is this still available? Could you share more photos?',
    threadUrl: 'https://callescort.devloader.com/messages/abc',
  },
} satisfies TemplateEntry

export default NewMessageEmail
