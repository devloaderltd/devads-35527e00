import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'CallEscort24'

interface Props {
  recipientName?: string
  listingTitle?: string
  reason?: string
  dashboardUrl?: string
}

const ListingRejectedEmail = ({
  recipientName,
  listingTitle = 'Your listing',
  reason,
  dashboardUrl = 'https://callescort.devloader.com/dashboard/listings',
}: Props) => (
  <EmailShell siteName={SITE_NAME} preview={`${listingTitle} needs changes`}>
    <Heading style={styles.h1}>
      {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
    </Heading>
    <Text style={styles.text}>
      Your listing <strong>{listingTitle}</strong> couldn't be approved at this time.
    </Text>
    {reason ? (
      <Text style={{ ...styles.text, padding: '14px 16px', background: '#FBF6FF', borderRadius: 10, border: '1px solid #ECEAF8' }}>
        <strong>Reason:</strong> {reason}
      </Text>
    ) : null}
    <Text style={styles.text}>
      You can edit and resubmit it from your dashboard.
    </Text>
    <div style={styles.buttonWrap}>
      <Button style={styles.button} href={dashboardUrl}>Edit listing</Button>
    </div>
  </EmailShell>
)

export const template = {
  component: ListingRejectedEmail,
  subject: (d: Record<string, any>) =>
    `Action needed: ${d?.listingTitle || 'your listing'} on ${SITE_NAME}`,
  displayName: 'Listing rejected',
  previewData: {
    recipientName: 'Alex',
    listingTitle: 'Vintage Leather Jacket',
    reason: 'Images are too low resolution. Please re-upload at 1024px or higher.',
    dashboardUrl: 'https://callescort.devloader.com/dashboard',
  },
} satisfies TemplateEntry

export default ListingRejectedEmail
