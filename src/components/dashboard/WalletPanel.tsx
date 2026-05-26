import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUpRight, ArrowDownRight, Plus } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export function WalletPanel({ userId }: { userId: string | undefined }) {
  const { data } = useQuery({
    queryKey: ["wallet-panel", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: w }, { data: txs }] = await Promise.all([
        supabase.from("wallets").select("balance_usd").eq("user_id", userId!).maybeSingle(),
        supabase
          .from("wallet_transactions")
          .select("id, type, amount_usd, balance_after, description, reference, created_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      return { balance: Number(w?.balance_usd ?? 0), transactions: txs ?? [] };
    },
  });

  const series = useMemo(() => {
    const days: { date: string; spend: number; topup: number }[] = [];
    const txs = data?.transactions ?? [];
    for (let i = 29; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const key = format(d, "MMM d");
      const dayTxs = txs.filter((t) => startOfDay(new Date(t.created_at)).getTime() === d.getTime());
      days.push({
        date: key,
        spend: Math.abs(dayTxs.filter((t) => t.type === "spend").reduce((s, t) => s + Number(t.amount_usd), 0)),
        topup: dayTxs.filter((t) => t.type === "topup").reduce((s, t) => s + Number(t.amount_usd), 0),
      });
    }
    return days;
  }, [data]);

  const totalSpend = series.reduce((s, d) => s + d.spend, 0);
  const totalTopup = series.reduce((s, d) => s + d.topup, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-primary to-purple-500 text-white shadow-[var(--shadow-float-lg,0_20px_60px_-15px_rgba(124,92,255,0.5))]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/80">
              <Wallet className="h-4 w-4" /> Balance
            </div>
            <div className="mt-2 font-display text-4xl font-bold">${data?.balance.toFixed(2) ?? "0.00"}</div>
            <Button asChild variant="secondary" className="mt-4 rounded-full bg-white/95 text-primary hover:bg-white">
              <Link to="/wallet"><Plus className="mr-1 h-4 w-4" /> Top up</Link>
            </Button>
          </CardContent>
        </Card>
        <KpiTile label="Spent (30d)" value={`$${totalSpend.toFixed(2)}`} icon={<ArrowDownRight className="h-4 w-4 text-rose-500" />} />
        <KpiTile label="Topped up (30d)" value={`$${totalTopup.toFixed(2)}`} icon={<ArrowUpRight className="h-4 w-4 text-emerald-500" />} />
      </div>

      <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
        <CardHeader className="pb-2"><CardTitle className="text-base">Wallet activity (30 days)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="topup" stroke="#22c55e" fill="url(#gt)" strokeWidth={2} />
              <Area type="monotone" dataKey="spend" stroke="#ef4444" fill="url(#gs)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                  <th className="px-4 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {(data?.transactions ?? []).slice(0, 10).map((t) => (
                  <tr key={t.id} className="border-t border-border/40">
                    <td className="px-4 py-2">
                      <Badge variant={t.type === "topup" ? "default" : t.type === "spend" ? "secondary" : "outline"} className="capitalize">{t.type}</Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{t.description ?? t.reference ?? "—"}</td>
                    <td className={`px-4 py-2 text-right font-medium ${Number(t.amount_usd) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {Number(t.amount_usd) >= 0 ? "+" : ""}${Number(t.amount_usd).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">${Number(t.balance_after).toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{format(new Date(t.created_at), "MMM d, HH:mm")}</td>
                  </tr>
                ))}
                {(data?.transactions ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No transactions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          {icon} {label}
        </div>
        <div className="mt-2 font-display text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
