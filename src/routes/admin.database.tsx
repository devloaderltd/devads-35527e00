import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Database, Download, Upload, AlertTriangle, FileSearch, X, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { exportDatabase, importDatabase, inspectBackup } from "@/lib/db-backup.functions";

export const Route = createFileRoute("/admin/database")({ component: DatabasePage });

type Inspection = Awaited<ReturnType<typeof inspectBackup>>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `~${ms} ms`;
  if (ms < 60_000) return `~${(ms / 1000).toFixed(1)} s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `~${mins}m ${secs}s`;


function makeFilename(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `db-backup-${ts}.json`;
}

function DatabasePage() {
  const exportFn = useServerFn(exportDatabase);
  const importFn = useServerFn(importDatabase);
  const inspectFn = useServerFn(inspectBackup);
  const fileRef = useRef<HTMLInputElement>(null);

  const [wipeFirst, setWipeFirst] = useState(true);
  const [includeAuthUsers, setIncludeAuthUsers] = useState(true);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<Awaited<ReturnType<typeof importDatabase>> | null>(null);

  // Prepared export held in memory so we can show size + filename before download.
  const [prepared, setPrepared] = useState<{
    json: string;
    filename: string;
    size: number;
    tableCount: number;
    userCount: number;
    generatedAt: string;
  } | null>(null);

  const prepareMut = useMutation({
    mutationFn: async () => {
      const res = await exportFn();
      return {
        json: res.json,
        filename: makeFilename(),
        size: new Blob([res.json]).size,
        tableCount: res.tableCount,
        userCount: res.userCount,
        generatedAt: new Date().toISOString(),
      };
    },
    onSuccess: (p) => {
      setPrepared(p);
      toast.success(`Backup ready: ${formatBytes(p.size)}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function downloadPrepared() {
    if (!prepared) return;
    const blob = new Blob([prepared.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = prepared.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${prepared.filename}`);
  }

  const inspectMut = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      try { JSON.parse(text); } catch { throw new Error("Selected file is not valid JSON"); }
      const info = await inspectFn({ data: { payloadJson: text } });
      return { text, info };
    },
    onSuccess: ({ text, info }) => {
      setPendingText(text);
      setInspection(info);
      // Pre-select only tables that would change.
      setSelectedTables(new Set(info.tables.filter((t) => t.changed).map((t) => t.name)));
      setResult(null);
      if (info.migrated) toast.success(`Validated. Migrated v${info.migratedFrom} → v${info.version}`);
      else toast.success(`Validated backup v${info.version}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMut = useMutation({
    mutationFn: async () => {
      if (!pendingText || !inspection) throw new Error("No validated backup loaded");
      const onlyTables = selectedTables.size === inspection.tables.length
        ? undefined
        : Array.from(selectedTables);
      return importFn({ data: { payloadJson: pendingText, wipeFirst, includeAuthUsers, onlyTables } });
    },
    onSuccess: (r) => {
      setResult(r);
      if (r.ok) toast.success("Database restored");
      else toast.error(`Restored with ${r.errors.length} errors`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function clearPending() {
    setPendingText(null); setInspection(null); setSelectedTables(new Set());
    if (fileRef.current) fileRef.current.value = "";
  }
  function toggleTable(name: string) {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }
  function setAllTables(checked: boolean) {
    if (!inspection) return;
    setSelectedTables(checked ? new Set(inspection.tables.map((t) => t.name)) : new Set());
  }
  function selectChangedOnly() {
    if (!inspection) return;
    setSelectedTables(new Set(inspection.tables.filter((t) => t.changed).map((t) => t.name)));
  }

  const sortedTables = useMemo(() => {
    if (!inspection) return [];
    // Changed tables first, then alphabetical.
    return [...inspection.tables].sort((a, b) => {
      if (a.changed !== b.changed) return a.changed ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [inspection]);

  // Estimated impact across the selected tables (recomputes as the admin toggles).
  const impact = useMemo(() => {
    if (!inspection) return null;
    const selected = inspection.tables.filter((t) => selectedTables.has(t.name));
    let rowsIn = 0, netDelta = 0, growing = 0, shrinking = 0, unchanged = 0, newTables = 0;
    for (const t of selected) {
      rowsIn += t.rows;
      if (t.existing == null || t.existing === 0) newTables++;
      const d = t.delta ?? t.rows;
      netDelta += d;
      if (d > 0) growing++;
      else if (d < 0) shrinking++;
      else unchanged++;
    }
    // Heuristic: ~1500 rows/sec upsert throughput + 120ms per-table overhead.
    // Wipe ≈ 2.5s. Auth user create ≈ 180ms each (when included).
    const ROWS_PER_SEC = 1500;
    const PER_TABLE_MS = 120;
    const WIPE_MS = wipeFirst ? 2500 : 0;
    const AUTH_MS = includeAuthUsers ? inspection.authUserCount * 180 : 0;
    const dataMs = Math.ceil((rowsIn / ROWS_PER_SEC) * 1000) + selected.length * PER_TABLE_MS;
    const totalMs = WIPE_MS + AUTH_MS + dataMs;
    return {
      tableCount: selected.length,
      rowsIn,
      netDelta,
      growing,
      shrinking,
      unchanged,
      newTables,
      etaMs: totalMs,
    };
  }, [inspection, selectedTables, wipeFirst, includeAuthUsers]);


  return (
    <div>
      <AdminPageHeader title="Database" subtitle="Export, validate, and restore JSON backups with schema migration and audit logging" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Export backup" actions={<Database className="h-4 w-4 text-slate-400" />}>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Generates a JSON snapshot of every public table plus auth user metadata. Passwords
              are not exported — restored users must reset their password.
              Current schema version: <span className="font-mono text-slate-200">v2</span>.
            </p>
            <Button
              variant="secondary"
              className="w-full rounded-full"
              disabled={prepareMut.isPending}
              onClick={() => prepareMut.mutate()}
            >
              <Database className="mr-2 h-4 w-4" />
              {prepareMut.isPending ? "Generating…" : prepared ? "Regenerate backup" : "Generate backup"}
            </Button>

            {prepared && (
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <Stat label="File size" value={formatBytes(prepared.size)} />
                  <Stat label="Generated" value={new Date(prepared.generatedAt).toLocaleTimeString()} />
                  <Stat label="Tables" value={String(prepared.tableCount)} />
                  <Stat label="Auth users" value={String(prepared.userCount)} />
                </div>
                <div className="truncate rounded-lg bg-slate-900/70 px-2 py-1 font-mono text-[11px] text-slate-300">
                  {prepared.filename}
                </div>
                <Button
                  className="w-full rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                  onClick={downloadPrepared}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download ({formatBytes(prepared.size)})
                </Button>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Validate &amp; restore" actions={<AlertTriangle className="h-4 w-4 text-amber-400" />}>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Backups are validated against a strict schema and older versions are migrated to v2.
              The dry-run shows current vs imported row counts so you can spot changes before
              committing. Every import is recorded to the admin audit log.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                inspectMut.mutate(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              className="w-full rounded-full"
              disabled={inspectMut.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <FileSearch className="mr-2 h-4 w-4" />
              {inspectMut.isPending ? "Validating…" : "Choose & validate backup file"}
            </Button>
          </div>
        </Panel>
      </div>

      {inspection && pendingText && (
        <Panel
          className="mt-4"
          title={`Backup ready — v${inspection.version}${inspection.migrated ? ` (migrated from v${inspection.migratedFrom})` : ""}`}
          actions={
            <button type="button" onClick={clearPending} className="text-slate-400 hover:text-slate-100">
              <X className="h-4 w-4" />
            </button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Exported" value={new Date(inspection.exportedAt).toLocaleString()} />
              <Stat label="Source" value={inspection.source ?? "—"} />
              <Stat label="Tables" value={String(inspection.tableCount)} />
              <Stat label="Total rows" value={inspection.totalRows.toLocaleString()} />
              <Stat label="Auth users" value={String(inspection.authUserCount)} />
              <Stat label="Will change" value={`${inspection.changedTableCount} tables`} />
            </div>

            {inspection.missingFromBackup.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <div className="font-semibold">
                  {inspection.missingFromBackup.length} live table(s) are NOT in this backup
                </div>
                <div className="mt-1 font-mono text-[11px] opacity-80">
                  {inspection.missingFromBackup.join(", ")}
                </div>
                <div className="mt-1 opacity-80">
                  If “Wipe before restore” is on, those tables will be emptied.
                </div>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div>
                  <Label className="text-sm font-medium text-slate-100">Wipe before restore</Label>
                  <p className="text-xs text-slate-400">Truncate public schema first.</p>
                </div>
                <Switch checked={wipeFirst} onCheckedChange={setWipeFirst} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div>
                  <Label className="text-sm font-medium text-slate-100">Include auth users</Label>
                  <p className="text-xs text-slate-400">Off to keep existing accounts.</p>
                </div>
                <Switch checked={includeAuthUsers} onCheckedChange={setIncludeAuthUsers} />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/40">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                <div className="text-xs font-semibold text-slate-300">
                  Per-table diff ({selectedTables.size}/{inspection.tableCount} selected)
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAllTables(true)}>All</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAllTables(false)}>None</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={selectChangedOnly}>Changed</Button>
                </div>
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Table</th>
                      <th className="px-3 py-2 text-right font-medium">Current</th>
                      <th className="px-3 py-2 text-right font-medium">In backup</th>
                      <th className="px-3 py-2 text-right font-medium">Δ</th>
                      <th className="px-3 py-2 text-right font-medium">Restore</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {sortedTables.map((t) => {
                      const selected = selectedTables.has(t.name);
                      return (
                        <tr
                          key={t.name}
                          className={`border-t border-white/5 ${t.changed ? "bg-amber-500/5" : ""}`}
                        >
                          <td className="px-3 py-1.5 font-mono">{t.name}</td>
                          <td className="px-3 py-1.5 text-right">
                            {t.existing == null ? <span className="text-slate-500">n/a</span> : t.existing.toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right">{t.rows.toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right">
                            <DeltaCell delta={t.delta} />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Checkbox checked={selected} onCheckedChange={() => toggleTable(t.name)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {impact && (
              <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-indigo-200">Estimated impact</div>
                  <div className="text-[10px] uppercase tracking-wider text-indigo-300/70">
                    confirm before running
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <Stat label="Tables to restore" value={`${impact.tableCount}/${inspection.tableCount}`} />
                  <Stat label="Rows imported" value={impact.rowsIn.toLocaleString()} />
                  <Stat
                    label="Net row delta"
                    value={(impact.netDelta > 0 ? "+" : "") + impact.netDelta.toLocaleString()}
                  />
                  <Stat label="Estimated duration" value={formatDuration(impact.etaMs)} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {impact.growing > 0 && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                      ↑ {impact.growing} growing
                    </span>
                  )}
                  {impact.shrinking > 0 && (
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-300">
                      ↓ {impact.shrinking} shrinking
                    </span>
                  )}
                  {impact.unchanged > 0 && (
                    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-slate-300">
                      = {impact.unchanged} unchanged
                    </span>
                  )}
                  {impact.newTables > 0 && (
                    <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-indigo-200">
                      + {impact.newTables} new/empty
                    </span>
                  )}
                  {wipeFirst && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">
                      wipe first (+~2.5s)
                    </span>
                  )}
                  {includeAuthUsers && inspection.authUserCount > 0 && (
                    <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-fuchsia-200">
                      {inspection.authUserCount} auth users
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Duration is an estimate based on ~1.5k rows/sec throughput. Large blobs or
                  network latency can extend it.
                </p>
              </div>
            )}

            <Button

              variant="destructive"
              className="w-full rounded-full"
              disabled={importMut.isPending || selectedTables.size === 0}
              onClick={() => {
                const msg = wipeFirst
                  ? `WIPE ${includeAuthUsers ? "all data + auth users" : "all public data"} and restore ${selectedTables.size} table(s)? This will be recorded in the admin audit log.`
                  : `Merge ${selectedTables.size} table(s) into the current database? This will be recorded in the admin audit log.`;
                if (confirm(msg)) {
                  setResult(null);
                  importMut.mutate();
                }
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importMut.isPending ? "Restoring…" : "Run restore"}
            </Button>
          </div>
        </Panel>
      )}

      {result && (
        <Panel title={`Restore result — ${result.ok ? "OK" : "completed with errors"} (${result.durationMs} ms)`} className="mt-4">
          <div className="space-y-3">
            {result.tableOutcomes.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-slate-900/40">
                <div className="border-b border-white/10 px-3 py-2 text-xs font-semibold text-slate-300">
                  Per-table outcomes
                </div>
                <div className="max-h-60 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Table</th>
                        <th className="px-3 py-2 text-right font-medium">Inserted</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                        <th className="px-3 py-2 text-right font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {result.tableOutcomes.map((t) => (
                        <tr key={t.name} className={`border-t border-white/5 ${t.errors > 0 ? "bg-rose-500/5" : ""}`}>
                          <td className="px-3 py-1 font-mono">{t.name}</td>
                          <td className="px-3 py-1 text-right">{t.inserted}</td>
                          <td className="px-3 py-1 text-right">{t.total}</td>
                          <td className="px-3 py-1 text-right">{t.errors > 0 ? <span className="text-rose-300">{t.errors}</span> : 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {result.errors.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-rose-300">Errors ({result.errors.length})</div>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-slate-900/70 p-2 text-[11px] text-rose-200">
{result.errors.join("\n")}
                </pre>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-slate-300">Log</div>
              <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-900/70 p-2 text-[11px] text-slate-300">
{result.log.join("\n")}
              </pre>
            </div>
            <p className="text-[11px] text-slate-500">
              A detailed entry has been written to the admin audit log (action
              <span className="font-mono"> db.import.completed</span>).
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="truncate text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-slate-500">—</span>;
  if (delta === 0) return <span className="inline-flex items-center gap-1 text-slate-500"><Minus className="h-3 w-3" />0</span>;
  if (delta > 0) return <span className="inline-flex items-center gap-1 text-emerald-300"><ArrowUp className="h-3 w-3" />+{delta.toLocaleString()}</span>;
  return <span className="inline-flex items-center gap-1 text-rose-300"><ArrowDown className="h-3 w-3" />{delta.toLocaleString()}</span>;
}
