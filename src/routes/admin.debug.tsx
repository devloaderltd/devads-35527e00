import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity, AlertCircle, CheckCircle2, Trash2, Database, Bug, Server, RefreshCw,
} from "lucide-react";
import {
  listClientErrors, resolveClientError, deleteResolvedClientErrors,
  listServerFnLogs, getSystemHealth, adminPeekTable, safeTablesList,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/debug")({ component: DebugPage });

function DebugPage() {
  return (
    <div>
      <AdminPageHeader title="Debug & error center" subtitle="Live errors, server logs, health checks, and database inspector" />
      <Tabs defaultValue="errors" className="w-full">
        <TabsList className="bg-white/5">
          <TabsTrigger value="errors"><Bug className="mr-1 h-4 w-4" />Client errors</TabsTrigger>
          <TabsTrigger value="server"><Server className="mr-1 h-4 w-4" />Server logs</TabsTrigger>
          <TabsTrigger value="health"><Activity className="mr-1 h-4 w-4" />Health</TabsTrigger>
          <TabsTrigger value="inspector"><Database className="mr-1 h-4 w-4" />DB inspector</TabsTrigger>
        </TabsList>
        <TabsContent value="errors" className="mt-4"><ClientErrorsTab /></TabsContent>
        <TabsContent value="server" className="mt-4"><ServerLogsTab /></TabsContent>
        <TabsContent value="health" className="mt-4"><HealthTab /></TabsContent>
        <TabsContent value="inspector" className="mt-4"><InspectorTab /></TabsContent>
      </Tabs>
    </div>
  );
}

type ClientErr = { id: string; created_at: string; message: string; stack: string | null; route: string | null; severity: string; resolved: boolean; user_agent: string | null };

function ClientErrorsTab() {
  const list = useServerFn(listClientErrors);
  const resolve = useServerFn(resolveClientError);
  const cleanup = useServerFn(deleteResolvedClientErrors);
  const qc = useQueryClient();
  const [onlyUnresolved, setOnlyUnresolved] = useState(true);
  const [expand, setExpand] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-client-errors", onlyUnresolved],
    queryFn: () => list({ data: { onlyUnresolved, limit: 200 } }),
  });

  const resMut = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) => resolve({ data: { id, resolved } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-client-errors"] }),
  });
  const cleanupMut = useMutation({
    mutationFn: () => cleanup(),
    onSuccess: (r) => { toast.success(`Removed ${r.deleted} resolved`); qc.invalidateQueries({ queryKey: ["admin-client-errors"] }); },
  });

  return (
    <Panel title="Client errors" actions={
      <div className="flex gap-2">
        <Button size="sm" variant={onlyUnresolved ? "default" : "outline"} onClick={() => setOnlyUnresolved(!onlyUnresolved)} className="rounded-full">
          {onlyUnresolved ? "Unresolved only" : "All"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => q.refetch()} className="rounded-full"><RefreshCw className="h-3 w-3" /></Button>
        <Button size="sm" variant="ghost" className="text-red-400" onClick={() => { if (confirm("Delete all resolved errors?")) cleanupMut.mutate(); }}><Trash2 className="h-3 w-3" /></Button>
      </div>
    }>
      <div className="space-y-2">
        {(q.data?.errors ?? []).map((e: ClientErr) => (
          <div key={e.id} className="rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-2 p-3">
              <Badge variant={e.severity === "fatal" ? "destructive" : e.resolved ? "secondary" : "default"} className="capitalize">{e.severity}</Badge>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-100">{e.message}</div>
                <div className="text-xs text-slate-500">{e.route || "—"} · {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setExpand(expand === e.id ? null : e.id)}>{expand === e.id ? "Hide" : "Details"}</Button>
              <Button size="sm" variant="ghost" className={e.resolved ? "text-slate-400" : "text-emerald-400"}
                onClick={() => resMut.mutate({ id: e.id, resolved: !e.resolved })}>
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </div>
            {expand === e.id && (
              <div className="border-t border-white/10 p-3 text-xs">
                {e.stack && <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900/60 p-3 text-[11px] text-slate-300">{e.stack}</pre>}
                {e.user_agent && <div className="mt-2 text-slate-500">UA: {e.user_agent}</div>}
              </div>
            )}
          </div>
        ))}
        {!q.data?.errors.length && <div className="py-8 text-center text-sm text-slate-400">No errors recorded.</div>}
      </div>
    </Panel>
  );
}

type SrvLog = { id: string; created_at: string; fn_name: string; user_id: string | null; duration_ms: number; status: string; error: string | null };

function ServerLogsTab() {
  const list = useServerFn(listServerFnLogs);
  const [onlyErrors, setOnlyErrors] = useState(true);
  const q = useQuery({
    queryKey: ["admin-server-logs", onlyErrors],
    queryFn: () => list({ data: { onlyErrors, limit: 200 } }),
  });
  return (
    <Panel title="Server function logs" actions={
      <div className="flex gap-2">
        <Button size="sm" variant={onlyErrors ? "default" : "outline"} onClick={() => setOnlyErrors(!onlyErrors)} className="rounded-full">
          {onlyErrors ? "Errors only" : "All"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => q.refetch()} className="rounded-full"><RefreshCw className="h-3 w-3" /></Button>
      </div>
    }>
      <div className="space-y-1">
        {(q.data?.logs ?? []).map((l: SrvLog) => (
          <div key={l.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs">
            <Badge variant={l.status === "ok" ? "secondary" : "destructive"}>{l.status}</Badge>
            <span className="font-mono text-slate-100">{l.fn_name}</span>
            <span className="text-slate-500">{l.duration_ms}ms</span>
            <span className="flex-1 truncate text-slate-400">{l.error || ""}</span>
            <span className="text-slate-500">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</span>
          </div>
        ))}
        {!q.data?.logs.length && <div className="py-8 text-center text-sm text-slate-400">No logs yet. Server logging instrumentation runs on future requests.</div>}
      </div>
    </Panel>
  );
}

function HealthTab() {
  const get = useServerFn(getSystemHealth);
  const q = useQuery({ queryKey: ["admin-health"], queryFn: () => get(), refetchInterval: 30_000 });
  const c = q.data?.counts;
  const items = c ? [
    { label: "Users", value: c.users, ok: true },
    { label: "Active listings", value: c.activeListings, ok: c.activeListings > 0 },
    { label: "Total listings", value: c.listings, ok: true },
    { label: "Open reports", value: c.openReports, ok: c.openReports < 10, warn: c.openReports >= 10 },
    { label: "Pending top-ups", value: c.pendingTopups, ok: c.pendingTopups < 10, warn: c.pendingTopups >= 10 },
    { label: "Failed payments (24h)", value: c.failedPayments24h, ok: c.failedPayments24h === 0, warn: c.failedPayments24h > 0 },
    { label: "Unresolved client errors", value: c.unresolvedErrors, ok: c.unresolvedErrors === 0, warn: c.unresolvedErrors > 0 },
    { label: "Server errors (24h)", value: c.serverErrors24h, ok: c.serverErrors24h === 0, warn: c.serverErrors24h > 0 },
  ] : [];
  return (
    <Panel title="System health" actions={
      <Button size="sm" variant="outline" onClick={() => q.refetch()} className="rounded-full"><RefreshCw className="h-3 w-3" /></Button>
    }>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{i.label}</span>
              {i.warn ? <AlertCircle className="h-4 w-4 text-amber-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-slate-100">{i.value}</div>
          </div>
        ))}
      </div>
      {q.data && (
        <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-400 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">Wallets total: <span className="text-slate-100">${q.data.walletsTotalUsd.toFixed(2)}</span></div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">Maintenance mode: <span className="text-slate-100">{q.data.maintenanceMode ? "ON" : "off"}</span></div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">Generated: <span className="text-slate-100">{formatDistanceToNow(new Date(q.data.generatedAt), { addSuffix: true })}</span></div>
        </div>
      )}
    </Panel>
  );
}

function InspectorTab() {
  const peek = useServerFn(adminPeekTable);
  const [table, setTable] = useState<string>(safeTablesList[0]);
  const q = useQuery({
    queryKey: ["admin-peek", table],
    queryFn: () => peek({ data: { table, limit: 50 } }),
  });
  const rows = (q.data?.rows ?? []) as Array<Record<string, string | number | boolean | null>>;
  const cols = q.data?.columns ?? [];
  return (
    <Panel title="Database inspector" actions={
      <select className="rounded-md border border-white/10 bg-slate-900/50 px-3 py-1 text-xs text-slate-100"
        value={table} onChange={(e) => setTable(e.target.value)}>
        {safeTablesList.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    }>
      <p className="mb-2 text-xs text-slate-400">Read-only. Only safe columns are exposed.</p>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-xs">
          <thead className="bg-white/5 text-slate-400">
            <tr>{cols.map((c) => <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-white/5">
                {cols.map((c) => (
                  <td key={c} className="max-w-[240px] truncate px-3 py-2 font-mono text-[11px]">
                    {formatCell(r[c])}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-slate-500">No rows.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 40 ? v.slice(0, 40) + "…" : v;
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  return String(v);
}
