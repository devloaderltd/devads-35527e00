import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { EmailShell, styles } from './_layout'

interface ReauthenticationEmailProps {
  siteName?: string
  token: string
}

export const ReauthenticationEmail = ({
  siteName = 'CallEscort24',
  token,
}: ReauthenticationEmailProps) => (
  <EmailShell siteName={siteName} preview="Your verification code">
    <Heading style={styles.h1}>Confirm it's really you</Heading>
    <Text style={styles.text}>
      Use the code below to confirm your identity on {siteName}. This code
      expires shortly — don't share it with anyone.
    </Text>
    <div style={{ textAlign: 'center' }}>
      <span style={styles.code}>{token}</span>
    </div>
    <Text style={styles.small}>
      If you didn't request this, you can safely ignore this email.
    </Text>
  </EmailShell>
)

export default ReauthenticationEmail
