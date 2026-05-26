import * as React from 'react'
import { Button, Heading, Link, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailShell siteName={siteName} preview={`Confirm your email for ${siteName}`}>
    <Heading style={styles.h1}>Welcome to {siteName} 👋</Heading>
    <Text style={styles.text}>
      Thanks for joining{' '}
      <Link href={siteUrl} style={styles.link}>
        <strong>{siteName}</strong>
      </Link>
      . Please confirm <strong>{recipient}</strong> so we can keep your account secure.
    </Text>
    <div style={styles.buttonWrap}>
      <Button style={styles.button} href={confirmationUrl}>
        Verify my email
      </Button>
    </div>
    <Text style={styles.small}>
      Button not working? Paste this link into your browser:
      <br />
      <Link href={confirmationUrl} style={styles.link}>
        {confirmationUrl}
      </Link>
    </Text>
    <Text style={styles.small}>
      If you didn't create an account, you can safely ignore this email.
    </Text>
  </EmailShell>
)

export default SignupEmail
