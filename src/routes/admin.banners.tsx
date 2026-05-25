import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { listBanners, upsertBanner, deleteBanner } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/banners")({ component: BannersPage });

type Banner = {
  id: string;
  message: string;
  variant: string;
  cta_label: string | null;
  cta_url: string | null;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
};

const empty = { message: "", variant: "info" as const, cta_label: "", cta_url: "", ends_at: "", active: true };

function BannersPage() {
  const list = useServerFn(listBanners);
  const upsert = useServerFn(upsertBanner);
  const remove = useServerFn(deleteBanner);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-banners"], queryFn: () => list() });
  const [form, setForm] = useState<typeof empty & { id?: string }>(empty);

  const saveMut = useMutation({
    mutationFn: async () => upsert({ data: {
      id: form.id,
      message: form.message,
      variant: form.variant as "info" | "success" | "warning" | "danger",
      cta_label: form.cta_label || null,
      cta_url: form.cta_url || null,
      ends_at: form.ends_at || null,
      active: form.active,
    } }),
    onSuccess: () => { toast.success("Banner saved"); setForm(empty); qc.invalidateQueries({ queryKey: ["admin-banners"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Banner deleted"); qc.invalidateQueries({ queryKey: ["admin-banners"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Site banners" subtitle="Show announcements at the top of every page" />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Active banners">
          <div className="space-y-2">
            {(q.data?.banners ?? []).map((b: Banner) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <Badge className="capitalize" variant={b.active ? "default" : "secondary"}>{b.variant}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-100">{b.message}</div>
                  <div className="text-xs text-slate-500">
                    {b.active ? "Active" : "Inactive"} · {new Date(b.starts_at).toLocaleDateString()}
                    {b.ends_at && ` → ${new Date(b.ends_at).toLocaleDateString()}`}
                    {b.cta_label && ` · CTA: ${b.cta_label}`}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-100" onClick={() => setForm({
                  id: b.id, message: b.message, variant: b.variant as typeof empty.variant, cta_label: b.cta_label ?? "", cta_url: b.cta_url ?? "",
                  ends_at: b.ends_at ? b.ends_at.slice(0, 16) : "", active: b.active,
                })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => { if (confirm("Delete this banner?")) deleteMut.mutate(b.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!q.data?.banners.length && <div className="py-8 text-center text-sm text-slate-400">No banners yet.</div>}
          </div>
        </Panel>
        <Panel title={form.id ? "Edit banner" : "New banner"} actions={form.id ? <Button size="sm" variant="ghost" onClick={() => setForm(empty)}>Cancel</Button> : <Plus className="h-4 w-4 text-slate-400" />}>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-400">Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={500} rows={3} className="bg-slate-900/50" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Variant</Label>
              <select className="mt-1 w-full rounded-md border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-100" value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value as typeof empty.variant })}>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="danger">Danger</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-slate-400">CTA label</Label>
                <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} maxLength={60} className="bg-slate-900/50" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">CTA URL</Label>
                <Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} maxLength={500} className="bg-slate-900/50" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Ends at (optional)</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="bg-slate-900/50" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-slate-200">Active</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
            <Button className="w-full rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500" disabled={!form.message || saveMut.isPending} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? "Saving…" : form.id ? "Update banner" : "Create banner"}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
