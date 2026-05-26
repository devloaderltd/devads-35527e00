import * as React from 'react'
import { Button, Heading, Link, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <EmailShell siteName={siteName} preview={`Your sign-in link for ${siteName}`}>
    <Heading style={styles.h1}>Sign in to {siteName}</Heading>
    <Text style={styles.text}>
      Tap the button below to securely sign in. This link expires shortly and can
      only be used once.
    </Text>
    <div style={styles.buttonWrap}>
      <Button style={styles.button} href={confirmationUrl}>
        Sign in to {siteName}
      </Button>
    </div>
    <Text style={styles.small}>
      Trouble with the button? Open this URL:
      <br />
      <Link href={confirmationUrl} style={styles.link}>
        {confirmationUrl}
      </Link>
    </Text>
    <Text style={styles.small}>
      Didn't request this? You can safely ignore this email.
    </Text>
  </EmailShell>
)

export default MagicLinkEmail
