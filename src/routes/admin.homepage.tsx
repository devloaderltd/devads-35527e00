import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import {
  listHomepageSlots, upsertHomepageSlot, deleteHomepageSlot,
  listSiteBanners, upsertSiteBanner, deleteSiteBanner,
} from "@/lib/extras.functions";

export const Route = createFileRoute("/admin/homepage")({ component: HomepagePage });

type Slot = { id?: string; position: "hero" | "featured" | "banner"; listing_id?: string | null; image_url?: string | null; title?: string | null; subtitle?: string | null; cta_label?: string | null; cta_url?: string | null; sort_order?: number; active?: boolean };
type Banner = { id?: string; message: string; cta_label?: string | null; cta_url?: string | null; variant?: "info" | "success" | "warning" | "promo"; active?: boolean; starts_at?: string; ends_at?: string | null };

function HomepagePage() {
  const qc = useQueryClient();
  const slotsFn = useServerFn(listHomepageSlots);
  const upSlot = useServerFn(upsertHomepageSlot);
  const delSlot = useServerFn(deleteHomepageSlot);
  const banFn = useServerFn(listSiteBanners);
  const upBan = useServerFn(upsertSiteBanner);
  const delBan = useServerFn(deleteSiteBanner);

  const slotsQ = useQuery({ queryKey: ["hp-slots"], queryFn: () => slotsFn() });
  const bansQ = useQuery({ queryKey: ["hp-banners"], queryFn: () => banFn() });

  const slotM = useMutation({ mutationFn: (s: Slot) => upSlot({ data: s }), onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["hp-slots"] }); }, onError: (e: Error) => toast.error(e.message) });
  const slotD = useMutation({ mutationFn: (id: string) => delSlot({ data: { id } }), onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["hp-slots"] }); } });
  const banM = useMutation({ mutationFn: (b: Banner) => upBan({ data: b }), onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["hp-banners"] }); }, onError: (e: Error) => toast.error(e.message) });
  const banD = useMutation({ mutationFn: (id: string) => delBan({ data: { id } }), onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["hp-banners"] }); } });

  return (
    <div>
      <AdminPageHeader title="Homepage & banners" subtitle="Curate hero, featured spots, and site-wide banners" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Homepage slots" actions={
          <Button size="sm" className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white" onClick={() => slotM.mutate({ position: "featured", active: true, title: "New slot" })}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New slot
          </Button>
        }>
          <div className="space-y-3">
            {(slotsQ.data?.slots ?? []).map((s) => <SlotRow key={s.id} slot={s as Slot} onSave={(v) => slotM.mutate({ ...v, id: s.id })} onDelete={() => slotD.mutate(s.id!)} />)}
            {!slotsQ.data?.slots.length && <div className="py-6 text-center text-sm text-slate-400">No slots yet.</div>}
          </div>
        </Panel>

        <Panel title="Site banners" actions={
          <Button size="sm" className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white" onClick={() => banM.mutate({ message: "New announcement", variant: "info", active: true })}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New banner
          </Button>
        }>
          <div className="space-y-3">
            {(bansQ.data?.banners ?? []).map((b) => <BannerRow key={b.id} banner={b as Banner} onSave={(v) => banM.mutate({ ...v, id: b.id })} onDelete={() => banD.mutate(b.id!)} />)}
            {!bansQ.data?.banners.length && <div className="py-6 text-center text-sm text-slate-400">No banners.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SlotRow({ slot, onSave, onDelete }: { slot: Slot; onSave: (s: Slot) => void; onDelete: () => void }) {
  const [s, setS] = useState<Slot>(slot);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant="outline" className="border-white/20 text-slate-200">{s.position}</Badge>
        <div className="flex items-center gap-2">
          <Switch checked={!!s.active} onCheckedChange={(v) => setS({ ...s, active: v })} />
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-red-400" /></Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={s.position} onValueChange={(v) => setS({ ...s, position: v as Slot["position"] })}>
          <SelectTrigger className="bg-white/5 text-slate-100"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="hero">Hero</SelectItem><SelectItem value="featured">Featured</SelectItem><SelectItem value="banner">Banner</SelectItem></SelectContent>
        </Select>
        <Input placeholder="Sort order" type="number" value={s.sort_order ?? 0} onChange={(e) => setS({ ...s, sort_order: Number(e.target.value) })} className="bg-white/5 text-slate-100" />
        <Input placeholder="Title" value={s.title ?? ""} onChange={(e) => setS({ ...s, title: e.target.value })} className="bg-white/5 text-slate-100 sm:col-span-2" />
        <Input placeholder="Subtitle" value={s.subtitle ?? ""} onChange={(e) => setS({ ...s, subtitle: e.target.value })} className="bg-white/5 text-slate-100 sm:col-span-2" />
        <Input placeholder="Image URL" value={s.image_url ?? ""} onChange={(e) => setS({ ...s, image_url: e.target.value })} className="bg-white/5 text-slate-100" />
        <Input placeholder="Listing UUID (optional)" value={s.listing_id ?? ""} onChange={(e) => setS({ ...s, listing_id: e.target.value || null })} className="bg-white/5 text-slate-100" />
        <Input placeholder="CTA label" value={s.cta_label ?? ""} onChange={(e) => setS({ ...s, cta_label: e.target.value })} className="bg-white/5 text-slate-100" />
        <Input placeholder="CTA URL" value={s.cta_url ?? ""} onChange={(e) => setS({ ...s, cta_url: e.target.value })} className="bg-white/5 text-slate-100" />
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" className="rounded-full" onClick={() => onSave(s)}>Save</Button>
      </div>
    </div>
  );
}

function BannerRow({ banner, onSave, onDelete }: { banner: Banner; onSave: (b: Banner) => void; onDelete: () => void }) {
  const [b, setB] = useState<Banner>(banner);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant="outline" className="border-white/20 text-slate-200 capitalize">{b.variant ?? "info"}</Badge>
        <div className="flex items-center gap-2">
          <Switch checked={!!b.active} onCheckedChange={(v) => setB({ ...b, active: v })} />
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-red-400" /></Button>
        </div>
      </div>
      <Textarea value={b.message} onChange={(e) => setB({ ...b, message: e.target.value })} maxLength={280} rows={2} className="bg-white/5 text-slate-100" />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Input placeholder="CTA label" value={b.cta_label ?? ""} onChange={(e) => setB({ ...b, cta_label: e.target.value })} className="bg-white/5 text-slate-100" />
        <Input placeholder="CTA URL" value={b.cta_url ?? ""} onChange={(e) => setB({ ...b, cta_url: e.target.value })} className="bg-white/5 text-slate-100" />
        <Select value={b.variant ?? "info"} onValueChange={(v) => setB({ ...b, variant: v as Banner["variant"] })}>
          <SelectTrigger className="bg-white/5 text-slate-100"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info</SelectItem><SelectItem value="success">Success</SelectItem>
            <SelectItem value="warning">Warning</SelectItem><SelectItem value="promo">Promo</SelectItem>
          </SelectContent>
        </Select>
        <div>
          <Label className="text-xs text-slate-400">Ends at (ISO)</Label>
          <Input placeholder="2026-12-31T00:00:00Z" value={b.ends_at ?? ""} onChange={(e) => setB({ ...b, ends_at: e.target.value || null })} className="bg-white/5 text-slate-100" />
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" className="rounded-full" onClick={() => onSave(b)}>Save</Button>
      </div>
    </div>
  );
}
