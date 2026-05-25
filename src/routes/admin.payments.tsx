import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const { data } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
  });

  const exportCsv = () => {
    const rows = data ?? [];
    const head = "date,amount,currency,type,provider,status,user_id,listing_id";
    const csv = [head, ...rows.map(p => [p.created_at, p.amount, p.currency, p.promotion_type ?? "", p.provider, p.status, p.user_id, p.listing_id ?? ""].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `payments-${Date.now()}.csv`; a.click();
  };

  return (
    <div>
      <AdminPageHeader title="Payments" subtitle={`${data?.length ?? 0} records`} actions={<Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={exportCsv}>Export CSV</Button>} />
      <Panel>
        <div className="space-y-2">
          {(data ?? []).map(p => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-100">{p.currency} {Number(p.amount).toFixed(2)}</span>
                  <Badge variant={p.status === "completed" ? "default" : "secondary"} className="capitalize">{p.status}</Badge>
                </div>
                <div className="text-xs text-slate-400">{format(new Date(p.created_at), "MMM d, HH:mm")} · {p.promotion_type ?? "—"} · via {p.provider}</div>
              </div>
            </div>
          ))}
          {!data?.length && <div className="py-10 text-center text-sm text-slate-400">No payments.</div>}
        </div>
      </Panel>
    </div>
  );
}
