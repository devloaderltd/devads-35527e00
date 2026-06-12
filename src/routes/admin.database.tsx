import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Database, Download, Upload, AlertTriangle } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { exportDatabase, importDatabase } from "@/lib/db-backup.functions";

export const Route = createFileRoute("/admin/database")({ component: DatabasePage });

function DatabasePage() {
  const exportFn = useServerFn(exportDatabase);
  const importFn = useServerFn(importDatabase);
  const fileRef = useRef<HTMLInputElement>(null);
  const [wipeFirst, setWipeFirst] = useState(true);
  const [result, setResult] = useState<{ log: string[]; errors: string[] } | null>(null);

  const exportMut = useMutation({
    mutationFn: async () => {
      const payload = await exportFn();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `db-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const tableCount = Object.keys(payload.tables ?? {}).length;
      const userCount = (payload.auth_users ?? []).length;
      return { tableCount, userCount };
    },
    onSuccess: (r) => toast.success(`Exported ${r.tableCount} tables and ${r.userCount} users`),
    onError: (e: Error) => toast.error(e.message),
  });

  const importMut = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload?.tables) throw new Error("Invalid backup file: missing 'tables' field");
      return importFn({ data: { payload, wipeFirst } });
    },
    onSuccess: (r) => {
      setResult({ log: r.log, errors: r.errors });
      if (r.ok) toast.success("Database restored");
      else toast.error(`Restored with ${r.errors.length} errors`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Database" subtitle="Export a full backup or restore from a backup file" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Export backup" actions={<Database className="h-4 w-4 text-slate-400" />}>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Downloads a JSON file containing every row of every public table plus auth user
              metadata. Passwords are not exported — restored users must reset their password.
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

        <Panel title="Restore backup" actions={<AlertTriangle className="h-4 w-4 text-amber-400" />}>
          <div className="space-y-3">
            <p className="text-xs text-rose-300">
              Destructive: when “Wipe before restore” is on, all rows in the public schema and all
              auth users are deleted before importing.
            </p>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
              <div>
                <Label className="text-sm font-medium text-slate-100">Wipe before restore</Label>
                <p className="text-xs text-slate-400">Recommended for a clean restore.</p>
              </div>
              <Switch checked={wipeFirst} onCheckedChange={setWipeFirst} />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!confirm(wipeFirst
                  ? "This will WIPE the current database and restore from the file. Continue?"
                  : "Restore (merge) data from this file into the current database?")) {
                  e.target.value = "";
                  return;
                }
                setResult(null);
                importMut.mutate(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="destructive"
              className="w-full rounded-full"
              disabled={importMut.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importMut.isPending ? "Restoring…" : "Choose backup file and restore"}
            </Button>
          </div>
        </Panel>
      </div>

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
