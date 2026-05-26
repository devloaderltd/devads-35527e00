import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle } from "lucide-react";
import { getSiteSettings, updateSiteSettings, runDemoSeed } from "@/lib/admin.functions";
import { SeedDemoButton } from "@/components/admin/SeedDemoButton";

export const Route = createFileRoute("/admin/maintenance")({ component: MaintenancePage });

function MaintenancePage() {
  const get = useServerFn(getSiteSettings);
  const update = useServerFn(updateSiteSettings);
  const seed = useServerFn(runDemoSeed);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: () => get() });
  const s = q.data?.settings;

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (s) { setEnabled(!!s.maintenance_mode); setMessage(s.maintenance_message || ""); }
  }, [s]);

  const saveMut = useMutation({
    mutationFn: () => update({ data: { maintenance_mode: enabled, maintenance_message: message } }),
    onSuccess: () => { toast.success("Maintenance settings saved"); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reseedMut = useMutation({
    mutationFn: () => seed(),
    onSuccess: () => toast.success("Demo data refreshed"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Maintenance" subtitle="Take the site offline for non-admin users and run system actions" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Maintenance mode" actions={enabled ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : null}>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
              <div>
                <div className="text-sm font-medium text-slate-100">Enable maintenance mode</div>
                <p className="text-xs text-slate-400">Only admins can access the site while this is on.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Message shown to visitors</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="border-white/10 bg-slate-900/50 text-slate-100 placeholder:text-slate-500" />
            </div>
            <Button className="w-full rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </Panel>
        <Panel title="System actions">
          <div className="space-y-3">
            <Action title="Refresh demo data" description="Re-runs the seed script. Useful in staging.">
              <SeedDemoButton />
            </Action>
            <Action title="Re-seed via server" description="Equivalent action, runs as the current admin.">
              <Button size="sm" variant="outline" disabled={reseedMut.isPending} onClick={() => { if (confirm("Re-seed demo data?")) reseedMut.mutate(); }}>
                {reseedMut.isPending ? "Running…" : "Run seed"}
              </Button>
            </Action>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Action({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-100">{title}</div>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
