import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Package } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { AdminTableToolbar, toCsv, downloadCsv } from "@/components/admin/AdminTableToolbar";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { RowSkeleton, ErrorFallback } from "@/components/admin/Skeletons";
import { bulkUpdateListings, grantPromotion } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/listings")({ component: ListingsPage });

function ListingsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulkFn = useServerFn(bulkUpdateListings);
  const promoFn = useServerFn(grantPromotion);

  const listingsQ = useQuery({
    queryKey: ["admin-listings", statusFilter],
    queryFn: async () => {
      let qy = supabase.from("listings").select("id, title, status, view_count, created_at, user_id").order("created_at", { ascending: false }).limit(500);
      if (statusFilter !== "all") qy = qy.eq("status", statusFilter as "active" | "sold" | "removed" | "expired");
      const { data, error } = await qy;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const data = listingsQ.data;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(l => !needle || l.title.toLowerCase().includes(needle) || l.id.toLowerCase().includes(needle));
  }, [data, q]);

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
  const allChecked = filtered.length > 0 && filtered.every(l => selected.has(l.id));
  const toggleAll = () => setSelected(s => {
    if (allChecked) { const n = new Set(s); filtered.forEach(l => n.delete(l.id)); return n; }
    const n = new Set(s); filtered.forEach(l => n.add(l.id)); return n;
  });

  const stats = (data ?? []).reduce((acc, l) => { acc[l.status] = (acc[l.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  const exportCsv = () => {
    const rows = filtered.map(l => ({
      id: l.id, title: l.title, status: l.status, view_count: l.view_count,
      created_at: l.created_at, user_id: l.user_id,
    }));
    downloadCsv(`listings-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  return (
    <div>
      <AdminPageHeader title="Listings" subtitle={`${data?.length ?? 0} total · ${stats.active ?? 0} active · ${stats.sold ?? 0} sold · ${stats.removed ?? 0} removed`} />
      <AdminTableToolbar
        q={q}
        onQ={setQ}
        placeholder="Search title or id…"
        filters={[{
          value: statusFilter, onChange: setStatusFilter, label: "Status",
          options: [
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "sold", label: "Sold" },
            { value: "removed", label: "Removed" },
            { value: "expired", label: "Expired" },
          ],
        }]}
        total={filtered.length}
        onExportCsv={exportCsv}
      />

      <Panel>
        {filtered.length > 0 && (
          <label className="mb-2 flex cursor-pointer items-center gap-2 px-1 text-xs text-slate-400">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4" />
            Select all on page
          </label>
        )}
        <div className="space-y-2">
          {listingsQ.isLoading && <RowSkeleton rows={6} />}
          {listingsQ.isError && (
            <ErrorFallback
              message={(listingsQ.error as Error | undefined)?.message ?? "Could not load listings."}
              onRetry={() => listingsQ.refetch()}
            />
          )}
          {!listingsQ.isLoading && !listingsQ.isError && filtered.map(l => (
            <div key={l.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-white/20 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="mt-1 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words font-medium text-slate-100">{l.title}</span>
                    <Badge variant={l.status === "active" ? "default" : "secondary"} className="capitalize">{l.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-400">{l.view_count} views · {format(new Date(l.created_at), "MMM d")}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:shrink-0">
                <Button asChild size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"><a href={`/listings/${l.id}`} target="_blank" rel="noopener noreferrer">View</a></Button>
                <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => promo.mutate({ listingId: l.id, type: "bump" })}>Gift bump</Button>
                <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => promo.mutate({ listingId: l.id, type: "featured" })}>Gift featured</Button>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <EmptyState
              icon={Package}
              title={q || statusFilter !== "all" ? "No listings match" : "No listings yet"}
              description={q || statusFilter !== "all" ? "Try clearing filters." : "Listings posted by users will appear here."}
            />
          )}
        </div>
      </Panel>

      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: "Set active", onClick: () => bulk.mutate("active") },
          { label: "Set sold", onClick: () => bulk.mutate("sold") },
          { label: "Set removed", onClick: () => bulk.mutate("removed") },
          { label: "Set expired", onClick: () => bulk.mutate("expired") },
          { label: "Delete", variant: "destructive", onClick: () => { if (confirm(`Permanently delete ${selected.size} listings?`)) bulk.mutate("delete"); } },
        ]}
      />
    </div>
  );
}
