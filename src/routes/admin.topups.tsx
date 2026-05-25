import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { listTopupsAdmin, retryTopupCredit } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/topups")({ component: TopupsPage });

function TopupsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTopupsAdmin);
  const retryFn = useServerFn(retryTopupCredit);
  const q = useQuery({ queryKey: ["admin-topups"], queryFn: () => listFn() });
  const retry = useMutation({
    mutationFn: (id: string) => retryFn({ data: { topupId: id } }),
    onSuccess: () => { toast.success("Credited"); qc.invalidateQueries({ queryKey: ["admin-topups"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const topups = q.data?.topups ?? [];

  return (
    <div>
      <AdminPageHeader title="Crypto top-ups" subtitle={`${topups.length} records`} />
      <Panel>
        <div className="space-y-2">
          {topups.map(t => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-100">${Number(t.price_amount_usd).toFixed(2)}</span>
                  <Badge variant={t.status === "finished" ? "default" : "secondary"} className="capitalize">{t.status}</Badge>
                  {t.credited && <Badge variant="secondary">Credited</Badge>}
                </div>
                <div className="text-xs text-slate-400">{format(new Date(t.created_at), "MMM d, HH:mm")} · {t.pay_currency ?? "—"} · user {t.user_id.slice(0, 8)}</div>
              </div>
              <div className="flex gap-2">
                {t.invoice_url && <Button asChild size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"><a href={t.invoice_url} target="_blank" rel="noopener noreferrer">Invoice</a></Button>}
                {t.status === "finished" && !t.credited && (
                  <Button size="sm" className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white" onClick={() => retry.mutate(t.id)}>Retry credit</Button>
                )}
              </div>
            </div>
          ))}
          {!topups.length && <div className="py-10 text-center text-sm text-slate-400">No top-ups.</div>}
        </div>
      </Panel>
    </div>
  );
}
