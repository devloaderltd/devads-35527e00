import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus, ExternalLink, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { getWallet, createTopupInvoice } from "@/lib/wallet.functions";
import { supabase } from "@/integrations/supabase/client";
import { PanelShell } from "@/components/PanelShell";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — CallEscort24" }, { name: "robots", content: "noindex" }] }),
  component: WalletPage,
});

const PRESETS = [10, 25, 50, 100];

function WalletPage() {
  const fetchWallet = useServerFn(getWallet);
  const topupFn = useServerFn(createTopupInvoice);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => fetchWallet(),
    refetchInterval: 15000,
  });

  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState("");
  const [creating, setCreating] = useState(false);

  // Realtime updates on wallet + topups
  useEffect(() => {
    const ch = supabase
      .channel("wallet-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, () => {
        qc.invalidateQueries({ queryKey: ["wallet"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_topups" }, () => {
        qc.invalidateQueries({ queryKey: ["wallet"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  // Toast on success return
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("topup") === "success") {
      toast.success("Payment received — crediting your wallet shortly…");
      window.history.replaceState({}, "", "/wallet");
    } else if (sp.get("topup") === "cancel") {
      toast.info("Top-up canceled.");
      window.history.replaceState({}, "", "/wallet");
    }
  }, []);

  const handleTopup = async () => {
    const value = custom ? Number(custom) : amount;
    if (!value || value < 5) {
      toast.error("Minimum top-up is $5");
      return;
    }
    setCreating(true);
    try {
      const res = await topupFn({ data: { amountUsd: value, origin: window.location.origin } });
      window.open(res.invoiceUrl, "_blank", "noopener,noreferrer");
      toast.success("Invoice opened in new tab. Complete the payment to credit your wallet.");
      qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  const balance = data?.balance ?? 0;

  return (
    <PanelShell
      title="Wallet"
      highlight="& top-ups"
      subtitle="Top up with crypto, spend credits to promote your listings."
    >

      {/* Balance card */}
      <div className="iridescent-border mt-6 rounded-3xl border border-white/50 bg-white/70 p-6 shadow-[var(--shadow-float-lg)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl btn-gradient text-white">
            <Wallet className="h-6 w-6" />
          </span>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Available balance</div>
            <div className="font-display text-4xl font-extrabold gradient-text">
              ${isLoading ? "—" : balance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Top up */}
      <div className="mt-6 rounded-3xl border border-white/50 bg-white/60 p-6 backdrop-blur-xl">
        <h2 className="font-display text-lg font-semibold">Top up with crypto</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pay with USDT, BTC, ETH, or 300+ supported coins via NOWPayments.</p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => { setAmount(v); setCustom(""); }}
              className={`rounded-2xl border p-3 text-center font-semibold transition ${
                amount === v && !custom ? "border-primary bg-primary/10" : "border-white/50 bg-white/60 hover:bg-white"
              }`}
            >
              ${v}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <Input
            type="number"
            min={5}
            step={1}
            placeholder="Custom amount (USD)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="rounded-full bg-white/70"
          />
          <Button onClick={handleTopup} disabled={creating} className="btn-gradient rounded-full border-0 gap-1">
            <Plus className="h-4 w-4" /> {creating ? "Creating…" : "Top up"}
          </Button>
        </div>
      </div>

      {/* Pending top-ups */}
      {data && data.topups.length > 0 && (
        <div className="mt-6 rounded-3xl border border-white/50 bg-white/60 p-6 backdrop-blur-xl">
          <h2 className="font-display text-lg font-semibold">Recent top-ups</h2>
          <div className="mt-3 divide-y divide-white/40">
            {data.topups.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-semibold">${Number(t.price_amount_usd).toFixed(2)} {t.pay_currency ? <span className="text-muted-foreground">· {t.pay_currency.toUpperCase()}</span> : null}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={t.status} credited={t.credited} />
                  {t.invoice_url && !t.credited && (
                    <a href={t.invoice_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="mt-6 rounded-3xl border border-white/50 bg-white/60 p-6 backdrop-blur-xl">
        <h2 className="font-display text-lg font-semibold">Transaction history</h2>
        {!data || data.transactions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-white/40">
            {data.transactions.map((t: any) => {
              const positive = Number(t.amount_usd) > 0;
              return (
                <div key={t.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-2">
                    {positive ? (
                      <ArrowDownCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ArrowUpCircle className="h-5 w-5 text-orange-500" />
                    )}
                    <div>
                      <div className="font-medium">{t.description ?? t.type}</div>
                      <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={`font-semibold ${positive ? "text-emerald-600" : "text-orange-600"}`}>
                    {positive ? "+" : ""}${Number(t.amount_usd).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status, credited }: { status: string; credited: boolean }) {
  const label = credited ? "credited" : status;
  const color =
    credited || status === "finished"
      ? "bg-emerald-100 text-emerald-700"
      : status === "failed" || status === "expired"
      ? "bg-rose-100 text-rose-700"
      : "bg-amber-100 text-amber-700";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{label}</span>;
}
