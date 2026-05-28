import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { KpiTile } from "@/components/admin/KpiTile";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Server, Wifi, Bug } from "lucide-react";
import { listErrors, errorStats } from "@/lib/errors.functions";

export const Route = createFileRoute("/admin/errors")({ component: ErrorsPage });

function ErrorsPage() {
  const statsFn = useServerFn(errorStats);
  const listFn = useServerFn(listErrors);
  const [source, setSource] = useState<"client" | "server">("client");
  const [kind, setKind] = useState<string>("all");

  const stats = useQuery({ queryKey: ["err-stats"], queryFn: () => statsFn() });
  const rows = useQuery({
    queryKey: ["err-list", source, kind],
    queryFn: () => listFn({ data: { source, kind: kind === "all" ? undefined : kind, sinceHours: 24, limit: 100 } }),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Error monitoring" subtitle="Recoverable client errors and server faults from the last 24h" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile icon={<Wifi className="h-4 w-4" />} label="Client · 24h" value={stats.data?.client24 ?? "—"} />
        <KpiTile icon={<Bug className="h-4 w-4" />} label="Client · 7d" value={stats.data?.client7d ?? "—"} />
        <KpiTile icon={<Server className="h-4 w-4" />} label="Server · 24h" value={stats.data?.server24 ?? "—"} />
        <KpiTile icon={<AlertTriangle className="h-4 w-4" />} label="Server · 7d" value={stats.data?.server7d ?? "—"} />
      </div>

      <Tabs value={source} onValueChange={(v) => setSource(v as "client" | "server")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="client">Client</TabsTrigger>
            <TabsTrigger value="server">Server</TabsTrigger>
          </TabsList>
          {source === "client" && (
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                <SelectItem value="unhandled">Unhandled</SelectItem>
                <SelectItem value="chunk_reload">Chunk reload</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="query">Query</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value={source} className="mt-4">
          <Panel>
            {rows.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!rows.isLoading && (rows.data?.rows.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">No errors in the selected window.</p>
            )}
            <ul className="divide-y divide-border">
              {(rows.data?.rows ?? []).map((r: any) => (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{r.severity}</Badge>
                    {r.kind && <Badge variant="secondary">{r.kind}</Badge>}
                    {r.route && <span className="text-muted-foreground">{r.route}</span>}
                    <span className="ml-auto text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="mt-1 text-sm">{r.message}</p>
                  {r.stack && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-muted-foreground">Stack</summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">{r.stack}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
