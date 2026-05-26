import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// Badge import removed — using StatusPill instead
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Flag } from "lucide-react";
import { AdminPageHeader, panelCls } from "@/components/admin/ui";
import { AdminTableToolbar, toCsv, downloadCsv } from "@/components/admin/AdminTableToolbar";
import { EmptyState } from "@/components/admin/EmptyState";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { RowSkeleton, ErrorFallback } from "@/components/admin/Skeletons";
import { StatusPill, toneForStatus } from "@/components/admin/StatusPill";

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage });

function ReportsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: reports, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data: rs, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      if (!rs) return [];
      const ids = [...new Set(rs.map(r => r.listing_id).filter((x): x is string => !!x))];
      const { data: listings } = ids.length ? await supabase.from("listings").select("id, title, status").in("id", ids) : { data: [] as { id: string; title: string; status: string }[] };
      return rs.map(r => ({ ...r, listing: r.listing_id ? listings?.find(l => l.id === r.listing_id) : null }));
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (reports ?? []).filter(r => {
      if (status !== "all" && r.status !== status) return false;
      if (!needle) return true;
      return [r.reason, r.details, r.listing?.title].filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
    });
  }, [reports, q, status]);

  const resolve = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "resolved" | "dismissed" }) => {
      const { error } = await supabase.from("reports").update({ status }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-reports"] }); },
  });

  const removeListing = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Listing removed"); qc.invalidateQueries({ queryKey: ["admin-reports"] }); },
  });

  const bulk = useMutation({
    mutationFn: async (v: { ids: string[]; action: "resolve" | "dismiss" | "remove_listing" }) => {
      let failed = 0;
      const targets = filtered.filter((r) => v.ids.includes(r.id));
      if (v.action === "resolve" || v.action === "dismiss") {
        const newStatus = v.action === "resolve" ? "resolved" : "dismissed";
        const results = await Promise.allSettled(
          targets.filter((r) => r.status === "open").map((r) =>
            supabase.from("reports").update({ status: newStatus }).eq("id", r.id),
          ),
        );
        failed = results.filter((r) => r.status === "rejected").length;
      } else {
        const listingIds = [...new Set(
          targets.map((r) => r.listing?.id).filter((id): id is string => !!id && (targets.find((t) => t.listing?.id === id)?.listing?.status !== "removed")),
        )];
        const results = await Promise.allSettled(
          listingIds.map((id) => supabase.from("listings").update({ status: "removed" }).eq("id", id)),
        );
        failed = results.filter((r) => r.status === "rejected").length;
      }
      return { total: v.ids.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      if (failed) toast.warning(`${total - failed}/${total} updated, ${failed} failed`);
      else toast.success(`${total} updated`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    const rows = filtered.map(r => ({
      id: r.id, status: r.status, reason: r.reason, details: r.details ?? "",
      listing_id: r.listing_id ?? "", listing_title: r.listing?.title ?? "", created_at: r.created_at,
    }));
    downloadCsv(`reports-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected((s) => {
      if (allChecked) { const n = new Set(s); filtered.forEach((r) => n.delete(r.id)); return n; }
      const n = new Set(s); filtered.forEach((r) => n.add(r.id)); return n;
    });
  const openSelected = filtered.filter((r) => selected.has(r.id) && r.status === "open");

  return (
    <div>
      <AdminPageHeader title="Reports" subtitle={`${filtered.length} of ${reports?.length ?? 0}`} />
      <AdminTableToolbar
        q={q}
        onQ={setQ}
        placeholder="Search reason, details, listing…"
        filters={[{
          value: status, onChange: (v) => { setStatus(v); setSelected(new Set()); }, label: "Status",
          options: [
            { value: "all", label: "All statuses" },
            { value: "open", label: "Open" },
            { value: "resolved", label: "Resolved" },
            { value: "dismissed", label: "Dismissed" },
          ],
        }]}
        total={filtered.length}
        onExportCsv={exportCsv}
      />

      {isLoading && <RowSkeleton rows={6} />}
      {isError && !isLoading && (
        <ErrorFallback
          title="Reports failed to load"
          message={(error as Error | undefined)?.message}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <label className="mb-3 ml-1 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4" />
          Select all on page
        </label>
      )}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className={panelCls + " p-4 transition-all hover:ring-1 hover:ring-white/15"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="mt-1 h-4 w-4 shrink-0"
                    aria-label="Select report"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={toneForStatus(r.status)}>{r.status}</StatusPill>
                      <span className="text-sm font-medium text-slate-100">{r.reason}</span>
                    </div>
                    {r.listing ? (
                      <a href={`/listings/${r.listing.id}`} target="_blank" rel="noopener noreferrer" className="mt-1 block break-words text-sm text-indigo-300 hover:underline">{r.listing.title}</a>
                    ) : (
                      <span className="text-sm text-slate-400">Listing deleted</span>
                    )}
                    {r.details && <p className="mt-2 max-w-xl whitespace-pre-wrap text-sm text-slate-400">{r.details}</p>}
                    <div className="mt-1 text-xs text-slate-500">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.listing && r.listing.status !== "removed" && <Button size="sm" variant="destructive" className="rounded-full" onClick={() => removeListing.mutate(r.listing!.id)}>Remove listing</Button>}
                  {r.status === "open" && <>
                    <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => resolve.mutate({ id: r.id, status: "dismissed" })}>Dismiss</Button>
                    <Button size="sm" className="rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white" onClick={() => resolve.mutate({ id: r.id, status: "resolved" })}>Resolve</Button>
                  </>}
                </div>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <EmptyState
              icon={Flag}
              title={q || status !== "all" ? "No reports match" : "No reports yet"}
              description={q || status !== "all" ? "Try clearing filters." : "User reports will land here when they come in."}
            />
          )}
        </div>
      )}

      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          {
            label: `Resolve ${openSelected.length} open`,
            onClick: () => {
              if (!openSelected.length) { toast.error("No open reports selected"); return; }
              bulk.mutate({ ids: openSelected.map((r) => r.id), action: "resolve" });
            },
          },
          {
            label: `Dismiss ${openSelected.length} open`,
            onClick: () => {
              if (!openSelected.length) { toast.error("No open reports selected"); return; }
              bulk.mutate({ ids: openSelected.map((r) => r.id), action: "dismiss" });
            },
          },
          {
            label: "Remove listings",
            variant: "destructive",
            onClick: () => {
              const ids = [...selected];
              if (!ids.length) return;
              if (confirm(`Remove listings for ${ids.length} selected report(s)?`))
                bulk.mutate({ ids, action: "remove_listing" });
            },
          },
        ]}
      />

    </div>
  );
}
