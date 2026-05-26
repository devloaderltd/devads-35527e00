import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { RowSkeleton, ErrorFallback } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { Wallet as WalletIcon } from "lucide-react";
import { listWalletsAdmin, adminAdjustWallet } from "@/lib/admin.functions";
import { useState } from "react";

export const Route = createFileRoute("/admin/wallets")({ component: WalletsPage });

function WalletsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const listFn = useServerFn(listWalletsAdmin);
  const adjustFn = useServerFn(adminAdjustWallet);
  const walletsQ = useQuery({ queryKey: ["admin-wallets"], queryFn: () => listFn() });

  const adjust = useMutation({
    mutationFn: (v: { userId: string; amount: number; description: string }) => adjustFn({ data: v }),
    onSuccess: () => { toast.success("Wallet adjusted"); qc.invalidateQueries({ queryKey: ["admin-wallets"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const wallets = (walletsQ.data?.wallets ?? []).filter(w => !q || w.display_name.toLowerCase().includes(q.toLowerCase()));
  const total = (walletsQ.data?.wallets ?? []).reduce((s, w) => s + w.balance_usd, 0);

  return (
    <div>
      <AdminPageHeader title="Wallets" subtitle={`${wallets.length} wallets · $${total.toFixed(2)} total balance`} />
      <div className="mb-3 flex">
        <Input placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto w-full max-w-xs rounded-full border-white/10 bg-white/5 text-slate-100" />
      </div>
      <Panel>
        <div className="space-y-2">
          {wallets.map(w => (
            <div key={w.user_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-100">{w.display_name}</div>
                <div className="text-xs text-slate-400">${w.balance_usd.toFixed(2)} · updated {format(new Date(w.updated_at), "MMM d, HH:mm")}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20" onClick={() => {
                  const a = Number(prompt("Credit amount ($)") ?? "0"); const d = prompt("Reason / note") ?? "Manual credit";
                  if (a > 0) adjust.mutate({ userId: w.user_id, amount: a, description: d });
                }}>Credit</Button>
                <Button size="sm" variant="outline" className="rounded-full border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20" onClick={() => {
                  const a = Number(prompt("Debit amount ($)") ?? "0"); const d = prompt("Reason / note") ?? "Manual debit";
                  if (a > 0) adjust.mutate({ userId: w.user_id, amount: -a, description: d });
                }}>Debit</Button>
              </div>
            </div>
          ))}
          {!wallets.length && <div className="py-10 text-center text-sm text-slate-400">No wallets.</div>}
        </div>
      </Panel>
    </div>
  );
}
