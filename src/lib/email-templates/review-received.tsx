import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'CallEscort24'

interface Props {
  recipientName?: string
  rating?: number
  body?: string
  profileUrl?: string
}

const stars = (n: number) => '★'.repeat(Math.max(0, Math.min(5, n))) + '☆'.repeat(5 - Math.max(0, Math.min(5, n)))

const ReviewReceivedEmail = ({
  recipientName,
  rating = 5,
  body,
  profileUrl = 'https://callescort.devloader.com/dashboard',
}: Props) => (
  <EmailShell siteName={SITE_NAME} preview={`You got a new ${rating}★ review`}>
    <Heading style={styles.h1}>
      {recipientName ? `${recipientName}, you got a new review!` : 'You got a new review!'}
    </Heading>
    <Text style={{ ...styles.text, fontSize: 22, color: '#6E5BE8', letterSpacing: '0.1em' }}>
      {stars(rating)}
    </Text>
    {body ? (
      <Text style={{ ...styles.text, fontStyle: 'italic', color: '#5a5478' }}>
        “{body.length > 240 ? body.slice(0, 240) + '…' : body}”
      </Text>
    ) : null}
    <div style={styles.buttonWrap}>
      <Button style={styles.button} href={profileUrl}>See your reviews</Button>
    </div>
  </EmailShell>
)

export const template = {
  component: ReviewReceivedEmail,
  subject: (d: Record<string, any>) =>
    `You received a ${d?.rating ?? ''}★ review on ${SITE_NAME}`.replace('  ', ' '),
  displayName: 'Review received',
  previewData: {
    recipientName: 'Alex',
    rating: 5,
    body: 'Smooth transaction, item exactly as described. Would buy again!',
    profileUrl: 'https://callescort.devloader.com/dashboard',
  },
} satisfies TemplateEntry

export default ReviewReceivedEmail
