import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'

export const brand = {
  primary: '#6E5BE8',
  primaryDark: '#4F3FCB',
  accent: '#2BB6DC',
  ink: '#1F1947',
  body: '#3C3760',
  muted: '#7A7494',
  border: '#ECEAF8',
  surface: '#F7F5FF',
  white: '#ffffff',
  gradient:
    'linear-gradient(135deg, #8B7BFF 0%, #6E5BE8 50%, #2BB6DC 100%)',
}

export const styles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    margin: 0,
    padding: '32px 0',
  } as React.CSSProperties,
  container: {
    width: '100%',
    maxWidth: '560px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    overflow: 'hidden',
    border: `1px solid ${brand.border}`,
    boxShadow: '0 12px 40px -16px rgba(110, 91, 232, 0.25)',
  } as React.CSSProperties,
  header: {
    background: brand.gradient,
    padding: '36px 32px',
    textAlign: 'center' as const,
  },
  logo: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    margin: 0,
  } as React.CSSProperties,
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '13px',
    margin: '6px 0 0',
    letterSpacing: '0.02em',
  } as React.CSSProperties,
  content: { padding: '36px 32px 24px' } as React.CSSProperties,
  h1: {
    fontSize: '24px',
    fontWeight: 700,
    color: brand.ink,
    lineHeight: 1.25,
    margin: '0 0 16px',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,
  text: {
    fontSize: '15px',
    color: brand.body,
    lineHeight: 1.6,
    margin: '0 0 20px',
  } as React.CSSProperties,
  buttonWrap: {
    textAlign: 'center' as const,
    margin: '28px 0',
  },
  button: {
    display: 'inline-block',
    background: brand.gradient,
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '12px',
    padding: '14px 32px',
    textDecoration: 'none',
    boxShadow: '0 8px 24px -8px rgba(110, 91, 232, 0.6)',
  } as React.CSSProperties,
  link: { color: brand.primary, textDecoration: 'underline' } as React.CSSProperties,
  code: {
    display: 'inline-block',
    fontFamily: "'SF Mono', Consolas, Menlo, monospace",
    fontSize: '32px',
    fontWeight: 700,
    color: brand.primary,
    letterSpacing: '0.4em',
    backgroundColor: brand.surface,
    border: `1px solid ${brand.border}`,
    borderRadius: '12px',
    padding: '18px 28px',
    margin: '8px 0 24px',
  } as React.CSSProperties,
  small: {
    fontSize: '13px',
    color: brand.muted,
    lineHeight: 1.5,
    margin: '20px 0 0',
  } as React.CSSProperties,
  hr: {
    border: 'none',
    borderTop: `1px solid ${brand.border}`,
    margin: '28px 0 20px',
  } as React.CSSProperties,
  footer: {
    padding: '20px 32px 28px',
    textAlign: 'center' as const,
    backgroundColor: brand.surface,
  } as React.CSSProperties,
  footerText: {
    fontSize: '12px',
    color: brand.muted,
    margin: '0 0 4px',
    lineHeight: 1.5,
  } as React.CSSProperties,
}

interface ShellProps {
  siteName: string
  preview: string
  children: React.ReactNode
}

export const EmailShell = ({ siteName, preview, children }: ShellProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.logo}>{siteName}</Text>
          <Text style={styles.tagline}>Classifieds, simplified.</Text>
        </Section>
        <Section style={styles.content}>{children}</Section>
        <Hr style={{ ...styles.hr, margin: 0 }} />
        <Section style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </Text>
          <Text style={styles.footerText}>
            You received this email because of activity on your {siteName} account.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)
