import * as React from 'react'
import { Button, Heading, Link, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <EmailShell siteName={siteName} preview={`Reset your password for ${siteName}`}>
    <Heading style={styles.h1}>Reset your password</Heading>
    <Text style={styles.text}>
      We received a request to reset the password on your {siteName} account.
      Click the button below to choose a new one — the link is valid for a
      limited time.
    </Text>
    <div style={styles.buttonWrap}>
      <Button style={styles.button} href={confirmationUrl}>
        Choose a new password
      </Button>
    </div>
    <Text style={styles.small}>
      Or paste this URL into your browser:
      <br />
      <Link href={confirmationUrl} style={styles.link}>
        {confirmationUrl}
      </Link>
    </Text>
    <Text style={styles.small}>
      Didn't ask for this? You can ignore this email — your password won't change.
    </Text>
  </EmailShell>
)

export default RecoveryEmail
