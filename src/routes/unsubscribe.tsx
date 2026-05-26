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

export const Route = createFileRoute('/unsubscribe')({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === 'string' ? s.token : '',
  }),
  component: UnsubscribePage,
})

function UnsubscribePage() {
  const { token } = useSearch({ from: '/unsubscribe' })
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!token) {
        setState({ kind: 'invalid', message: 'Missing unsubscribe token.' })
        return
      }
      try {
        const res = await fetch(
          `/email/unsubscribe?token=${encodeURIComponent(token)}`,
        )
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setState({
            kind: 'invalid',
            message: json?.error || 'This unsubscribe link is invalid or expired.',
          })
          return
        }
        if (json.valid === false && json.reason === 'already_unsubscribed') {
          setState({ kind: 'already' })
        } else {
          setState({ kind: 'ready' })
        }
      } catch {
        if (!cancelled) {
          setState({ kind: 'invalid', message: 'Could not verify this link.' })
        }
      }
    }
    check()
    return () => {
      cancelled = true
    }
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
        setState({
          kind: 'error',
          message: json?.error || 'Could not process your request.',
        })
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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unsubscribe from CallEscort24 emails</CardTitle>
          <CardDescription>
            We'll stop sending non-essential emails to this address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === 'loading' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying your link…
            </div>
          )}

          {state.kind === 'ready' && (
            <>
              <p className="text-sm text-muted-foreground">
                Click below to confirm. You'll still receive important account
                emails like password resets and security alerts.
              </p>
              <Button onClick={confirm} className="w-full">
                Confirm unsubscribe
              </Button>
            </>
          )}

          {state.kind === 'submitting' && (
            <Button disabled className="w-full">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing…
            </Button>
          )}

          {state.kind === 'done' && (
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">You're unsubscribed.</p>
                <p className="text-muted-foreground">
                  You won't receive marketing or notification emails from
                  CallEscort24 anymore.
                </p>
              </div>
            </div>
          )}

          {state.kind === 'already' && (
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Already unsubscribed.</p>
                <p className="text-muted-foreground">
                  This address is no longer receiving notification emails.
                </p>
              </div>
            </div>
          )}

          {(state.kind === 'invalid' || state.kind === 'error') && (
            <div className="flex items-start gap-3 text-sm">
              <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium">Something went wrong.</p>
                <p className="text-muted-foreground">{state.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
