import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'CallEscort24'

interface Props {
  recipientName?: string
  listingTitle?: string
  listingUrl?: string
}

const ListingApprovedEmail = ({
  recipientName,
  listingTitle = 'Your listing',
  listingUrl = 'https://callescort.devloader.com/dashboard/listings',
}: Props) => (
  <EmailShell siteName={SITE_NAME} preview={`${listingTitle} is now live`}>
    <Heading style={styles.h1}>
      {recipientName ? `Great news, ${recipientName}!` : 'Great news!'}
    </Heading>
    <Text style={styles.text}>
      Your listing <strong>{listingTitle}</strong> has been approved and is now live on {SITE_NAME}.
    </Text>
    <Text style={styles.text}>
      Buyers can now find, view, and message you about it.
    </Text>
    <div style={styles.buttonWrap}>
      <Button style={styles.button} href={listingUrl}>View listing</Button>
    </div>
  </EmailShell>
)

export const template = {
  component: ListingApprovedEmail,
  subject: (d: Record<string, any>) =>
    `Your listing${d?.listingTitle ? ` "${d.listingTitle}"` : ''} is live`,
  displayName: 'Listing approved',
  previewData: {
    recipientName: 'Alex',
    listingTitle: 'Vintage Leather Jacket',
    listingUrl: 'https://callescort.devloader.com/listings/sample',
  },
} satisfies TemplateEntry

export default ListingApprovedEmail
