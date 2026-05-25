import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { bulkUpdateListings, grantPromotion } from "@/lib/admin.functions";
import { downloadCSV, toCSV } from "@/lib/csv";
import { Download } from "lucide-react";

export const Route = createFileRoute("/admin/listings")({ component: ListingsPage });

function ListingsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulkFn = useServerFn(bulkUpdateListings);
  const promoFn = useServerFn(grantPromotion);

  const { data } = useQuery({
    queryKey: ["admin-listings", statusFilter],
    queryFn: async () => {
      let qy = supabase.from("listings").select("id, title, status, view_count, created_at, user_id").order("created_at", { ascending: false }).limit(200);
      if (statusFilter !== "all") qy = qy.eq("status", statusFilter as "active" | "sold" | "removed" | "expired");
      const { data } = await qy;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter(l => !q || l.title.toLowerCase().includes(q.toLowerCase()));

  const bulk = useMutation({
    mutationFn: (action: "active" | "sold" | "removed" | "expired" | "delete") => bulkFn({ data: { ids: [...selected], action } }),
    onSuccess: () => { toast.success("Updated"); setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin-listings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const promo = useMutation({
    mutationFn: (v: { listingId: string; type: "featured" | "bump" }) => promoFn({ data: v }),
    onSuccess: () => { toast.success("Promotion granted"); qc.invalidateQueries({ queryKey: ["admin-listings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const stats = (data ?? []).reduce((acc, l) => { acc[l.status] = (acc[l.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div>
      <AdminPageHeader title="Listings" subtitle={`${data?.length ?? 0} total · ${stats.active ?? 0} active · ${stats.sold ?? 0} sold · ${stats.removed ?? 0} removed`} />
      <div className="mb-3 flex flex-wrap gap-2">
        {["all", "active", "sold", "removed", "expired"].map(s => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="rounded-full capitalize" onClick={() => setStatusFilter(s)}>{s}</Button>
        ))}
        <Input placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto w-full max-w-xs rounded-full border-white/10 bg-white/5 text-slate-100" />
        <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => downloadCSV(`listings-${new Date().toISOString().slice(0,10)}`, toCSV(filtered))}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
          <span className="text-sm text-slate-200">{selected.size} selected</span>
          {(["active", "sold", "removed", "expired"] as const).map(a => (
            <Button key={a} size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 capitalize" onClick={() => bulk.mutate(a)}>Set {a}</Button>
          ))}
          <Button size="sm" variant="destructive" className="rounded-full" onClick={() => { if (confirm(`Permanently delete ${selected.size} listings?`)) bulk.mutate("delete"); }}>Delete</Button>
        </div>
      )}

      <Panel>
        <div className="space-y-2">
          {filtered.map(l => (
            <div key={l.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="mt-1 h-4 w-4" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-100">{l.title}</span>
                  <Badge variant={l.status === "active" ? "default" : "secondary"} className="capitalize">{l.status}</Badge>
                </div>
                <div className="text-xs text-slate-400">{l.view_count} views · {format(new Date(l.created_at), "MMM d")}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button asChild size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"><a href={`/listings/${l.id}`} target="_blank" rel="noopener noreferrer">View</a></Button>
                <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => promo.mutate({ listingId: l.id, type: "bump" })}>Gift bump</Button>
                <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => promo.mutate({ listingId: l.id, type: "featured" })}>Gift featured</Button>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="py-10 text-center text-sm text-slate-400">No listings.</div>}
        </div>
      </Panel>
    </div>
  );
}
