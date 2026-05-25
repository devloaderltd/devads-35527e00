import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { getSiteSettings, updateSiteSettings } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSiteSettings);
  const updateFn = useServerFn(updateSiteSettings);
  const { data } = useQuery({ queryKey: ["site-settings"], queryFn: () => getFn() });
  const s = data?.settings;

  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  useEffect(() => {
    if (s) setForm({
      featured_price_usd: Number(s.featured_price_usd),
      bump_price_usd: Number(s.bump_price_usd),
      featured_days: s.featured_days, bump_days: s.bump_days,
      maintenance_mode: s.maintenance_mode, maintenance_message: s.maintenance_message,
      site_name: s.site_name, support_email: s.support_email,
    });
  }, [s]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: form as Parameters<typeof updateFn>[0]["data"] }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <AdminPageHeader title="Site settings" actions={<Button onClick={() => save.mutate()} className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white">Save changes</Button>} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Branding">
          <div className="space-y-3">
            <div><Label className="text-slate-300">Site name</Label><Input value={String(form.site_name ?? "")} onChange={(e) => set("site_name", e.target.value)} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" /></div>
            <div><Label className="text-slate-300">Support email</Label><Input type="email" value={String(form.support_email ?? "")} onChange={(e) => set("support_email", e.target.value)} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" /></div>
          </div>
        </Panel>
        <Panel title="Promotion pricing">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-slate-300">Featured price (USD)</Label><Input type="number" step="0.01" value={Number(form.featured_price_usd ?? 0)} onChange={(e) => set("featured_price_usd", Number(e.target.value))} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" /></div>
            <div><Label className="text-slate-300">Featured days</Label><Input type="number" value={Number(form.featured_days ?? 7)} onChange={(e) => set("featured_days", Number(e.target.value))} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" /></div>
            <div><Label className="text-slate-300">Bump price (USD)</Label><Input type="number" step="0.01" value={Number(form.bump_price_usd ?? 0)} onChange={(e) => set("bump_price_usd", Number(e.target.value))} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" /></div>
            <div><Label className="text-slate-300">Bump cooldown days</Label><Input type="number" value={Number(form.bump_days ?? 1)} onChange={(e) => set("bump_days", Number(e.target.value))} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" /></div>
          </div>
        </Panel>
        <Panel title="Maintenance mode">
          <div className="flex items-center gap-3"><Switch checked={!!form.maintenance_mode} onCheckedChange={(v) => set("maintenance_mode", v)} /><Label className="text-slate-300">Show maintenance banner</Label></div>
          <Textarea value={String(form.maintenance_message ?? "")} onChange={(e) => set("maintenance_message", e.target.value)} className="mt-3 rounded-lg border-white/10 bg-white/5 text-slate-100" rows={3} />
        </Panel>
      </div>
    </div>
  );
}
