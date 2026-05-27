import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

type State =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'already' }
  | { kind: 'invalid'; message: string }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; message: string }

export const Route = createFileRoute('/email-unsubscribe')({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === 'string' ? s.token : '',
  }),
  component: EmailUnsubscribePage,
})

function EmailUnsubscribePage() {
  const { token } = useSearch({ from: '/email-unsubscribe' })
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!token) {
        setState({ kind: 'invalid', message: 'Missing unsubscribe token.' })
        return
      }
      try {
        const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setState({ kind: 'invalid', message: json?.error || 'This unsubscribe link is invalid or expired.' })
          return
        }
        if (json.valid === false && json.reason === 'already_unsubscribed') {
          setState({ kind: 'already' })
        } else {
          setState({ kind: 'ready' })
        }
      } catch {
        if (!cancelled) setState({ kind: 'error', message: 'Could not reach the server.' })
      }
    }
    check()
    return () => { cancelled = true }
  }, [token])

  async function confirm() {
    setState({ kind: 'submitting' })
    try {
      const res = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState({ kind: 'error', message: json?.error || 'Failed to unsubscribe.' })
        return
      }
      if (json.success === false && json.reason === 'already_unsubscribed') {
        setState({ kind: 'already' })
      } else {
        setState({ kind: 'done' })
      }
    } catch {
      setState({ kind: 'error', message: 'Network error. Please try again.' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unsubscribe from CallEscort24 emails</CardTitle>
          <CardDescription>
            Manage your email preferences for notifications from CallEscort24.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === 'loading' && (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking your link…</div>
          )}
          {state.kind === 'ready' && (
            <>
              <p className="text-sm text-muted-foreground">Click below to confirm you no longer want to receive emails from CallEscort24.</p>
              <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
            </>
          )}
          {state.kind === 'submitting' && (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Processing…</div>
          )}
          {state.kind === 'done' && (
            <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" />You have been unsubscribed.</div>
          )}
          {state.kind === 'already' && (
            <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-5 w-5" />You are already unsubscribed.</div>
          )}
          {(state.kind === 'invalid' || state.kind === 'error') && (
            <div className="flex items-start gap-2 text-destructive"><XCircle className="h-5 w-5 mt-0.5" /><span>{state.message}</span></div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
