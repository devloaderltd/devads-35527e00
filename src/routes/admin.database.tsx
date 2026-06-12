import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Database, Download, Upload, AlertTriangle, FileSearch, X } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { exportDatabase, importDatabase, inspectBackup } from "@/lib/db-backup.functions";

export const Route = createFileRoute("/admin/database")({ component: DatabasePage });

type Inspection = Awaited<ReturnType<typeof inspectBackup>>;

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
  const [result, setResult] = useState<{ log: string[]; errors: string[] } | null>(null);

  const exportMut = useMutation({
    mutationFn: async () => {
      const res = await exportFn();
      const blob = new Blob([res.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `db-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { tableCount: res.tableCount, userCount: res.userCount };
    },
    onSuccess: (r) => toast.success(`Exported ${r.tableCount} tables and ${r.userCount} users`),
    onError: (e: Error) => toast.error(e.message),
  });

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
      setSelectedTables(new Set(info.tables.map((t) => t.name)));
      setResult(null);
      if (info.migrated) {
        toast.success(`Validated. Migrated v${info.migratedFrom} → v${info.version}`);
      } else {
        toast.success(`Validated backup v${info.version}`);
      }
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
      setResult({ log: r.log, errors: r.errors });
      if (r.ok) toast.success("Database restored");
      else toast.error(`Restored with ${r.errors.length} errors`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function clearPending() {
    setPendingText(null);
    setInspection(null);
    setSelectedTables(new Set());
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

  return (
    <div>
      <AdminPageHeader title="Database" subtitle="Export, validate, and restore JSON backups with schema migration" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Export backup" actions={<Database className="h-4 w-4 text-slate-400" />}>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Downloads a JSON file containing every row of every public table plus auth user
              metadata. Passwords are not exported — restored users must reset their password.
              Current schema version: <span className="font-mono text-slate-200">v2</span>.
            </p>
            <Button
              className="w-full rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500"
              disabled={exportMut.isPending}
              onClick={() => exportMut.mutate()}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportMut.isPending ? "Exporting…" : "Download backup (.json)"}
            </Button>
          </div>
        </Panel>

        <Panel title="Validate &amp; restore" actions={<AlertTriangle className="h-4 w-4 text-amber-400" />}>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Backups are validated against a strict schema before anything runs. Older versions
              (v0, v1) are migrated automatically to v2; unknown or malformed files are rejected.
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
              {inspectMut.isPending ? "Validating…" : "Choose &amp; validate backup file"}
            </Button>
          </div>
        </Panel>
      </div>

      {inspection && pendingText && (
        <Panel
          title={`Backup ready — v${inspection.version}${inspection.migrated ? ` (migrated from v${inspection.migratedFrom})` : ""}`}
          className="mt-4"
          actions={
            <button type="button" onClick={clearPending} className="text-slate-400 hover:text-slate-100">
              <X className="h-4 w-4" />
            </button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 sm:grid-cols-4">
              <Stat label="Exported" value={new Date(inspection.exportedAt).toLocaleString()} />
              <Stat label="Source" value={inspection.source ?? "—"} />
              <Stat label="Tables" value={String(inspection.tableCount)} />
              <Stat label="Total rows" value={inspection.totalRows.toLocaleString()} />
              <Stat label="Auth users" value={String(inspection.authUserCount)} />
              <Stat label="Selected tables" value={`${selectedTables.size} / ${inspection.tableCount}`} />
            </div>

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
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <div className="text-xs font-semibold text-slate-300">Tables to restore</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAllTables(true)}>All</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAllTables(false)}>None</Button>
                </div>
              </div>
              <div className="max-h-64 overflow-auto p-2">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {inspection.tables.map((t) => (
                    <label key={t.name} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-white/5">
                      <span className="flex items-center gap-2 truncate">
                        <Checkbox
                          checked={selectedTables.has(t.name)}
                          onCheckedChange={() => toggleTable(t.name)}
                        />
                        <span className="truncate font-mono">{t.name}</span>
                      </span>
                      <span className="shrink-0 text-slate-500">{t.rows}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full rounded-full"
              disabled={importMut.isPending || selectedTables.size === 0}
              onClick={() => {
                const msg = wipeFirst
                  ? `WIPE ${includeAuthUsers ? "all data + auth users" : "all public data"} and restore ${selectedTables.size} table(s)?`
                  : `Merge ${selectedTables.size} table(s) into the current database?`;
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
        <Panel title="Restore result" className="mt-4">
          <div className="space-y-2">
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
