import * as React from 'react'
import { Button, Heading, Link, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <EmailShell siteName={siteName} preview={`You've been invited to ${siteName}`}>
    <Heading style={styles.h1}>You're invited to {siteName}</Heading>
    <Text style={styles.text}>
      Someone invited you to join{' '}
      <Link href={siteUrl} style={styles.link}>
        <strong>{siteName}</strong>
      </Link>
      . Accept the invitation to create your account and get started.
    </Text>
    <div style={styles.buttonWrap}>
      <Button style={styles.button} href={confirmationUrl}>
        Accept invitation
      </Button>
    </div>
    <Text style={styles.small}>
      Not expecting this? You can safely ignore this email.
    </Text>
  </EmailShell>
)

export default InviteEmail
