import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/debug/session")({
  head: () => ({ meta: [{ title: "Session debug — Marketly" }, { name: "robots", content: "noindex" }] }),
  component: DebugSessionPage,
});

function decodeJwt(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function DebugSessionPage() {
  const { user, session: hookSession, loading } = useAuth();
  const [session, setSession] = useState<Session | null>(hookSession);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setSession(hookSession); }, [hookSession]);

  const rolesQ = useQuery({
    queryKey: ["debug-roles", user?.id],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map(r => r.role as string);
    },
  });

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await rolesQ.refetch();
    toast.success("Refreshed");
  };

  const roles = rolesQ.data ?? [];
  const isAdmin = roles.includes("admin");
  const isModerator = isAdmin || roles.includes("moderator");
  const claims = decodeJwt(session?.access_token);

  const dump = {
    loading,
    user: user ? {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    } : null,
    session: session ? {
      expires_at: session.expires_at,
      expires_in_seconds: session.expires_at ? session.expires_at - Math.floor(Date.now() / 1000) : null,
      token_type: session.token_type,
      access_token_length: session.access_token?.length ?? 0,
      refresh_token_present: !!session.refresh_token,
    } : null,
    roles,
    isAdmin,
    isModerator,
    rolesError: rolesQ.error ? String(rolesQ.error) : null,
    claims,
  };

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(dump, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Session <span className="gradient-text">debug</span></h1>
          <p className="text-sm text-muted-foreground">Live view of your auth state. Not indexed.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" className="btn-gradient rounded-full border-0" onClick={copy}>
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            Copy JSON
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
          <CardHeader className="pb-2"><CardTitle className="text-base">Status</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={loading ? "secondary" : "default"}>loading: {String(loading)}</Badge>
            <Badge variant={user ? "default" : "destructive"}>user: {user ? "yes" : "no"}</Badge>
            <Badge variant={session ? "default" : "destructive"}>session: {session ? "yes" : "no"}</Badge>
            <Badge variant={isAdmin ? "default" : "secondary"}>admin: {String(isAdmin)}</Badge>
            <Badge variant={isModerator ? "default" : "secondary"}>moderator: {String(isModerator)}</Badge>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
          <CardHeader className="pb-2"><CardTitle className="text-base">User</CardTitle></CardHeader>
          <CardContent>
            <Field label="user.id" value={user?.id} mono />
            <Field label="email" value={user?.email} />
            <Field label="created_at" value={user?.created_at ? format(new Date(user.created_at), "PPpp") : undefined} />
            <Field label="last_sign_in_at" value={user?.last_sign_in_at ? format(new Date(user.last_sign_in_at), "PPpp") : undefined} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
          <CardHeader className="pb-2"><CardTitle className="text-base">Session</CardTitle></CardHeader>
          <CardContent>
            <Field label="expires_at" value={session?.expires_at ? format(new Date(session.expires_at * 1000), "PPpp") : undefined} />
            <Field label="expires_in" value={session?.expires_at ? `${session.expires_at - Math.floor(Date.now()/1000)}s` : undefined} />
            <Field label="token_type" value={session?.token_type} />
            <Field label="access_token (len)" value={session?.access_token?.length?.toString()} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
          <CardHeader className="pb-2"><CardTitle className="text-base">Roles (live from user_roles)</CardTitle></CardHeader>
          <CardContent>
            {rolesQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : rolesQ.error ? (
              <p className="text-sm text-destructive">Error: {String(rolesQ.error)}</p>
            ) : roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No roles assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {roles.map(r => <Badge key={r} className="capitalize">{r}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
          <CardHeader className="pb-2"><CardTitle className="text-base">JWT claims</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs leading-relaxed">
{JSON.stringify(claims, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/30 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-sm"}>{value ?? <em className="text-muted-foreground">—</em>}</span>
    </div>
  );
}
