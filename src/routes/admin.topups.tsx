import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wallet } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { AdminTableToolbar, toCsv, downloadCsv } from "@/components/admin/AdminTableToolbar";
import { EmptyState } from "@/components/admin/EmptyState";
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

  const [text, setText] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return topups.filter(t => {
      if (status === "credited" && !t.credited) return false;
      if (status === "uncredited" && t.credited) return false;
      if (status !== "all" && status !== "credited" && status !== "uncredited" && t.status !== status) return false;
      if (!needle) return true;
      return [t.id, t.user_id, t.pay_currency, t.status].filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
    });
  }, [topups, text, status]);

  const exportCsv = () => {
    const rows = filtered.map(t => ({
      id: t.id, user_id: t.user_id, amount_usd: t.price_amount_usd, currency: t.pay_currency ?? "",
      status: t.status, credited: t.credited, created_at: t.created_at,
    }));
    downloadCsv(`topups-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  return (
    <div>
      <AdminPageHeader title="Crypto top-ups" subtitle={`${filtered.length} of ${topups.length}`} />
      <AdminTableToolbar
        q={text}
        onQ={setText}
        placeholder="Search id, user, currency…"
        filters={[{
          value: status, onChange: setStatus, label: "Status",
          options: [
            { value: "all", label: "All" },
            { value: "finished", label: "Finished" },
            { value: "pending", label: "Pending" },
            { value: "failed", label: "Failed" },
            { value: "credited", label: "Credited" },
            { value: "uncredited", label: "Not credited" },
          ],
        }]}
        total={filtered.length}
        onExportCsv={exportCsv}
      />
      <Panel>
        <div className="space-y-2">
          {filtered.map(t => (
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
          {!filtered.length && (
            <EmptyState
              icon={Wallet}
              title={text || status !== "all" ? "No top-ups match" : "No top-ups yet"}
              description={text || status !== "all" ? "Try clearing filters." : "Crypto top-ups will appear once users fund their wallets."}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
