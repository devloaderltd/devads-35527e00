import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreditCard } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { AdminTableToolbar, toCsv, downloadCsv } from "@/components/admin/AdminTableToolbar";
import { EmptyState } from "@/components/admin/EmptyState";
import { RowSkeleton, ErrorFallback } from "@/components/admin/Skeletons";

export const Route = createFileRoute("/admin/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const paymentsQ = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const data = paymentsQ.data;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(p => {
      if (status !== "all" && p.status !== status) return false;
      if (type !== "all" && (p.promotion_type ?? "") !== type) return false;
      if (!needle) return true;
      return [p.id, p.user_id, p.listing_id, p.provider, p.provider_session_id]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
    });
  }, [data, q, status, type]);

  const totalUsd = useMemo(
    () => filtered.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount || 0), 0),
    [filtered]
  );

  const exportCsv = () => {
    const rows = filtered.map(p => ({
      id: p.id, created_at: p.created_at, amount: p.amount, currency: p.currency,
      type: p.promotion_type ?? "", provider: p.provider, status: p.status,
      user_id: p.user_id, listing_id: p.listing_id ?? "",
    }));
    downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  return (
    <div>
      <AdminPageHeader
        title="Payments"
        subtitle={`${filtered.length} of ${data?.length ?? 0} · $${totalUsd.toFixed(2)} completed`}
      />
      <AdminTableToolbar
        q={q}
        onQ={setQ}
        placeholder="Search id, user, listing, session…"
        filters={[
          {
            value: status, onChange: setStatus, label: "Status",
            options: [
              { value: "all", label: "All statuses" },
              { value: "completed", label: "Completed" },
              { value: "pending", label: "Pending" },
              { value: "failed", label: "Failed" },
              { value: "refunded", label: "Refunded" },
            ],
          },
          {
            value: type, onChange: setType, label: "Type",
            options: [
              { value: "all", label: "All types" },
              { value: "bump", label: "Bump" },
              { value: "featured", label: "Featured" },
              { value: "topup", label: "Top-up" },
            ],
          },
        ]}
        total={filtered.length}
        onExportCsv={exportCsv}
      />
      <Panel>
        <div className="space-y-2">
          {paymentsQ.isLoading && <RowSkeleton rows={6} />}
          {paymentsQ.isError && (
            <ErrorFallback
              title="Couldn't load payments"
              message={(paymentsQ.error as Error | undefined)?.message}
              onRetry={() => paymentsQ.refetch()}
              isRetrying={paymentsQ.isFetching}
            />
          )}
          {!paymentsQ.isLoading && !paymentsQ.isError && filtered.map(p => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-100">{p.currency} {Number(p.amount).toFixed(2)}</span>
                  <Badge variant={p.status === "completed" ? "default" : "secondary"} className="capitalize">{p.status}</Badge>
                  {p.promotion_type && <Badge variant="outline" className="capitalize border-white/20 text-slate-300">{p.promotion_type}</Badge>}
                </div>
                <div className="text-xs text-slate-400">{format(new Date(p.created_at), "MMM d, HH:mm")} · via {p.provider} · user {p.user_id.slice(0, 8)}</div>
              </div>
            </div>
          ))}
          {!paymentsQ.isLoading && !paymentsQ.isError && !filtered.length && (
            <EmptyState
              icon={CreditCard}
              title={q || status !== "all" || type !== "all" ? "No payments match" : "No payments yet"}
              description={q || status !== "all" || type !== "all" ? "Try clearing filters." : "Completed and pending payments will land here."}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
