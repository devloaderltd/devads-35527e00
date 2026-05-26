import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'CallEscort24'

interface Props {
  recipientName?: string
  amountUsd?: number
  currency?: string
  reference?: string
  walletUrl?: string
}

const TopupConfirmedEmail = ({
  recipientName,
  amountUsd,
  currency,
  reference,
  walletUrl = 'https://callescort.devloader.com/wallet',
}: Props) => (
  <EmailShell siteName={SITE_NAME} preview={`Top-up of $${amountUsd?.toFixed(2) ?? '0.00'} confirmed`}>
    <Heading style={styles.h1}>
      {recipientName ? `Thanks, ${recipientName}!` : 'Thanks for your top-up!'}
    </Heading>
    <Text style={styles.text}>
      Your wallet has been credited with{' '}
      <strong>${amountUsd?.toFixed(2) ?? '0.00'} USD</strong>
      {currency ? <> (paid in {currency.toUpperCase()})</> : null}.
    </Text>
    {reference ? (
      <Text style={styles.small}>
        Reference: <code>{reference}</code>
      </Text>
    ) : null}
    <div style={styles.buttonWrap}>
      <Button style={styles.button} href={walletUrl}>Open wallet</Button>
    </div>
  </EmailShell>
)

export const template = {
  component: TopupConfirmedEmail,
  subject: (d: Record<string, any>) =>
    `Top-up confirmed: $${(d?.amountUsd ?? 0).toFixed?.(2) ?? d?.amountUsd ?? ''} added to your ${SITE_NAME} wallet`,
  displayName: 'Top-up confirmed',
  previewData: {
    recipientName: 'Alex',
    amountUsd: 25,
    currency: 'btc',
    reference: 'order_abc123',
    walletUrl: 'https://callescort.devloader.com/wallet',
  },
} satisfies TemplateEntry

export default TopupConfirmedEmail
