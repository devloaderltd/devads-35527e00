import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AdminPageHeader, panelCls } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage });

function ReportsPage() {
  const qc = useQueryClient();
  const { data: reports } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data: rs } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
      if (!rs) return [];
      const ids = [...new Set(rs.map(r => r.listing_id))];
      const { data: listings } = ids.length ? await supabase.from("listings").select("id, title, status").in("id", ids) : { data: [] as { id: string; title: string; status: string }[] };
      return rs.map(r => ({ ...r, listing: listings?.find(l => l.id === r.listing_id) }));
    },
  });

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

  return (
    <div>
      <AdminPageHeader title="Reports" subtitle={`${reports?.length ?? 0} reports`} />
      <div className="space-y-3">
        {reports?.map(r => (
          <div key={r.id} className={panelCls + " p-4"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "open" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
                  <span className="text-sm font-medium text-slate-100">{r.reason}</span>
                </div>
                {r.listing ? <a href={`/listings/${r.listing.id}`} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-indigo-300 hover:underline">{r.listing.title}</a> : <span className="text-sm text-slate-400">Listing deleted</span>}
                {r.details && <p className="mt-2 max-w-xl whitespace-pre-wrap text-sm text-slate-400">{r.details}</p>}
                <div className="mt-1 text-xs text-slate-500">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
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
        {!reports?.length && <div className={panelCls + " p-10 text-center text-sm text-slate-400"}>No reports.</div>}
      </div>
    </div>
  );
}
