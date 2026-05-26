import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'CallEscort24'

interface Props {
  recipientName?: string
  status?: 'approved' | 'rejected'
  note?: string
  url?: string
}

const KycStatusEmail = ({
  recipientName,
  status = 'approved',
  note,
  url = 'https://callescort.devloader.com/wallet',
}: Props) => {
  const approved = status === 'approved'
  return (
    <EmailShell siteName={SITE_NAME} preview={approved ? 'Your identity is verified' : 'Verification needs attention'}>
      <Heading style={styles.h1}>
        {approved
          ? recipientName ? `Welcome aboard, ${recipientName}!` : 'You’re verified!'
          : recipientName ? `Hi ${recipientName},` : 'Hi there,'}
      </Heading>
      {approved ? (
        <>
          <Text style={styles.text}>
            Your identity has been verified. As a thank-you, we’ve credited <strong>$5</strong> to your wallet.
          </Text>
          <Text style={styles.text}>
            Verified accounts get a trust badge that buyers see on your listings.
          </Text>
          <div style={styles.buttonWrap}>
            <Button style={styles.button} href={url}>Open wallet</Button>
          </div>
        </>
      ) : (
        <>
          <Text style={styles.text}>
            We weren’t able to approve your verification submission this time.
          </Text>
          {note ? (
            <Text style={{ ...styles.text, padding: '14px 16px', background: '#FBF6FF', borderRadius: 10, border: '1px solid #ECEAF8' }}>
              <strong>Reviewer note:</strong> {note}
            </Text>
          ) : null}
          <div style={styles.buttonWrap}>
            <Button style={styles.button} href={url}>Resubmit verification</Button>
          </div>
        </>
      )}
    </EmailShell>
  )
}

export const template = {
  component: KycStatusEmail,
  subject: (d: Record<string, any>) =>
    d?.status === 'rejected'
      ? `Your ${SITE_NAME} verification needs attention`
      : `You're verified on ${SITE_NAME} — enjoy your $5 bonus`,
  displayName: 'KYC status',
  previewData: {
    recipientName: 'Alex',
    status: 'approved',
    url: 'https://callescort.devloader.com/wallet',
  },
} satisfies TemplateEntry

export default KycStatusEmail
